/**
 * Database schema definitions for Kolb's Reflection Cycle App v2.0
 * 
 * This file contains all SQL table creation statements and indexes.
 * Tables: practice_areas, sessions, reflections
 * 
 * v2.0 Changes:
 * - Added 'type' column to practice_areas (solo_skill, performance, interpersonal, creative)
 * - Renamed 'format' to 'coaching_tone' in reflections (1=Facilitative, 2=Socratic, 3=Supportive)
 * - Added AI assistance fields: ai_assisted, ai_placeholders_shown, ai_followups_shown, ai_followups_answered
 * - Added index for AI analytics queries
 */

export const SCHEMA_SQL = `
-- Enable WAL mode for better performance
PRAGMA journal_mode = WAL;

-- Practice Areas (UPDATED in v2.0)
CREATE TABLE IF NOT EXISTS practice_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'solo_skill',  -- NEW: solo_skill, performance, interpersonal, creative
  created_at INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

-- Sessions (unchanged from v1)
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

-- Reflections (UPDATED in v2.0)
CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  coaching_tone INTEGER NOT NULL,        -- RENAMED from format: 1=Facilitative, 2=Socratic, 3=Supportive
  ai_assisted INTEGER NOT NULL DEFAULT 1,  -- NEW: 0=off, 1=on
  step2_answer TEXT NOT NULL,            -- "What happened?"
  step3_answer TEXT NOT NULL,            -- "Lesson/pattern"
  step4_answer TEXT NOT NULL,            -- "Next action"
  
  -- AI interaction metrics (NEW in v2.0)
  ai_placeholders_shown INTEGER DEFAULT 0,
  ai_followups_shown INTEGER DEFAULT 0,
  ai_followups_answered INTEGER DEFAULT 0,
  
  -- Feedback
  feedback_rating INTEGER,        -- 0=Confusing, 1=Hard, 2=Neutral, 3=Good, 4=Great, NULL if skipped
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

-- NEW: Index for AI analytics queries (v2.0)
CREATE INDEX IF NOT EXISTS idx_reflections_ai_assisted 
  ON reflections (ai_assisted, coaching_tone);
`;
