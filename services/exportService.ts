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
    const practiceAreas: ExportPracticeArea[] = rawData.map((pa) => {
      const sessions: ExportSession[] = pa.sessions.map((session: any) => {
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
        if (session.format !== null && session.format !== undefined) {
          // Compute isedited
          const isedited =
            session.updated_at !== null &&
            session.completed_at !== null &&
            session.updated_at !== session.completed_at;

          reflection = {
            format: session.format,
            step2answer: session.step2_answer,
            step3answer: session.step3_answer,
            step4answer: session.step4_answer,
            feedbackrating: session.feedback_rating,
            feedbacknote: session.feedback_note,
            completedat: session.completed_at,
            updatedat: session.updated_at,
            isedited,
          };
        }

        // Build session object with proper field names
        return {
          id: session.id,
          previoussessionid: session.previous_session_id,
          intent: session.intent,
          startedat: session.started_at,
          endedat: session.ended_at,
          targetdurationseconds: session.target_duration_seconds,
          actualdurationseconds,
          mettarget,
          reflection,
        };
      });

      // Build practice area object with proper field names
      return {
        id: pa.id,
        name: pa.name,
        createdat: pa.created_at,
        sessions,
      };
    });

    // Step 3: Build final payload
    const payload: ExportPayload = {
      exportdate: new Date().toISOString(),
      practiceareas: practiceAreas,
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

