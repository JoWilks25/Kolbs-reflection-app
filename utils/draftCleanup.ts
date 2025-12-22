/**
 * Draft Cleanup Utility
 * 
 * Handles cleanup of orphaned reflection drafts from AsyncStorage.
 * Removes drafts for sessions that are deleted, completed, or stale.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../db/migrations';

/**
 * Clean up orphaned reflection drafts from AsyncStorage
 * 
 * Removes drafts for:
 * - Sessions that don't exist in the database
 * - Sessions marked as deleted (is_deleted = 1)
 * - Sessions that already have completed reflections
 * - Sessions that ended more than 48 hours ago
 * 
 * @returns Promise<number> Number of drafts cleaned up
 */
export async function cleanupOrphanedDrafts(): Promise<number> {
  try {
    const db = getDatabase();
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(key => key.startsWith('reflection_draft_'));
    
    if (draftKeys.length === 0) {
      console.log('📝 No reflection drafts found in storage');
      return 0;
    }

    console.log(`📝 Found ${draftKeys.length} reflection draft(s), checking for orphans...`);

    const now = Date.now();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const key of draftKeys) {
      const sessionId = key.replace('reflection_draft_', '');
      
      // Check if session exists and its status
      const session = await db.getFirstAsync<{
        id: string;
        ended_at: number | null;
        has_reflection: number;
      }>(
        `SELECT s.id, s.ended_at,
                CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_reflection
         FROM sessions s
         LEFT JOIN reflections r ON r.session_id = s.id
         WHERE s.id = ? AND s.is_deleted = 0`,
        [sessionId]
      );

      // Determine if draft should be removed
      let shouldRemove = false;
      let reason = '';

      if (!session) {
        shouldRemove = true;
        reason = 'session not found or deleted';
      } else if (session.has_reflection === 1) {
        shouldRemove = true;
        reason = 'reflection already completed';
      } else if (session.ended_at && (now - session.ended_at) > fortyEightHoursMs) {
        shouldRemove = true;
        reason = 'session ended >48 hours ago';
      }

      if (shouldRemove) {
        await AsyncStorage.removeItem(key);
        cleanedCount++;
        console.log(`  ✓ Removed draft for session ${sessionId.substring(0, 8)}... (${reason})`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} orphaned reflection draft(s)`);
    } else {
      console.log('✅ No orphaned drafts found, storage is clean');
    }

    return cleanedCount;
  } catch (error) {
    console.error('❌ Error cleaning up drafts:', error);
    // Non-blocking - don't throw, just log and return 0
    return 0;
  }
}

