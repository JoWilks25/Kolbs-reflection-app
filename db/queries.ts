/**
 * Database query helpers for v2.0
 * 
 * Updated for AI-assisted coaching redesign:
 * - Uses snake_case column names matching new schema
 * - Renamed format → coaching_tone
 * - Added type field to practice_areas
 * - Added AI metrics to reflections
 */

import { PracticeAreaWithStats, PracticeArea, Session, SessionWithReflection, PracticeAreaType } from '../utils';
import { getDatabase } from './migrations';
import { generateId } from '../utils/uuid';

// Example structure for future query helpers:
export async function getPracticeAreas(): Promise<PracticeAreaWithStats[]> {
  const db = getDatabase();
  const now = Date.now();
  const hours24Ms = 24 * 60 * 60 * 1000; // 86400000
  const hours48Ms = 48 * 60 * 60 * 1000; // 172800000

  const results = await db.getAllAsync<any>(`
    SELECT pa.*,
           COUNT(s.id) AS sessionCount,
           MAX(s.started_at) AS lastSessionDate,
           (SELECT COUNT(*) FROM sessions s2
            LEFT JOIN reflections r2 ON r2.session_id = s2.id
            WHERE s2.practice_area_id = pa.id
              AND r2.id IS NULL
              AND s2.ended_at IS NOT NULL
              AND s2.is_deleted = 0
              AND (? - s2.ended_at) > 0
              AND (? - s2.ended_at) <= ?) AS pendingReflectionsCount,
           (SELECT COUNT(*) FROM sessions s3
            LEFT JOIN reflections r3 ON r3.session_id = s3.id
            WHERE s3.practice_area_id = pa.id
              AND r3.id IS NULL
              AND s3.ended_at IS NOT NULL
              AND s3.is_deleted = 0
              AND (? - s3.ended_at) > ?
              AND (? - s3.ended_at) <= ?) AS overdueReflectionsCount,
           (SELECT MIN(s4.ended_at) FROM sessions s4
            LEFT JOIN reflections r4 ON r4.session_id = s4.id
            WHERE s4.practice_area_id = pa.id
              AND r4.id IS NULL
              AND s4.ended_at IS NOT NULL
              AND s4.is_deleted = 0
              AND (? - s4.ended_at) > 0
              AND (? - s4.ended_at) <= ?) AS oldestPendingReflectionDate
    FROM practice_areas pa
    LEFT JOIN sessions s
      ON pa.id = s.practice_area_id
      AND s.is_deleted = 0
    WHERE pa.is_deleted = 0
    GROUP BY pa.id
    ORDER BY oldestPendingReflectionDate ASC NULLS LAST, pa.created_at DESC
  `, [
    now, now, hours24Ms,  // pendingReflectionsCount params
    now, hours24Ms, now, hours48Ms,  // overdueReflectionsCount params
    now, now, hours48Ms  // oldestPendingReflectionDate params
  ]);

  // Ensure proper type casting
  return results.map(row => ({
    ...row,
    sessionCount: Number(row.sessionCount) || 0,
    lastSessionDate: row.lastSessionDate ? Number(row.lastSessionDate) : null,
    pendingReflectionsCount: Number(row.pendingReflectionsCount) || 0,
    overdueReflectionsCount: Number(row.overdueReflectionsCount) || 0,
    oldestPendingReflectionDate: row.oldestPendingReflectionDate ? Number(row.oldestPendingReflectionDate) : null,
  })) as PracticeAreaWithStats[];
}

export async function updatePracticeArea(editedName: string, id: string, type?: PracticeAreaType): Promise<PracticeArea> {
  const db = getDatabase();

  // Build dynamic update query
  const updates: string[] = ['name = ?'];
  const values: any[] = [editedName];

  if (type !== undefined) {
    updates.push('type = ?');
    values.push(type);
  }

  values.push(id); // Add id for WHERE clause

  const result = await db.runAsync(
    `UPDATE practice_areas SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`,
    values
  );

  if (result.changes === 0) {
    throw new Error('Practice Area not found or already deleted');
  }

  // Fetch updated record
  const updated = await db.getFirstAsync<PracticeArea>(
    'SELECT * FROM practice_areas WHERE id = ?',
    [id]
  );

  if (!updated) {
    throw new Error('Failed to retrieve updated Practice Area');
  }

  return updated;
}

/**
 * Check if a Practice Area name already exists (case-insensitive, trimmed)
 * @param name - The name to check
 * @returns True if the name exists, false otherwise
 */
