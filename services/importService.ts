/**
 * Import Service for Kolb's Reflection Cycle App
 * 
 * Handles JSON import of Practice Areas, Sessions, and Reflections
 * with atomic transaction handling and schema validation.
 * Complements the exportService for data persistence across builds.
 */

import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import Toast from 'react-native-toast-message';
import { getDatabase } from '../db/migrations';
import type { ExportPayload, ExportPracticeArea, ExportSession, ExportReflection } from '../utils/types';

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean;
  practiceAreasCount: number;
  sessionsCount: number;
  reflectionsCount: number;
}

/**
 * Main import function - reads JSON file and restores data to database
 * 
 * Process:
 * 1. Read and parse JSON file
 * 2. Validate schema
 * 3. Begin atomic transaction
 * 4. Clear existing data
 * 5. Insert practice areas, sessions, and reflections
 * 6. Commit transaction
 * 
 * @param fileUri - URI of the JSON file to import
 * @returns ImportResult with counts of imported entities
 * @throws Error if import fails (caught and shown to user via toast)
 */
export async function importJsonData(fileUri: string): Promise<ImportResult> {
  try {
    console.log('Starting data import from:', fileUri);

    // Step 1: Read file contents using legacy API (new File API doesn't have read method)
    const fileContents = await FileSystemLegacy.readAsStringAsync(fileUri, {
      encoding: FileSystemLegacy.EncodingType.UTF8,
    });
    console.log('File read successfully, size:', fileContents.length, 'bytes');

    // Step 2: Parse JSON
    let data: any;
    try {
      data = JSON.parse(fileContents);
    } catch (parseError) {
      throw new Error('Invalid JSON file. Please select a valid export file.');
    }

    // Step 3: Validate schema (v2-only ExportPayload)
    const payload = validateImportPayload(data);
    console.log(`Validated payload with ${payload.practice_areas.length} practice areas`);

    // Step 4: Get database and begin transaction
    const db = getDatabase();

    let practiceAreasCount = 0;
    let sessionsCount = 0;
    let reflectionsCount = 0;

    try {
      await db.execAsync('BEGIN TRANSACTION');
      console.log('Transaction started');

      // Step 5: Clear existing data
      await clearDatabase(db);
      console.log('Existing data cleared');

      // Step 6: Insert practice areas, sessions, and reflections
      for (const practiceArea of payload.practice_areas) {
        await insertPracticeArea(db, practiceArea);
        practiceAreasCount++;

        for (const session of practiceArea.sessions) {
          await insertSession(db, session, practiceArea.id);
          sessionsCount++;

          if (session.reflection) {
            await insertReflection(db, session.reflection, session.id);
            reflectionsCount++;
          }
        }
      }

      // Step 7: Commit transaction
      await db.execAsync('COMMIT');
      console.log('Transaction committed successfully');

      console.log(`Import complete: ${practiceAreasCount} practice areas, ${sessionsCount} sessions, ${reflectionsCount} reflections`);

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Import Complete',
        text2: `Restored ${practiceAreasCount} practice area${practiceAreasCount === 1 ? '' : 's'} with ${sessionsCount} session${sessionsCount === 1 ? '' : 's'}`,
        position: 'bottom',
        visibilityTime: 3000,
      });

      return {
        success: true,
        practiceAreasCount,
        sessionsCount,
        reflectionsCount,
      };
    } catch (dbError) {
      // Rollback on any database error
      await db.execAsync('ROLLBACK');
      console.error('Database error, transaction rolled back:', dbError);
      throw new Error('Database error during import. Your existing data has been preserved.');
    }
  } catch (error) {
    console.error('Import failed:', error);

    // Show error toast
    Toast.show({
      type: 'error',
      text1: 'Import Failed',
      text2: error instanceof Error ? error.message : 'An unknown error occurred',
      position: 'bottom',
      visibilityTime: 4000,
    });

    throw error;
  }
}

/**
 * Validate import payload schema
 * Ensures all required fields are present and have correct types
 * 
 * @param data - Raw parsed JSON data
 * @returns Validated ExportPayload schema
 * @throws Error if validation fails
 */
