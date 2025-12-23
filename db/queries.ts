/**
 * Database query helpers
 * 
 * This file will contain helper functions for common database queries.
 * Currently empty - ready for future implementation.
 */

import { PracticeAreaWithStats, PracticeArea, Session, SessionWithReflection } from '../utils';
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
 * @returns The created Practice Area object
 */
export async function createPracticeArea(name: string): Promise<PracticeArea> {
  const db = getDatabase();
  const id = generateId();
  const created_at = Date.now();

  await db.runAsync(
    `INSERT INTO practice_areas (id, name, created_at, is_deleted)
     VALUES (?, ?, ?, 0)`,
    [id, name, created_at]
  );

  return {
    id,
    name,
    created_at,
    is_deleted: 0,
  };
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
 * Insert test data for SessionSetupScreen acceptance criteria testing
 * Creates practice areas covering:
 * 1. Normal case: Previous session with reflection (step4_answer)
 * 2. No reflection: Previous session but no reflection
 * 3. No sessions: Practice area with no sessions
 * 4. Long text: Previous session with long step4_answer (>100 chars) for collapsible test
 * 5. Deleted sessions: Should be filtered out by query
 */
export async function insertTestData(): Promise<void> {
  const db = getDatabase();
  const now = Date.now();

  // Test data structure for SessionSetupScreen
  const testData = [
    {
      practiceAreaName: 'Piano Practice',
      description: 'Normal case: Has previous session with reflection',
      sessions: [
        {
          hoursAgo: 2,
          intent: 'Worked on Chopin Nocturne Op. 9 No. 2',
          durationMinutes: 45,
          hasReflection: true,
          reflection: {
            format: 1, // Direct
            step2_answer: 'Practiced the main theme and worked on the left hand accompaniment pattern. Struggled with the trills in the middle section.',
            step3_answer: 'The trills require more finger independence. Need to practice them slowly and gradually increase tempo.',
            step4_answer: 'Focus on trill exercises daily for 10 minutes before playing the full piece. Use metronome starting at 60 BPM.',
          },
        },
      ],
    },
    {
      practiceAreaName: 'Public Speaking',
      description: 'No reflection: Has previous session but no reflection',
      sessions: [
        {
          hoursAgo: 5,
          intent: 'Practiced presentation for team meeting',
          durationMinutes: 30,
          hasReflection: false,
        },
      ],
    },
    {
      practiceAreaName: 'Spanish Language',
      description: 'No sessions: Practice area with no sessions',
      sessions: [],
    },
    {
      practiceAreaName: 'Rock Climbing',
      description: 'Long text: Previous session with long step4_answer (>100 chars)',
      sessions: [
        {
          hoursAgo: 1,
          intent: 'Bouldering session at gym',
          durationMinutes: 90,
          hasReflection: true,
          reflection: {
            format: 2, // Reflective
            step2_answer: 'Worked on V4 problems focusing on dynamic moves and overhangs. Completed 3 new problems but struggled with a specific crimp sequence.',
            step3_answer: 'My grip strength is improving but I need to work on body positioning for overhangs. The crimp sequence requires more core engagement.',
            step4_answer: 'Next session, I will dedicate 20 minutes to core strengthening exercises before climbing. Focus on hanging leg raises and planks. Then practice the crimp sequence on the training board, starting with easier holds and gradually moving to smaller ones. Also, watch technique videos on overhang body positioning to improve my approach angle.',
          },
        },
      ],
    },
    {
      practiceAreaName: 'Meditation',
      description: 'Deleted session: Has deleted session that should be filtered out',
      sessions: [
        {
          hoursAgo: 3,
          intent: 'Morning meditation practice',
          durationMinutes: 20,
          hasReflection: true,
          reflection: {
            format: 3, // Minimalist
            step2_answer: 'Focused on breath for 20 minutes',
            step3_answer: 'Mind wandered less than usual',
            step4_answer: 'Continue daily practice',
          },
          isDeleted: true, // This session will be deleted
        },
        {
          hoursAgo: 10,
          intent: 'Evening meditation',
          durationMinutes: 15,
          hasReflection: true,
          reflection: {
            format: 1,
            step2_answer: 'Evening session was more challenging, mind was very active',
            step3_answer: 'Evening sessions require more focus, might need to adjust timing',
            step4_answer: 'Try morning sessions instead, or add a short walk before evening meditation',
          },
        },
      ],
    },
  ];

  let totalPracticeAreas = 0;
  let totalSessions = 0;
  let totalReflections = 0;
  let deletedSessions = 0;

  for (const practiceArea of testData) {
    // Check if practice area already exists
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM practice_areas WHERE name = ? AND is_deleted = 0`,
      [practiceArea.practiceAreaName]
    );

    let practiceAreaId: string;

    if (existing) {
      practiceAreaId = existing.id;
      console.log(`   ℹ️  Using existing practice area: ${practiceArea.practiceAreaName}`);
    } else {
      practiceAreaId = generateId();
      await db.runAsync(
        `INSERT INTO practice_areas (id, name, created_at, is_deleted)
         VALUES (?, ?, ?, 0)`,
        [practiceAreaId, practiceArea.practiceAreaName, now - (7 * 24 * 60 * 60 * 1000)]
      );
      console.log(`   ✅ Created practice area: ${practiceArea.practiceAreaName} (${practiceArea.description})`);
      totalPracticeAreas++;
    }

    let previousSessionId: string | null = null;

    // Create sessions for this practice area
    for (const session of practiceArea.sessions) {
      const sessionId = generateId();
      const durationMs = session.durationMinutes * 60 * 1000;
      const endedAt = now - (session.hoursAgo * 60 * 60 * 1000);
      const startedAt = endedAt - durationMs;
      const isDeleted = 'isDeleted' in session && session.isDeleted ? 1 : 0;

      await db.runAsync(
        `INSERT INTO sessions (id, practice_area_id, previous_session_id, intent, target_duration_seconds, started_at, ended_at, is_deleted)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
        [sessionId, practiceAreaId, previousSessionId, session.intent, startedAt, endedAt, isDeleted]
      );

      totalSessions++;
      if (isDeleted) {
        deletedSessions++;
      }

      // Create reflection if it exists
      if (session.hasReflection && !isDeleted && 'reflection' in session && session.reflection) {
        const reflectionId = generateId();
        const completedAt = endedAt + 1000; // Reflection completed 1 second after session ended

        await db.runAsync(
          `INSERT INTO reflections (id, session_id, format, step2_answer, step3_answer, step4_answer, feedback_rating, feedback_note, completed_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL)`,
          [
            reflectionId,
            sessionId,
            session.reflection.format,
            session.reflection.step2_answer,
            session.reflection.step3_answer,
            session.reflection.step4_answer,
            completedAt,
          ]
        );

        totalReflections++;
      }

      previousSessionId = sessionId;
    }
  }

  console.log('\n✅ Test data inserted successfully for SessionSetupScreen');
  console.log(`   - Practice Areas: ${totalPracticeAreas} created`);
  console.log(`   - Total Sessions: ${totalSessions}`);
  console.log(`   - Reflections: ${totalReflections}`);
  console.log(`   - Deleted Sessions: ${deletedSessions} (should be filtered out)`);
  console.log('\n📋 Test Cases:');
  console.log('   1. Piano Practice: Should show "Focus on trill exercises daily..."');
  console.log('   2. Public Speaking: Should show "No previous intent recorded"');
  console.log('   3. Spanish Language: Should show "No previous sessions"');
  console.log('   4. Rock Climbing: Should show long text with "Show more" toggle');
  console.log('   5. Meditation: Should show "Try morning sessions instead..." (deleted session filtered)\n');
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
 * @returns Practice Area object with id and name, or null if not found
 */