export async function checkPracticeAreaNameExists(name: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM practice_areas 
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) 
     AND is_deleted = 0`,
    [name]
  );

  return (result?.count ?? 0) > 0;
}

/**
 * Create a new Practice Area
 * @param name - The name of the practice area
 * @param type - The type of practice area (NEW in v2.0)
 * @returns The created Practice Area object
 */
export async function createPracticeArea(name: string, type: PracticeAreaType = 'solo_skill'): Promise<PracticeArea> {
  const db = getDatabase();
  const id = generateId();
  const created_at = Date.now();

  await db.runAsync(
    `INSERT INTO practice_areas (id, name, type, created_at, is_deleted)
     VALUES (?, ?, ?, ?, 0)`,
    [id, name, type, created_at]
  );

  return {
    id,
    name,
    type,
    created_at,
    is_deleted: 0,
  };
}

export async function deletePracticeArea(id: string): Promise<boolean> {
  const db = getDatabase();

  const result = await db.runAsync(`
    DELETE FROM practice_areas 
    WHERE id = ? 
    AND NOT EXISTS (
      SELECT 1 FROM sessions 
      WHERE practice_area_id = ? AND is_deleted = 0
    )
  `, [id, id]);

  if (result.changes === 0) {
    throw new Error('Practice Area has sessions or not found');
  }

  return true;
}

/**
 * Get sessions that have ended but have no reflection completed within the last 48 hours
 * @returns Array of sessions with practice area names, ordered by ended_at (oldest first)
 */
export async function getPendingReflections(): Promise<any[]> {
  const db = getDatabase();
  const now = Date.now();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  const results = await db.getAllAsync<any>(`
    SELECT s.*, pa.name AS practiceAreaName
    FROM sessions s
    LEFT JOIN reflections r ON r.session_id = s.id
    LEFT JOIN practice_areas pa ON pa.id = s.practice_area_id
    WHERE r.id IS NULL
      AND s.ended_at IS NOT NULL
      AND s.is_deleted = 0
      AND (? - s.ended_at) <= ?
    ORDER BY s.ended_at ASC
  `, [now, fortyEightHoursMs]);

  return results;
}

/**
 * Get the most recent session's reflection intent (step4_answer) for a practice area
 * @param practiceAreaId - The ID of the practice area
 * @returns Session data with previous_next_action field (from step4_answer), or null if no session exists
 */
export async function getPreviousSessionIntent(practiceAreaId: string) {
  const db = getDatabase();
  const result = await db.getFirstAsync(
    `SELECT s.*, r.step4_answer as previous_next_action
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.practice_area_id = ?
       AND s.is_deleted = 0
     ORDER BY s.started_at DESC
     LIMIT 1`,
    [practiceAreaId]
  );
  return result;
}

/**
 * Get a Practice Area by ID
 * @param practiceAreaId - The ID of the practice area
 * @returns Practice Area object, or null if not found
 */
export async function getPracticeAreaById(practiceAreaId: string): Promise<PracticeArea | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<PracticeArea>(
    `SELECT * FROM practice_areas WHERE id = ? AND is_deleted = 0`,
    [practiceAreaId]
  );
  return result || null;
}

/**
 * Get the last session for a practice area (to link as previous_session_id)
 * @param practiceAreaId - The ID of the practice area
 * @returns The most recent session, or null if no sessions exist
 */
export async function getLastSessionForPracticeArea(practiceAreaId: string): Promise<Session | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<Session>(
    `SELECT * FROM sessions 
     WHERE practice_area_id = ? 
       AND is_deleted = 0 
     ORDER BY started_at DESC 
     LIMIT 1`,
    [practiceAreaId]
  );
  return result || null;
}

/**
 * Get the last session ID for a practice area (for sequential linking)
 * @param practiceAreaId - The ID of the practice area
 * @returns The ID of the most recent session, or null if no sessions exist
 */
export async function getLastSessionId(practiceAreaId: string): Promise<string | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM sessions
     WHERE practice_area_id = ?
       AND is_deleted = 0
     ORDER BY started_at DESC
     LIMIT 1`,
    [practiceAreaId]
  );
  return result?.id || null;
}

/**
 * Check if the last session in a practice area has a pending reflection
 * @param practiceAreaId - The ID of the practice area
 * @returns Object with hasPending flag and session info, or null if no last session
 */
