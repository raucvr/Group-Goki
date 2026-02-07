import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function runMigrations(db: BetterSQLite3Database): void {
  const migrationsFolder = join(__dirname, '../../drizzle')
  migrate(db, { migrationsFolder })
}
