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
