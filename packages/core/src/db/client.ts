import Database, { type Database as SqliteDatabase } from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

export type DatabaseInstance = BetterSQLite3Database<typeof schema>

export interface DatabaseConnection {
  readonly db: DatabaseInstance
  readonly close: () => void
}

export function createDatabase(url: string): DatabaseConnection {
  const dbPath = url.replace('sqlite://', '')
  const sqlite = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  return {
    db,
    close: () => sqlite.close(),
  }
}