function validateImportPayload(data: any): ExportPayload {
  // Check top-level structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file format: Expected JSON object');
  }

  const metadata = data.metadata;
  const practiceAreas = data.practice_areas;

  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Invalid file format: Missing or invalid metadata object');
  }

  if (typeof metadata.export_date !== 'string') {
    throw new Error('Invalid file format: Missing or invalid metadata.export_date');
  }

  if (typeof metadata.app_version !== 'string' || metadata.app_version.trim() === '') {
    throw new Error('Invalid file format: Missing or invalid metadata.app_version');
  }

  if (!Array.isArray(practiceAreas)) {
    throw new Error('Invalid file format: Missing or invalid practice_areas array');
  }

  const allowedPracticeAreaTypes = ['solo_skill', 'performance', 'interpersonal', 'creative'];

  // Validate each practice area
  practiceAreas.forEach((pa: any, i: number) => {
    if (!pa || typeof pa !== 'object') {
      throw new Error(`Invalid practice area at index ${i}: Expected object`);
    }

    if (!pa.id || typeof pa.id !== 'string') {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid id`);
    }

    if (!pa.name || typeof pa.name !== 'string') {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid name`);
    }

    if (typeof pa.type !== 'string' || !allowedPracticeAreaTypes.includes(pa.type)) {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid type`);
    }

    if (typeof pa.type_label !== 'string') {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid type_label`);
    }

    if (typeof pa.created_at !== 'number') {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid created_at`);
    }

    if (!Array.isArray(pa.sessions)) {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid sessions array`);
    }

    // Validate each session
    pa.sessions.forEach((session: any, j: number) => {
      if (!session || typeof session !== 'object') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Expected object`);
      }

      if (!session.id || typeof session.id !== 'string') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Missing or invalid id`);
      }

      if (
        session.previous_session_id !== null &&
        typeof session.previous_session_id !== 'string'
      ) {
        throw new Error(
          `Invalid session at PA ${i}, session ${j}: Invalid previous_session_id`
        );
      }

      if (!session.intent || typeof session.intent !== 'string') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Missing or invalid intent`);
      }

      if (typeof session.started_at !== 'number') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Missing or invalid started_at`);
      }

      if (session.ended_at !== null && typeof session.ended_at !== 'number') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Invalid ended_at`);
      }

      if (
        session.target_duration_seconds !== null &&
        typeof session.target_duration_seconds !== 'number'
      ) {
        throw new Error(
          `Invalid session at PA ${i}, session ${j}: Invalid target_duration_seconds`
        );
      }

      // Validate reflection if present
      if (session.reflection !== null) {
        const refl = session.reflection;

        if (!refl || typeof refl !== 'object') {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Expected object`);
        }

        if (
          typeof refl.coaching_tone !== 'number' ||
          ![1, 2, 3].includes(refl.coaching_tone)
        ) {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid coaching_tone`);
        }

        if (typeof refl.coaching_tone_name !== 'string') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Missing or invalid coaching_tone_name`
          );
        }

        if (typeof refl.ai_assisted !== 'boolean') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Missing or invalid ai_assisted`
          );
        }

        ['ai_questions_shown', 'ai_followups_shown', 'ai_followups_answered'].forEach(
          (field) => {
            if (typeof refl[field] !== 'number') {
              throw new Error(
                `Invalid reflection at PA ${i}, session ${j}: Missing or invalid ${field}`
              );
            }
          }
        );

        ['step2_question', 'step3_question', 'step4_question'].forEach((field) => {
          if (refl[field] !== null && typeof refl[field] !== 'string') {
            throw new Error(
              `Invalid reflection at PA ${i}, session ${j}: Invalid ${field} (must be string or null)`
            );
          }
        });

        if (typeof refl.what_happened !== 'string') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Missing or invalid what_happened`
          );
        }

        if (typeof refl.lessons_learned !== 'string') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Missing or invalid lessons_learned`
          );
        }

        if (typeof refl.next_actions !== 'string') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Missing or invalid next_actions`
          );
        }

        if (
          refl.feedback_rating !== null &&
          (typeof refl.feedback_rating !== 'number' ||
            refl.feedback_rating < 0 ||
            refl.feedback_rating > 4)
        ) {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Invalid feedback_rating`
          );
        }

        if (
          refl.feedback_rating_label !== null &&
          typeof refl.feedback_rating_label !== 'string'
        ) {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Invalid feedback_rating_label`
          );
        }

        if (refl.feedback_note !== null && typeof refl.feedback_note !== 'string') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Invalid feedback_note`
          );
        }

        if (typeof refl.completed_at !== 'number') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Missing or invalid completed_at`
          );
        }

        if (refl.updated_at !== null && typeof refl.updated_at !== 'number') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Invalid updated_at (must be number or null)`
          );
        }

        if (typeof refl.is_edited !== 'boolean') {
          throw new Error(
            `Invalid reflection at PA ${i}, session ${j}: Missing or invalid is_edited`
          );
        }
      }
    });
  });

  return data as ExportPayload;
}

/**
 * Clear all data from database tables
 * Called within a transaction, so can be rolled back if needed
 * 
 * @param db - SQLite database instance
 */
async function clearDatabase(db: any): Promise<void> {
  // Delete in correct order to respect foreign key constraints
  await db.runAsync('DELETE FROM reflections');
  await db.runAsync('DELETE FROM sessions');
  await db.runAsync('DELETE FROM practice_areas');

  console.log('Database tables cleared');
}

/**
 * Insert a practice area into the database
 * Uses INSERT OR REPLACE for idempotent imports
 * 
 * @param db - SQLite database instance
 * @param practiceArea - Practice area data from export
 */
async function insertPracticeArea(db: any, practiceArea: ExportPracticeArea): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO practice_areas (id, name, type, created_at, is_deleted)
     VALUES (?, ?, ?, ?, 0)`,
    [practiceArea.id, practiceArea.name, practiceArea.type, practiceArea.created_at]
  );
}

