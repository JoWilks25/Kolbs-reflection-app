/**
 * Database query helpers
 * 
 * This file will contain helper functions for common database queries.
 * Currently empty - ready for future implementation.
 */

import { getDatabase } from './migrations';

// Example structure for future query helpers:
export async function getPracticeAreas() {
  const db = getDatabase();
  return await db.getAllAsync(`
    SELECT pa.*,
           COUNT(s.id) AS sessionCount
    FROM practice_areas pa
    LEFT JOIN sessions s ON pa.id = s.practice_area_id AND s.is_deleted = 0
    WHERE pa.is_deleted = 0
    GROUP BY pa.id
    ORDER BY pa.created_at DESC
  `);
}

