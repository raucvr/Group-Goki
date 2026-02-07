import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createConversationManager } from '../manager.js'
import type { ChatMessage } from '@group-goki/shared'

describe('createConversationManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates empty manager', () => {
    const manager = createConversationManager()

    expect(manager.getStore().conversations.size).toBe(0)
    expect(manager.getStore().messagesByConversation.size).toBe(0)
  })

  it('creates a new conversation', () => {
    const manager = createConversationManager()
    const { manager: newManager, conversation } = manager.create('Test Conversation')

    expect(conversation.title).toBe('Test Conversation')
    expect(conversation.status).toBe('active')
    expect(conversation.messageCount).toBe(0)

    // Original manager unchanged
    expect(manager.getStore().conversations.size).toBe(0)
    expect(newManager.getStore().conversations.size).toBe(1)
  })

  it('gets a conversation by id', () => {
    const { manager, conversation } = createConversationManager().create('Test')

    const found = manager.get(conversation.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(conversation.id)
    expect(found?.title).toBe('Test')

    const notFound = manager.get('non-existent')
    expect(notFound).toBeUndefined()
  })

  it('adds a message to conversation', () => {
    const { manager, conversation } = createConversationManager().create('Test')

    const message: ChatMessage = {
      id: 'msg-1',
      conversationId: conversation.id,
      role: 'user',
      content: 'Hello',
      mentions: [],
      metadata: {},
      createdAt: '2025-01-15T12:00:00.000Z',
    }

    const newManager = manager.addMessage(message)

    const messages = newManager.getMessages(conversation.id)
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('Hello')

    // Message count updated
    const updatedConv = newManager.get(conversation.id)
    expect(updatedConv?.messageCount).toBe(1)

    // Original unchanged
    expect(manager.getMessages(conversation.id)).toHaveLength(0)
  })

  it('gets messages with limit', () => {
    const { manager, conversation } = createConversationManager().create('Test')

    // Add multiple messages
    let currentManager = manager
    for (let i = 0; i < 5; i++) {
      const message: ChatMessage = {
        id: `msg-${i}`,
        conversationId: conversation.id,
        role: i % 2 === 0 ? 'user' : 'model',
        content: `Message ${i}`,
        mentions: [],
        metadata: {},
        createdAt: `2025-01-15T12:00:0${i}.000Z`,
      }
      currentManager = currentManager.addMessage(message)
    }

    const allMessages = currentManager.getMessages(conversation.id)
    expect(allMessages).toHaveLength(5)

    const limitedMessages = currentManager.getMessages(conversation.id, 3)
    expect(limitedMessages).toHaveLength(3)
  })

  it('archives a conversation', () => {
    const { manager, conversation } = createConversationManager().create('Test')

    expect(conversation.status).toBe('active')

    const newManager = manager.archive(conversation.id)

    const archived = newManager.get(conversation.id)
    expect(archived?.status).toBe('archived')

    // Original unchanged
    expect(manager.get(conversation.id)?.status).toBe('active')
  })

  it('returns recent context for conversation', () => {
    const { manager, conversation } = createConversationManager().create('Test')

    // Add messages
    let currentManager = manager
    const messages: ChatMessage[] = [
      { id: '1', conversationId: conversation.id, role: 'user', content: 'First', mentions: [], metadata: {}, createdAt: '2025-01-15T12:00:00.000Z' },
      { id: '2', conversationId: conversation.id, role: 'model', content: 'Response 1', mentions: [], metadata: {}, createdAt: '2025-01-15T12:00:01.000Z' },
      { id: '3', conversationId: conversation.id, role: 'user', content: 'Second', mentions: [], metadata: {}, createdAt: '2025-01-15T12:00:02.000Z' },
      { id: '4', conversationId: conversation.id, role: 'model', content: 'Response 2', mentions: [], metadata: {}, createdAt: '2025-01-15T12:00:03.000Z' },
    ]

    for (const msg of messages) {
      currentManager = currentManager.addMessage(msg)
    }

    const context = currentManager.getRecentContext(conversation.id, 3)

    // Should return last 3 messages in order
    expect(context).toHaveLength(3)
  })

  it('returns empty context for non-existent conversation', () => {
    const manager = createConversationManager()
    const context = manager.getRecentContext('non-existent', 10)
    expect(context).toEqual([])
  })

  it('handles messages with mentions', () => {
    const { manager, conversation } = createConversationManager().create('Test')

    const message: ChatMessage = {
      id: 'msg-1',
      conversationId: conversation.id,
      role: 'user',
      content: 'Hey @claude, help me',
      mentions: [
        { modelId: 'anthropic/claude-sonnet-4', startIndex: 4, endIndex: 11 },
      ],
      metadata: {},
      createdAt: '2025-01-15T12:00:00.000Z',
    }

    const newManager = manager.addMessage(message)
    const messages = newManager.getMessages(conversation.id)

    expect(messages[0].mentions).toHaveLength(1)
    expect(messages[0].mentions[0].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('handles messages with evaluation scores', () => {
    const { manager, conversation } = createConversationManager().create('Test')

    const message: ChatMessage = {
      id: 'msg-1',
      conversationId: conversation.id,
      role: 'model',
      modelId: 'gpt-4o',
      content: 'My response',
      mentions: [],
      metadata: {},
      evaluationScore: 85,
      createdAt: '2025-01-15T12:00:00.000Z',
    }

    const newManager = manager.addMessage(message)
    const messages = newManager.getMessages(conversation.id)

    expect(messages[0].evaluationScore).toBe(85)
  })

  it('handles multiple conversations independently', () => {
    let manager = createConversationManager()

    const { manager: m1, conversation: c1 } = manager.create('Conversation 1')
    const { manager: m2, conversation: c2 } = m1.create('Conversation 2')

    // Add message to first conversation
    const msg1: ChatMessage = {
      id: 'msg-1',
      conversationId: c1.id,
      role: 'user',
      content: 'Hello from conv 1',
      mentions: [],
      metadata: {},
      createdAt: '2025-01-15T12:00:00.000Z',
    }
    const m3 = m2.addMessage(msg1)

    // Add message to second conversation
    const msg2: ChatMessage = {
      id: 'msg-2',
      conversationId: c2.id,
      role: 'user',
      content: 'Hello from conv 2',
      mentions: [],
      metadata: {},
      createdAt: '2025-01-15T12:00:00.000Z',
    }
    const m4 = m3.addMessage(msg2)

    expect(m4.getMessages(c1.id)).toHaveLength(1)
    expect(m4.getMessages(c2.id)).toHaveLength(1)
    expect(m4.getMessages(c1.id)[0].content).toBe('Hello from conv 1')
    expect(m4.getMessages(c2.id)[0].content).toBe('Hello from conv 2')
  })
})
