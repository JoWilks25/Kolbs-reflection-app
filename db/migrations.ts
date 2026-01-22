/**
 * Database migration and initialization
 * 
 * Handles database setup, table creation, and provides the database instance.
 */

import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

const DB_NAME = 'kolbs_app.db';

// Open encrypted database with SQLCipher
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database by creating tables and indexes if they don't exist.
 * Uses SQLCipher encryption via enableCRSQLite option.
 * 
 * @returns Promise<SQLite.SQLiteDatabase> The initialized database instance
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    // Open database with encryption enabled
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Check if tables already exist
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    const tableNames = tables.map(t => t.name);
    const requiredTables = ['practice_areas', 'sessions', 'reflections'];
    const tablesExist = requiredTables.every(table => tableNames.includes(table));

    // Only run schema if tables don't exist
    if (!tablesExist) {
      console.log('Initializing database schema...');
      await db.execAsync(SCHEMA_SQL);
      console.log('Database schema initialized successfully');
    } else {
      console.log('Database tables already exist, skipping schema creation');

      // Run migrations for existing databases
      await runMigrations(db);
    }

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Get the database instance.
 * Throws an error if database hasn't been initialized yet.
 * 
 * @returns SQLite.SQLiteDatabase The database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection.
 * Useful for cleanup or testing.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Run migrations for existing databases
 * Adds new columns if they don't exist
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if ai_questions_shown column exists
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(reflections)"
    );
    const columnNames = columns.map(col => col.name);

    // Migration v2.1: Add ai_questions_shown and step question columns
    if (!columnNames.includes('ai_questions_shown')) {
      console.log('Running migration v2.1: Adding ai_questions_shown column...');
      try {
        await db.runAsync('ALTER TABLE reflections ADD COLUMN ai_questions_shown INTEGER DEFAULT 0');
        await db.runAsync('UPDATE reflections SET ai_questions_shown = 0 WHERE ai_questions_shown IS NULL');
        console.log('Migration v2.1 completed: ai_questions_shown added');
      } catch (error) {
        console.error('Error adding ai_questions_shown column:', error);
        throw error; // Re-throw to prevent silent failures
      }
    }

    if (!columnNames.includes('step2_question')) {
      console.log('Running migration v2.1: Adding step question columns...');
      try {
        await db.runAsync('ALTER TABLE reflections ADD COLUMN step2_question TEXT');
        await db.runAsync('ALTER TABLE reflections ADD COLUMN step3_question TEXT');
        await db.runAsync('ALTER TABLE reflections ADD COLUMN step4_question TEXT');
        console.log('Migration v2.1 completed: step question columns added');
      } catch (error) {
        console.error('Error adding step question columns:', error);
        throw error; // Re-throw to prevent silent failures
      }
    }

    // Migration v2.2: Add intent refinement tracking columns to sessions
    const sessionColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(sessions)"
    );
    const sessionColumnNames = sessionColumns.map(col => col.name);

    if (!sessionColumnNames.includes('intent_refined')) {
      console.log('Running migration v2.2: Adding intent refinement columns...');
      try {
        // Run each ALTER TABLE statement separately for better error handling
        await db.runAsync('ALTER TABLE sessions ADD COLUMN intent_refined INTEGER DEFAULT 0');
        await db.runAsync('ALTER TABLE sessions ADD COLUMN original_intent TEXT');
        await db.runAsync('ALTER TABLE sessions ADD COLUMN intent_analysis_requested INTEGER DEFAULT 0');

        // Update existing rows
        await db.runAsync('UPDATE sessions SET intent_refined = 0 WHERE intent_refined IS NULL');
        await db.runAsync('UPDATE sessions SET intent_analysis_requested = 0 WHERE intent_analysis_requested IS NULL');

        console.log('Migration v2.2 completed: intent refinement columns added');
      } catch (error) {
        console.error('Error adding intent refinement columns:', error);
        throw error; // Re-throw to prevent silent failures
      }
    }

    // Migration v2.3: Remove deprecated ai_placeholders_shown column
    if (columnNames.includes('ai_placeholders_shown')) {
      console.log('Running migration v2.3: Removing deprecated ai_placeholders_shown column...');
      try {
        // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        // This is safe because ai_placeholders_shown was deprecated and replaced by ai_questions_shown
        await db.execAsync(`
          -- Create new table without ai_placeholders_shown
          CREATE TABLE reflections_v2_3 (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL UNIQUE,
            coaching_tone INTEGER NOT NULL,
            ai_assisted INTEGER NOT NULL DEFAULT 1,
            step2_answer TEXT NOT NULL,
            step3_answer TEXT NOT NULL,
            step4_answer TEXT NOT NULL,
            ai_questions_shown INTEGER DEFAULT 0,
            ai_followups_shown INTEGER DEFAULT 0,
            ai_followups_answered INTEGER DEFAULT 0,
            step2_question TEXT,
            step3_question TEXT,
            step4_question TEXT,
            feedback_rating INTEGER,
            feedback_note TEXT,
            completed_at INTEGER NOT NULL,
            updated_at INTEGER,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
          );
          
          -- Copy data (excluding ai_placeholders_shown)
          INSERT INTO reflections_v2_3 
          SELECT 
            id, session_id, coaching_tone, ai_assisted,
            step2_answer, step3_answer, step4_answer,
            ai_questions_shown, ai_followups_shown, ai_followups_answered,
            step2_question, step3_question, step4_question,
            feedback_rating, feedback_note,
            completed_at, updated_at
          FROM reflections;
          
          -- Drop old table and rename
          DROP TABLE reflections;
          ALTER TABLE reflections_v2_3 RENAME TO reflections;
          
          -- Recreate indexes
          CREATE INDEX IF NOT EXISTS idx_reflections_session ON reflections (session_id);
          CREATE INDEX IF NOT EXISTS idx_reflections_ai_assisted ON reflections (ai_assisted, coaching_tone);
        `);
        console.log('Migration v2.3 completed: ai_placeholders_shown column removed');
      } catch (error) {
        console.error('Error removing ai_placeholders_shown column:', error);
        throw error; // Re-throw to prevent silent failures
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    // Re-throw to ensure migration failures are visible
    throw error;
  }
}

/**
 * Drop all tables from the database
 * WARNING: This will permanently delete all data!
 * Use only for development/testing purposes.
 */
export async function dropAllTables(): Promise<void> {
  const db = getDatabase();

  try {
    console.log('⚠️  Dropping all tables...');

    // Disable foreign key constraints temporarily
    await db.execAsync('PRAGMA foreign_keys = OFF');

    // Drop all tables in reverse order of dependencies
    await db.execAsync(`
      DROP TABLE IF EXISTS reflections;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS practice_areas;
    `);

    // Re-enable foreign key constraints
    await db.execAsync('PRAGMA foreign_keys = ON');

    console.log('✅ All tables dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
}