/**
 * Insert a session into the database
 * Uses INSERT OR REPLACE for idempotent imports
 * Preserves previous_session_id for chain linking
 * 
 * @param db - SQLite database instance
 * @param session - Session data from export
 * @param practiceAreaId - ID of the parent practice area
 */
async function insertSession(db: any, session: ExportSession, practiceAreaId: string): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO sessions (
      id, practice_area_id, previous_session_id, intent,
      target_duration_seconds, started_at, ended_at, is_deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      session.id,
      practiceAreaId,
      session.previous_session_id,
      session.intent,
      session.target_duration_seconds,
      session.started_at,
      session.ended_at,
    ]
  );
}

/**
 * Insert a reflection into the database
 * Uses INSERT OR REPLACE for idempotent imports
 * Generates deterministic reflection ID: refl-${sessionId}
 * 
 * @param db - SQLite database instance
 * @param reflection - Reflection data from export
 * @param sessionId - ID of the parent session
 */
async function insertReflection(db: any, reflection: ExportReflection, sessionId: string): Promise<void> {
  // Generate deterministic reflection ID
  const reflectionId = `refl-${sessionId}`;

  await db.runAsync(
    `INSERT OR REPLACE INTO reflections (
      id, session_id, coaching_tone, ai_assisted,
      step2_answer, step3_answer, step4_answer,
      ai_questions_shown, ai_followups_shown, ai_followups_answered,
      step2_question, step3_question, step4_question,
      feedback_rating, feedback_note,
      completed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reflectionId,
      sessionId,
      reflection.coaching_tone,
      reflection.ai_assisted ? 1 : 0,
      reflection.what_happened,
      reflection.lessons_learned,
      reflection.next_actions,
      reflection.ai_questions_shown,
      reflection.ai_followups_shown,
      reflection.ai_followups_answered,
      reflection.step2_question,
      reflection.step3_question,
      reflection.step4_question,
      reflection.feedback_rating,
      reflection.feedback_note,
      reflection.completed_at,
      reflection.updated_at,
    ]
  );
}

