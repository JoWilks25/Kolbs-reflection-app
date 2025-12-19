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
  const results = await db.getAllAsync<any>(`
    SELECT pa.*,
           COUNT(s.id) AS sessionCount,
           MAX(s.started_at) AS lastSessionDate
    FROM practice_areas pa
    LEFT JOIN sessions s
      ON pa.id = s.practice_area_id
      AND s.is_deleted = 0
    WHERE pa.is_deleted = 0
    GROUP BY pa.id
    ORDER BY pa.created_at DESC
  `);

  // Ensure proper type casting
  return results.map(row => ({
    ...row,
    sessionCount: Number(row.sessionCount) || 0,
    lastSessionDate: row.lastSessionDate ? Number(row.lastSessionDate) : null,
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

