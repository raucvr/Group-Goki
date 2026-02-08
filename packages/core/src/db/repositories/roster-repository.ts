import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { gokiRoster } from '../schema.js'
import { createId, now } from '@group-goki/shared'

export type GokiRole = 'strategy' | 'tech' | 'product' | 'execution'
export type AssignmentType = 'manual' | 'auto'

export interface RosterEntry {
  readonly id: string
  readonly role: GokiRole
  readonly modelId: string
  readonly assignmentType: AssignmentType
  readonly assignedAt: string
  readonly updatedAt: string
}

export interface RosterRepository {
  readonly assign: (
    role: GokiRole,
    modelId: string,
    assignmentType: AssignmentType,
  ) => Promise<void>
  readonly findByRole: (role: GokiRole) => Promise<RosterEntry | undefined>
  readonly findAll: () => Promise<readonly RosterEntry[]>
  readonly remove: (role: GokiRole) => Promise<void>
}

export function createRosterRepository(
  db: BetterSQLite3Database,
): RosterRepository {
  return {
    async assign(role, modelId, assignmentType) {
      await db
        .insert(gokiRoster)
        .values({
          id: createId(),
          role,
          modelId,
          assignmentType,
          assignedAt: now(),
          updatedAt: now(),
        })
        .onConflictDoUpdate({
          target: gokiRoster.role,
          set: {
            modelId,
            assignmentType,
            updatedAt: now(),
          },
        })
    },

    async findByRole(role) {
      const rows = await db
        .select()
        .from(gokiRoster)
        .where(eq(gokiRoster.role, role))
        .limit(1)

      const row = rows[0]
      if (!row) return undefined

      return {
        id: row.id,
        role: row.role as GokiRole,
        modelId: row.modelId,
        assignmentType: row.assignmentType as AssignmentType,
        assignedAt: row.assignedAt,
        updatedAt: row.updatedAt,
      }
    },

    async findAll() {
      const rows = await db.select().from(gokiRoster)
      return rows.map((row) => ({
        id: row.id,
        role: row.role as GokiRole,
        modelId: row.modelId,
        assignmentType: row.assignmentType as AssignmentType,
        assignedAt: row.assignedAt,
        updatedAt: row.updatedAt,
      }))
    },

    async remove(role) {
      await db.delete(gokiRoster).where(eq(gokiRoster.role, role))
    },
  }
}
