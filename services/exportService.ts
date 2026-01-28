/**
 * Export Service for Kolb's Reflection Cycle App
 * 
 * Handles JSON export of all Practice Areas, Sessions, and Reflections
 * with computed metadata (actual duration, target met, edit status).
 * Exposes data via iOS share sheet.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { getExportData } from '../db/queries';
import type {
  ExportPayload,
  ExportPracticeArea,
  ExportSession,
  ExportReflection,
} from '../utils/types';

/**
 * Main export function - builds JSON and opens share sheet
 * 
 * Process:
 * 1. Query all practice areas with sessions and reflections
 * 2. Compute derived fields (actualdurationseconds, mettarget, isedited)
 * 3. Build JSON payload with proper field naming
 * 4. Write to file with timestamp
 * 5. Open iOS share sheet
 * 
 * @throws Error if export fails (caught and shown to user via toast)
 */
export async function exportData(): Promise<void> {
  try {
    console.log('Starting data export...');

    // Step 1: Query all data from database
    const rawData = await getExportData();
    console.log(`Loaded ${rawData.length} practice areas for export`);

    // Step 2: Transform data and compute derived fields
    let totalSessions = 0;
    let totalReflections = 0;

    const practiceAreas: ExportPracticeArea[] = rawData.map((pa) => {
      const sessions: ExportSession[] = pa.sessions.map((session: any) => {
        totalSessions += 1;

        // Compute actualdurationseconds
        const actualdurationseconds =
          session.ended_at !== null
            ? Math.floor((session.ended_at - session.started_at) / 1000)
            : null;

        // Compute mettarget
        const mettarget =
          session.target_duration_seconds !== null && actualdurationseconds !== null
            ? actualdurationseconds >= session.target_duration_seconds
            : null;

        // Build reflection object if it exists
        let reflection: ExportReflection | null = null;
        if (session.coaching_tone !== null && session.coaching_tone !== undefined) {
          totalReflections += 1;

          // Compute isedited
          const isedited =
            session.updated_at !== null &&
            session.completed_at !== null &&
            session.updated_at !== session.completed_at;

          // Map coaching tone number to name
          const coachingToneNames: Record<number, string> = {
            1: 'Facilitative',
            2: 'Socratic',
            3: 'Supportive',
          };

          reflection = {
            coaching_tone: session.coaching_tone,
            coaching_tone_name: coachingToneNames[session.coaching_tone] || 'Unknown',
            ai_assisted: session.ai_assisted === 1,
            ai_questions_shown: session.ai_questions_shown || 0,
            ai_followups_shown: session.ai_followups_shown || 0,
            ai_followups_answered: session.ai_followups_answered || 0,
            step2_question: session.step2_question || null,
            step3_question: session.step3_question || null,
            step4_question: session.step4_question || null,
            what_happened: session.step2_answer,
            lessons_learned: session.step3_answer,
            next_actions: session.step4_answer,
            feedback_rating: session.feedback_rating,
            feedback_rating_label: session.feedback_rating !== null
              ? ['Confusing', 'Hard', 'Neutral', 'Good', 'Great'][session.feedback_rating] || null
              : null,
            feedback_note: session.feedback_note,
            completed_at: session.completed_at,
            updated_at: session.updated_at,
            is_edited: isedited,
          };
        }

        // Build session object with proper field names
        return {
          id: session.id,
          previous_session_id: session.previous_session_id,
          intent: session.intent,
          started_at: session.started_at,
          ended_at: session.ended_at,
          target_duration_seconds: session.target_duration_seconds,
          actual_duration_seconds: actualdurationseconds,
          met_target: mettarget,
          reflection,
        };
      });

      // Build practice area object with proper field names
      const typeLabels: Record<string, string> = {
        solo_skill: 'Solo Skill',
        performance: 'Performance',
        interpersonal: 'Interpersonal',
        creative: 'Creative',
      };

      return {
        id: pa.id,
        name: pa.name,
        type: pa.type,
        type_label: typeLabels[pa.type] || pa.type,
        created_at: pa.created_at,
        sessions,
      };
    });

    // Step 3: Build final payload matching ExportPayload schema
    const totalPracticeAreas = practiceAreas.length;

    const payload: ExportPayload = {
      metadata: {
        export_date: new Date().toISOString(),
        app_version: '1.0',
        total_practice_areas: totalPracticeAreas,
        total_sessions: totalSessions,
        total_reflections: totalReflections,
      },
      practice_areas: practiceAreas,
    };

    console.log('Export payload built successfully');

    // Step 4: Write to file
    const timestamp = Date.now();
    const fileName = `kolbs-export-${timestamp}.json`;
    const file = new FileSystem.File(FileSystem.Paths.document, fileName);

    file.write(JSON.stringify(payload, null, 2), {
      encoding: 'utf8',
    });

    const fileUri = file.uri;
    console.log(`Export file written to: ${fileUri}`);

    // Step 5: Open share sheet
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Kolbs Reflection Data',
      UTI: 'public.json',
    });

    console.log('Share sheet opened successfully');

    // Show success toast
    Toast.show({
      type: 'success',
      text1: 'Export Complete',
      text2: 'Your data has been prepared for sharing',
      position: 'bottom',
      visibilityTime: 3000,
    });
  } catch (error) {
    console.error('Export failed:', error);

    // Show error toast
    Toast.show({
      type: 'error',
      text1: 'Export Failed',
      text2: error instanceof Error ? error.message : 'An unknown error occurred',
      position: 'bottom',
      visibilityTime: 4000,
    });

    throw error;
  }
}

