import { describe, it, expect } from 'vitest'
import { ConversationStatusSchema, ConversationSchema } from '../conversations.js'

describe('ConversationStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(ConversationStatusSchema.parse('active')).toBe('active')
    expect(ConversationStatusSchema.parse('archived')).toBe('archived')
  })

  it('rejects invalid status', () => {
    expect(() => ConversationStatusSchema.parse('deleted')).toThrow()
  })
})

describe('ConversationSchema', () => {
  const validConversation = {
    id: 'conv-1',
    title: 'Test Conversation',
    status: 'active' as const,
    messageCount: 5,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }

  it('parses a valid conversation', () => {
    const result = ConversationSchema.parse(validConversation)
    expect(result).toEqual(validConversation)
  })

  it('defaults messageCount to 0 when omitted', () => {
    const { messageCount: _, ...withoutCount } = validConversation
    const result = ConversationSchema.parse(withoutCount)
    expect(result.messageCount).toBe(0)
  })

  it('rejects negative messageCount', () => {
    expect(() =>
      ConversationSchema.parse({ ...validConversation, messageCount: -1 }),
    ).toThrow()
  })

  it('rejects non-integer messageCount', () => {
    expect(() =>
      ConversationSchema.parse({ ...validConversation, messageCount: 1.5 }),
    ).toThrow()
  })

  it('rejects missing required fields', () => {
    expect(() => ConversationSchema.parse({})).toThrow()
    expect(() => ConversationSchema.parse({ id: 'x' })).toThrow()
  })

  it('rejects invalid status value', () => {
    expect(() =>
      ConversationSchema.parse({ ...validConversation, status: 'deleted' }),
    ).toThrow()
  })
})