export async function checkLastSessionHasPendingReflection(
  practiceAreaId: string
): Promise<{ hasPending: boolean; sessionId: string; endedAt: number } | null> {
  const db = getDatabase();
  const now = Date.now();

  const result = await db.getFirstAsync<{
    id: string;
    ended_at: number;
    has_reflection: number;
  }>(
    `SELECT s.id, s.ended_at,
            CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_reflection
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.practice_area_id = ?
       AND s.is_deleted = 0
       AND s.ended_at IS NOT NULL
     ORDER BY s.started_at DESC
     LIMIT 1`,
    [practiceAreaId]
  );

  if (!result) return null;

  const hoursSinceEnd = (now - result.ended_at) / (1000 * 60 * 60);
  const hasPending = result.has_reflection === 0 && hoursSinceEnd <= 48;

  return {
    hasPending,
    sessionId: result.id,
    endedAt: result.ended_at,
  };
}

/**
 * Soft delete a session (only if no reflection exists)
 * @param sessionId - The ID of the session to delete
 * @returns True if deleted, false if reflection exists (cannot delete)
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const db = getDatabase();

  // Check if reflection exists
  const reflection = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM reflections WHERE session_id = ?`,
    [sessionId]
  );

  if (reflection) {
    return false; // Cannot delete session with reflection
  }

  // Soft delete the session
  await db.runAsync(
    `UPDATE sessions SET is_deleted = 1 WHERE id = ?`,
    [sessionId]
  );

  return true;
}

/**
 * Create a new session
 * @param session - The session object to insert (without is_deleted, which defaults to 0)
 * @returns The created session with is_deleted set to 0
 */
export async function createSession(session: Omit<Session, 'is_deleted'>): Promise<Session> {
  const db = getDatabase();

  await db.runAsync(
    `INSERT INTO sessions (id, practice_area_id, previous_session_id, intent, target_duration_seconds, started_at, ended_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      session.id,
      session.practice_area_id,
      session.previous_session_id,
      session.intent,
      session.target_duration_seconds,
      session.started_at,
      session.ended_at,
    ]
  );

  return {
    ...session,
    is_deleted: 0,
  };
}

/**
 * Update session end time
 * @param sessionId - The ID of the session to end
 * @param endedAt - The timestamp when session ended
 */
export async function updateSessionEndTime(sessionId: string, endedAt: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE sessions SET ended_at = ? WHERE id = ?`,
    [endedAt, sessionId]
  );
}

/**
 * Get a session by ID
 * @param sessionId - The ID of the session
 * @returns Session object or null if not found
 */
export async function getSessionById(sessionId: string): Promise<Session | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<Session>(
    `SELECT * FROM sessions WHERE id = ? AND is_deleted = 0`,
    [sessionId]
  );
  return result || null;
}

/**
 * Get a reflection by session ID
 * UPDATED for v2.0: Returns coaching_tone and AI fields
 * @param sessionId - The ID of the session
 * @returns Reflection object or null if not found
 */
export async function getReflectionBySessionId(sessionId: string): Promise<any | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<any>(
    `SELECT * FROM reflections WHERE session_id = ?`,
    [sessionId]
  );
  return result || null;
}

/**
 * Insert a new reflection
 * UPDATED for v2.0: Uses coaching_tone and AI fields
 * @param reflection - The reflection object to insert
 */
export async function insertReflection(reflection: {
  id: string;
  session_id: string;
  coaching_tone: number;
  ai_assisted: number;
  step2_answer: string;
  step3_answer: string;
  step4_answer: string;
  ai_placeholders_shown: number;
  ai_followups_shown: number;
  ai_followups_answered: number;
  feedback_rating: number | null;
  feedback_note: string | null;
  completed_at: number;
  updated_at: number | null;
}): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO reflections (
      id, session_id, coaching_tone, ai_assisted,
      step2_answer, step3_answer, step4_answer,
      ai_placeholders_shown, ai_followups_shown, ai_followups_answered,
      feedback_rating, feedback_note,
      completed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reflection.id,
      reflection.session_id,
      reflection.coaching_tone,
      reflection.ai_assisted,
      reflection.step2_answer,
      reflection.step3_answer,
      reflection.step4_answer,
      reflection.ai_placeholders_shown,
      reflection.ai_followups_shown,
      reflection.ai_followups_answered,
      reflection.feedback_rating,
      reflection.feedback_note,
      reflection.completed_at,
      reflection.updated_at,
    ]
  );
}

/**
 * Update an existing reflection
 * UPDATED for v2.0: Uses coaching_tone and AI fields
 * @param sessionId - The session ID of the reflection to update
 * @param updates - The fields to update
 */
