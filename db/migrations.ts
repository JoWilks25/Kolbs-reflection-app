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
    const requiredTables = ['practiceareas', 'sessions', 'reflections'];
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
      await db.execAsync(`
        ALTER TABLE reflections ADD COLUMN ai_questions_shown INTEGER DEFAULT 0;
        UPDATE reflections SET ai_questions_shown = 0 WHERE ai_questions_shown IS NULL;
      `);
      console.log('Migration v2.1 completed: ai_questions_shown added');
    }

    if (!columnNames.includes('step2_question')) {
      console.log('Running migration v2.1: Adding step question columns...');
      await db.execAsync(`
        ALTER TABLE reflections ADD COLUMN step2_question TEXT;
        ALTER TABLE reflections ADD COLUMN step3_question TEXT;
        ALTER TABLE reflections ADD COLUMN step4_question TEXT;
      `);
      console.log('Migration v2.1 completed: step question columns added');
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    // Don't throw - allow app to continue even if migration fails
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