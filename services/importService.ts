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

    // Step 3: Validate schema
    const payload = validateImportPayload(data);
    console.log(`Validated payload with ${payload.practiceareas.length} practice areas`);

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
      for (const practiceArea of payload.practiceareas) {
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
 * @returns Validated ExportPayload
 * @throws Error if validation fails
 */
function validateImportPayload(data: any): ExportPayload {
  // Check top-level structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file format: Expected JSON object');
  }

  if (!data.exportdate || typeof data.exportdate !== 'string') {
    throw new Error('Invalid file format: Missing or invalid exportdate');
  }

  if (!Array.isArray(data.practiceareas)) {
    throw new Error('Invalid file format: Missing or invalid practiceareas array');
  }

  // Validate each practice area
  for (let i = 0; i < data.practiceareas.length; i++) {
    const pa = data.practiceareas[i];

    if (!pa.id || typeof pa.id !== 'string') {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid id`);
    }

    if (!pa.name || typeof pa.name !== 'string') {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid name`);
    }

    if (typeof pa.createdat !== 'number') {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid createdat`);
    }

    if (!Array.isArray(pa.sessions)) {
      throw new Error(`Invalid practice area at index ${i}: Missing or invalid sessions array`);
    }

    // Validate each session
    for (let j = 0; j < pa.sessions.length; j++) {
      const session = pa.sessions[j];

      if (!session.id || typeof session.id !== 'string') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Missing or invalid id`);
      }

      if (session.previoussessionid !== null && typeof session.previoussessionid !== 'string') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Invalid previoussessionid`);
      }

      if (!session.intent || typeof session.intent !== 'string') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Missing or invalid intent`);
      }

      if (typeof session.startedat !== 'number') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Missing or invalid startedat`);
      }

      if (session.endedat !== null && typeof session.endedat !== 'number') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Invalid endedat`);
      }

      if (session.targetdurationseconds !== null && typeof session.targetdurationseconds !== 'number') {
        throw new Error(`Invalid session at PA ${i}, session ${j}: Invalid targetdurationseconds`);
      }

      // Validate reflection if present
      if (session.reflection !== null) {
        const refl = session.reflection;

        if (typeof refl.format !== 'number' || ![1, 2, 3].includes(refl.format)) {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid format`);
        }

        if (typeof refl.step2answer !== 'string') {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid step2answer`);
        }

        if (typeof refl.step3answer !== 'string') {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid step3answer`);
        }

        if (typeof refl.step4answer !== 'string') {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid step4answer`);
        }

        if (refl.feedbackrating !== null && (typeof refl.feedbackrating !== 'number' || refl.feedbackrating < 0 || refl.feedbackrating > 4)) {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid feedbackrating`);
        }

        if (refl.feedbacknote !== null && typeof refl.feedbacknote !== 'string') {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid feedbacknote`);
        }

        if (typeof refl.completedat !== 'number') {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid completedat`);
        }

        if (refl.updatedat !== null && typeof refl.updatedat !== 'number') {
          throw new Error(`Invalid reflection at PA ${i}, session ${j}: Invalid updatedat`);
        }
      }
    }
  }

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
    `INSERT OR REPLACE INTO practice_areas (id, name, created_at, is_deleted)
     VALUES (?, ?, ?, 0)`,
    [practiceArea.id, practiceArea.name, practiceArea.createdat]
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
      session.previoussessionid,
      session.intent,
      session.targetdurationseconds,
      session.startedat,
      session.endedat,
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
      id, session_id, format,
      step2_answer, step3_answer, step4_answer,
      feedback_rating, feedback_note,
      completed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reflectionId,
      sessionId,
      reflection.format,
      reflection.step2answer,
      reflection.step3answer,
      reflection.step4answer,
      reflection.feedbackrating,
      reflection.feedbacknote,
      reflection.completedat,
      reflection.updatedat,
    ]
  );
}

