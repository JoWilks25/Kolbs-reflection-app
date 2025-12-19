/**
 * Database query helpers
 * 
 * This file will contain helper functions for common database queries.
 * Currently empty - ready for future implementation.
 */

import { PracticeAreaWithStats, PracticeArea } from '../utils';
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
 * Insert test data for pending reflections (for development/testing)
 * Creates multiple practice areas with sessions at various time points
 */
export async function insertTestPendingReflections(): Promise<void> {
  const db = getDatabase();
  const now = Date.now();

  // Define test practice areas with their sessions
  const testData = [
    {
      practiceAreaName: 'Piano Practice',
      sessions: [
        {
          hoursAgo: 10, // Pending state (< 24h)
          intent: 'Worked on Chopin Nocturne Op. 9 No. 2',
          durationMinutes: 45,
        },
      ],
    },
    {
      practiceAreaName: 'Public Speaking',
      sessions: [
        {
          hoursAgo: 30, // Overdue state (24-48h)
          intent: 'Practiced presentation for team meeting',
          durationMinutes: 30,
        },
      ],
    },
    {
      practiceAreaName: 'Spanish Language',
      sessions: [
        {
          hoursAgo: 20, // Pending state (< 24h)
          intent: 'Conversation practice with language partner',
          durationMinutes: 60,
        },
      ],
    },
    {
      practiceAreaName: 'Rock Climbing',
      sessions: [
        {
          hoursAgo: 50, // Outside window (> 48h, should not appear)
          intent: 'Bouldering session at gym',
          durationMinutes: 90,
        },
      ],
    },
  ];

  let totalSessions = 0;
  let pendingSessions = 0;
  let overdueSessions = 0;

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
        [practiceAreaId, practiceArea.practiceAreaName, now - (7 * 24 * 60 * 60 * 1000)] // Created 7 days ago
      );
      console.log(`   ✅ Created practice area: ${practiceArea.practiceAreaName}`);
    }

    // Create sessions for this practice area
    for (const session of practiceArea.sessions) {
      const sessionId = generateId();
      const durationMs = session.durationMinutes * 60 * 1000;
      const endedAt = now - (session.hoursAgo * 60 * 60 * 1000);
      const startedAt = endedAt - durationMs;

      await db.runAsync(
        `INSERT INTO sessions (id, practice_area_id, previous_session_id, intent, target_duration_seconds, started_at, ended_at, is_deleted)
         VALUES (?, ?, NULL, ?, NULL, ?, ?, 0)`,
        [sessionId, practiceAreaId, session.intent, startedAt, endedAt]
      );

      totalSessions++;

      if (session.hoursAgo < 24) {
        pendingSessions++;
      } else if (session.hoursAgo >= 24 && session.hoursAgo < 48) {
        overdueSessions++;
      }
    }
  }

  console.log('\n✅ Test pending reflections data inserted successfully');
  console.log(`   - Practice Areas: ${testData.length}`);
  console.log(`   - Total Sessions: ${totalSessions}`);
  console.log(`   - Pending (< 24h): ${pendingSessions}`);
  console.log(`   - Overdue (24-48h): ${overdueSessions}`);
  console.log(`   - Outside window (> 48h): ${totalSessions - pendingSessions - overdueSessions}`);
  console.log(`   - Expected banner count: ${pendingSessions + overdueSessions}\n`);
}