export async function updateReflection(
  sessionId: string,
  updates: {
    coaching_tone?: number;
    ai_assisted?: number;
    step2_answer?: string;
    step3_answer?: string;
    step4_answer?: string;
    ai_placeholders_shown?: number;
    ai_followups_shown?: number;
    ai_followups_answered?: number;
    feedback_rating?: number | null;
    feedback_note?: string | null;
    updated_at: number;
  }
): Promise<void> {
  const db = getDatabase();

  // Build dynamic update query based on provided fields
  const updateFields: string[] = [];
  const values: any[] = [];

  if (updates.coaching_tone !== undefined) {
    updateFields.push('coaching_tone = ?');
    values.push(updates.coaching_tone);
  }
  if (updates.ai_assisted !== undefined) {
    updateFields.push('ai_assisted = ?');
    values.push(updates.ai_assisted);
  }
  if (updates.step2_answer !== undefined) {
    updateFields.push('step2_answer = ?');
    values.push(updates.step2_answer);
  }
  if (updates.step3_answer !== undefined) {
    updateFields.push('step3_answer = ?');
    values.push(updates.step3_answer);
  }
  if (updates.step4_answer !== undefined) {
    updateFields.push('step4_answer = ?');
    values.push(updates.step4_answer);
  }
  if (updates.ai_placeholders_shown !== undefined) {
    updateFields.push('ai_placeholders_shown = ?');
    values.push(updates.ai_placeholders_shown);
  }
  if (updates.ai_followups_shown !== undefined) {
    updateFields.push('ai_followups_shown = ?');
    values.push(updates.ai_followups_shown);
  }
  if (updates.ai_followups_answered !== undefined) {
    updateFields.push('ai_followups_answered = ?');
    values.push(updates.ai_followups_answered);
  }
  if (updates.feedback_rating !== undefined) {
    updateFields.push('feedback_rating = ?');
    values.push(updates.feedback_rating);
  }
  if (updates.feedback_note !== undefined) {
    updateFields.push('feedback_note = ?');
    values.push(updates.feedback_note);
  }

  // Always update updated_at
  updateFields.push('updated_at = ?');
  values.push(updates.updated_at);

  // Add sessionId for WHERE clause
  values.push(sessionId);

  await db.runAsync(
    `UPDATE reflections SET ${updateFields.join(', ')} WHERE session_id = ?`,
    values
  );
}

/**
 * Get all sessions for a Practice Area with joined reflection data
 * UPDATED for v2.0: Returns coaching_tone instead of format
 * @param practiceAreaId - The ID of the practice area
 * @param sortOrder - Sort order: 'asc' for oldest first, 'desc' for newest first (default)
 * @returns Array of sessions with reflection data
 */
