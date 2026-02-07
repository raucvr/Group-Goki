import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { conversations } from '../schema.js'
import type { Conversation } from '@group-goki/shared'

export interface ConversationRepository {
  readonly create: (conversation: Conversation) => Promise<Conversation>
  readonly findById: (id: string) => Promise<Conversation | null>
  readonly findAll: () => Promise<readonly Conversation[]>
  readonly update: (id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>) => Promise<Conversation | null>
  readonly delete: (id: string) => Promise<boolean>
}

export function createConversationRepository(
  db: BetterSQLite3Database,
): ConversationRepository {
  return {
    async create(conversation: Conversation): Promise<Conversation> {
      await db.insert(conversations).values({
        id: conversation.id,
        title: conversation.title,
        status: conversation.status,
        messageCount: conversation.messageCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
      return conversation
    },

    async findById(id: string): Promise<Conversation | null> {
      const rows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1)

      const row = rows[0]
      if (!row) return null

      return {
        id: row.id,
        title: row.title,
        status: row.status as 'active' | 'archived',
        messageCount: row.messageCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    },

    async findAll(): Promise<readonly Conversation[]> {
      const rows = await db.select().from(conversations)

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status as 'active' | 'archived',
        messageCount: row.messageCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))
    },

    async update(
      id: string,
      updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>,
    ): Promise<Conversation | null> {
      await db
        .update(conversations)
        .set(updates)
        .where(eq(conversations.id, id))

      return this.findById(id)
    },

    async delete(id: string): Promise<boolean> {
      const result = await db.delete(conversations).where(eq(conversations.id, id))
      return (result.changes ?? 0) > 0
    },
  }
}
