import { Hono } from 'hono'
import { z } from 'zod'
import type { ConversationManager } from '@group-goki/chat'

const CreateConversationSchema = z.object({
  title: z.string().min(1).max(200),
})

export function createConversationRoutes(
  getManager: () => ConversationManager,
  setManager: (m: ConversationManager) => void,
) {
  const app = new Hono()

  // List conversations
  app.get('/', (c) => {
    const manager = getManager()
    const store = manager.getStore()
    const conversations = [...store.conversations.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return c.json({ success: true, data: conversations })
  })

  // Create conversation
  app.post('/', async (c) => {
    const body = await c.req.json()
    const parsed = CreateConversationSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.message }, 400)
    }

    const manager = getManager()
    const { manager: updated, conversation } = manager.create(parsed.data.title)
    setManager(updated)

    return c.json({ success: true, data: conversation }, 201)
  })

  // Get single conversation
  app.get('/:id', (c) => {
    const id = c.req.param('id')
    const manager = getManager()
    const conversation = manager.get(id)

    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404)
    }

    return c.json({ success: true, data: conversation })
  })

  // Get messages for a conversation
  app.get('/:id/messages', (c) => {
    const id = c.req.param('id')
    const limitParam = c.req.query('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const manager = getManager()

    const conversation = manager.get(id)
    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404)
    }

    const messages = manager.getMessages(id, limit)
    return c.json({ success: true, data: messages })
  })

  // Archive conversation
  app.post('/:id/archive', (c) => {
    const id = c.req.param('id')
    const manager = getManager()

    const conversation = manager.get(id)
    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404)
    }

    const updated = manager.archive(id)
    setManager(updated)

    return c.json({ success: true, data: { id, status: 'archived' } })
  })

  return app
}
