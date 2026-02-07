import { eq, desc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { messages } from '../schema.js'
import type { ChatMessage } from '@group-goki/shared'

export interface MessageRepository {
  readonly create: (message: ChatMessage) => Promise<ChatMessage>
  readonly findById: (id: string) => Promise<ChatMessage | null>
  readonly findByConversationId: (conversationId: string, limit?: number) => Promise<readonly ChatMessage[]>
  readonly delete: (id: string) => Promise<boolean>
}

export function createMessageRepository(
  db: BetterSQLite3Database,
): MessageRepository {
  return {
    async create(message: ChatMessage): Promise<ChatMessage> {
      await db.insert(messages).values({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        modelId: message.modelId ?? null,
        content: message.content,
        mentions: JSON.stringify(message.mentions),
        parentMessageId: message.parentMessageId ?? null,
        evaluationScore: message.evaluationScore ?? null,
        metadata: JSON.stringify(message.metadata),
        createdAt: message.createdAt,
      })
      return message
    },

    async findById(id: string): Promise<ChatMessage | null> {
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1)

      const row = rows[0]
      if (!row) return null

      return {
        id: row.id,
        conversationId: row.conversationId,
        role: row.role as 'user' | 'model' | 'system' | 'judge',
        modelId: row.modelId ?? undefined,
        content: row.content,
        mentions: JSON.parse(row.mentions),
        parentMessageId: row.parentMessageId ?? undefined,
        evaluationScore: row.evaluationScore ?? undefined,
        metadata: JSON.parse(row.metadata),
        createdAt: row.createdAt,
      }
    },

    async findByConversationId(
      conversationId: string,
      limit: number = 100,
    ): Promise<readonly ChatMessage[]> {
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit)

      return rows.map((row) => ({
        id: row.id,
        conversationId: row.conversationId,
        role: row.role as 'user' | 'model' | 'system' | 'judge',
        modelId: row.modelId ?? undefined,
        content: row.content,
        mentions: JSON.parse(row.mentions),
        parentMessageId: row.parentMessageId ?? undefined,
        evaluationScore: row.evaluationScore ?? undefined,
        metadata: JSON.parse(row.metadata),
        createdAt: row.createdAt,
      }))
    },

    async delete(id: string): Promise<boolean> {
      const result = await db.delete(messages).where(eq(messages.id, id))
      return (result.changes ?? 0) > 0
    },
  }
}
