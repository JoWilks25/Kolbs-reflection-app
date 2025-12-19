/**
 * Database query helpers
 * 
 * This file will contain helper functions for common database queries.
 * Currently empty - ready for future implementation.
 */

import { PracticeAreaWithStats } from '../utils';
import { getDatabase } from './migrations';

// Example structure for future query helpers:
export async function getPracticeAreas(): Promise<PracticeAreaWithStats[]> {
  const db = getDatabase();
  return await db.getAllAsync(`
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
}