export async function getSeriesSessions(
  practiceAreaId: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<SessionWithReflection[]> {
  const db = getDatabase();
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const results = await db.getAllAsync<any>(
    `SELECT s.*, 
            r.coaching_tone, 
            r.ai_assisted,
            r.feedback_rating, 
            r.updated_at as reflection_updated_at,
            r.completed_at as reflection_completed_at
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.practice_area_id = ?
       AND s.is_deleted = 0
     ORDER BY s.started_at ${order}`,
    [practiceAreaId]
  );

  return results as SessionWithReflection[];
}

/**
 * Extended session type with full reflection data for Session Detail modal
 * UPDATED for v2.0: Includes AI fields
 */
export interface SessionWithFullReflection extends SessionWithReflection {
  step2_answer: string | null;
  step3_answer: string | null;
  step4_answer: string | null;
  ai_placeholders_shown: number | null;
  ai_followups_shown: number | null;
  ai_followups_answered: number | null;
  feedback_note: string | null;
}

/**
 * Get a session with full reflection data by session ID
 * Used for Session Detail modal to display complete reflection content
 * UPDATED for v2.0: Includes coaching_tone and AI fields
 * @param sessionId - The ID of the session
 * @returns Session with full reflection data or null if not found
 */
export async function getSessionWithFullReflection(
  sessionId: string
): Promise<SessionWithFullReflection | null> {
  const db = getDatabase();

  const result = await db.getFirstAsync<any>(
    `SELECT s.*, 
            r.coaching_tone, 
            r.ai_assisted,
            r.feedback_rating, 
            r.updated_at as reflection_updated_at,
            r.completed_at as reflection_completed_at,
            r.step2_answer,
            r.step3_answer,
            r.step4_answer,
            r.ai_placeholders_shown,
            r.ai_followups_shown,
            r.ai_followups_answered,
            r.feedback_note
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.id = ?
       AND s.is_deleted = 0`,
    [sessionId]
  );

  return result as SessionWithFullReflection | null;
}

/**
 * Move a session to a different Practice Area
 * Updates the session's practice_area_id and links it to the last session in the target Practice Area
 * @param sessionId - The ID of the session to move
 * @param newPracticeAreaId - The ID of the target Practice Area
 */
export async function moveSessionToPracticeArea(
  sessionId: string,
  newPracticeAreaId: string
): Promise<void> {
  const db = getDatabase();

  // Find last session in target Practice Area for chain linking
  const lastInNewPA = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM sessions
     WHERE practice_area_id = ? AND is_deleted = 0
     ORDER BY started_at DESC
     LIMIT 1`,
    [newPracticeAreaId]
  );

  await db.runAsync(
    `UPDATE sessions
     SET practice_area_id = ?, previous_session_id = ?
     WHERE id = ?`,
    [newPracticeAreaId, lastInNewPA?.id ?? null, sessionId]
  );
}

/**
 * Get previous intent with context for edge case handling
 * Returns human-readable messages for all edge cases:
 * - First session in Practice Area
 * - Previous session not found (broken chain)
 * - Previous session deleted
 * - Previous session moved to different Practice Area
 * - Actual step4_answer or "No previous intent recorded"
 * @param session - The current session to get previous intent for
 * @returns Human-readable string describing previous intent or edge case
 */
export async function getPreviousIntentWithContext(
  session: Session
): Promise<string> {
  const db = getDatabase();

  if (!session.previous_session_id) {
    return 'First session in this Practice Area';
  }

  const prev = await db.getFirstAsync<{
    id: string;
    practice_area_id: string;
    is_deleted: number;
    step4_answer: string | null;
  }>(
    `SELECT s.id, s.practice_area_id, s.is_deleted, r.step4_answer
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.id = ?`,
    [session.previous_session_id]
  );

  if (!prev) return 'Previous session not found';
  if (prev.is_deleted === 1) return 'Previous session deleted';
  if (prev.practice_area_id !== session.practice_area_id) {
    return 'Previous session moved to different Practice Area';
  }
  return prev.step4_answer || 'No previous intent recorded';
}

/**
 * Get any session blocking new session creation in a Practice Area
 * Returns the most recent ended session that has no reflection and is not deleted.
 * Unlike checkLastSessionHasPendingReflection, this has NO time window - 
 * blocks indefinitely until reflection is completed or session is deleted.
 * @param practiceAreaId - The ID of the practice area to check
 * @returns The blocking session, or null if none exists
 */
export async function getBlockingUnreflectedSession(
  practiceAreaId: string
): Promise<Session | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<Session>(
    `SELECT s.*
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.practice_area_id = ?
       AND s.is_deleted = 0
       AND s.ended_at IS NOT NULL
       AND r.id IS NULL
     ORDER BY s.ended_at DESC
     LIMIT 1`,
    [practiceAreaId]
  );
  return result || null;
}

/**
 * Get all data for export (Practice Areas with Sessions and Reflections)
 * Returns all non-deleted practice areas with their sessions and reflections
 * Used by exportService to generate JSON export
 * UPDATED for v2.0: Includes type field and coaching_tone/AI fields
 * @returns Array of practice areas with nested sessions and reflections
 */
export async function getExportData(): Promise<any[]> {
  const db = getDatabase();

  // Get all non-deleted practice areas ordered by created_at ASC
  const practiceAreas = await db.getAllAsync<any>(
    `SELECT id, name, type, created_at
     FROM practice_areas
     WHERE is_deleted = 0
     ORDER BY created_at ASC`
  );

  // For each practice area, get sessions with reflections
  const result = [];
  for (const pa of practiceAreas) {
    const sessions = await db.getAllAsync<any>(
      `SELECT s.id, s.previous_session_id, s.intent, s.started_at, s.ended_at, 
              s.target_duration_seconds,
              r.coaching_tone, r.ai_assisted,
              r.step2_answer, r.step3_answer, r.step4_answer,
              r.ai_placeholders_shown, r.ai_followups_shown, r.ai_followups_answered,
              r.feedback_rating, r.feedback_note, r.completed_at, r.updated_at
       FROM sessions s
       LEFT JOIN reflections r ON r.session_id = s.id
       WHERE s.practice_area_id = ? AND s.is_deleted = 0
       ORDER BY s.started_at ASC`,
      [pa.id]
    );

    result.push({
      ...pa,
      sessions,
    });
  }

  return result;
}
