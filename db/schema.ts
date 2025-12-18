/**
 * Database schema definitions for Kolb's Reflection Cycle App
 * 
 * This file contains all SQL table creation statements and indexes.
 * Tables: practice_areas, sessions, reflections
 */

export const SCHEMA_SQL = `
-- Enable WAL mode for better performance
PRAGMA journal_mode = WAL;

-- Practice Areas
CREATE TABLE IF NOT EXISTS practice_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  practice_area_id TEXT NOT NULL,
  previous_session_id TEXT,       -- NULL only for first session in a Practice Area
  intent TEXT NOT NULL,
  target_duration_seconds INTEGER,  -- NULL = no target, just stopwatch
  started_at INTEGER NOT NULL,
  ended_at INTEGER,               -- NULL if session still active
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id),
  FOREIGN KEY (previous_session_id) REFERENCES sessions(id)
);

-- Reflections
CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  format INTEGER NOT NULL,        -- 1=Direct, 2=Reflective, 3=Minimalist
  step2_answer TEXT NOT NULL,     -- "What happened?"
  step3_answer TEXT NOT NULL,     -- "Lesson/pattern"
  step4_answer TEXT NOT NULL,     -- "Next action"
  feedback_rating INTEGER,        -- 0=😕 1=😞, 2=😐, 3=🙂, 4=🚀, NULL if skipped
  feedback_note TEXT,
  completed_at INTEGER NOT NULL,
  updated_at INTEGER,             -- NULL if never edited, otherwise timestamp of last edit
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_practice_area 
  ON sessions (practice_area_id, started_at);

CREATE INDEX IF NOT EXISTS idx_sessions_previous 
  ON sessions (previous_session_id);

CREATE INDEX IF NOT EXISTS idx_reflections_session 
  ON reflections (session_id);

CREATE INDEX IF NOT EXISTS idx_sessions_ended_at
  ON sessions (ended_at);  -- For pending reflection queries
`;