export async function getPracticeAreaById(practiceAreaId: string): Promise<{ id: string; name: string } | null> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ id: string; name: string }>(
    `SELECT id, name FROM practice_areas WHERE id = ? AND is_deleted = 0`,
    [practiceAreaId]
  );
  return result;
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
 * @param reflection - The reflection object to insert
 */
export async function insertReflection(reflection: {
  id: string;
  session_id: string;
  format: number;
  step2_answer: string;
  step3_answer: string;
  step4_answer: string;
  feedback_rating: number | null;
  feedback_note: string | null;
  completed_at: number;
  updated_at: number | null;
}): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO reflections (
      id, session_id, format,
      step2_answer, step3_answer, step4_answer,
      feedback_rating, feedback_note,
      completed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reflection.id,
      reflection.session_id,
      reflection.format,
      reflection.step2_answer,
      reflection.step3_answer,
      reflection.step4_answer,
      reflection.feedback_rating,
      reflection.feedback_note,
      reflection.completed_at,
      reflection.updated_at,
    ]
  );
}

/**
 * Update an existing reflection
 * @param sessionId - The session ID of the reflection to update
 * @param updates - The fields to update
 */
export async function updateReflection(
  sessionId: string,
  updates: {
    format?: number;
    step2_answer?: string;
    step3_answer?: string;
    step4_answer?: string;
    feedback_rating?: number | null;
    feedback_note?: string | null;
    updated_at: number;
  }
): Promise<void> {
  const db = getDatabase();
  
  // Build dynamic update query based on provided fields
  const updateFields: string[] = [];
  const values: any[] = [];
  
  if (updates.format !== undefined) {
    updateFields.push('format = ?');
    values.push(updates.format);
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
            r.format, 
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
 */
export interface SessionWithFullReflection extends SessionWithReflection {
  step2_answer: string | null;
  step3_answer: string | null;
  step4_answer: string | null;
  feedback_note: string | null;
}

/**
 * Get a session with full reflection data by session ID
 * Used for Session Detail modal to display complete reflection content
 * @param sessionId - The ID of the session
 * @returns Session with full reflection data or null if not found
 */
export async function getSessionWithFullReflection(
  sessionId: string
): Promise<SessionWithFullReflection | null> {
  const db = getDatabase();
  
  const result = await db.getFirstAsync<any>(
    `SELECT s.*, 
            r.format, 
            r.feedback_rating, 
            r.updated_at as reflection_updated_at,
            r.completed_at as reflection_completed_at,
            r.step2_answer,
            r.step3_answer,
            r.step4_answer,
            r.feedback_note
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.id = ?
       AND s.is_deleted = 0`,
    [sessionId]
  );
  
  return result as SessionWithFullReflection | null;
}

