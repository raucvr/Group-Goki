import { describe, it, expect } from 'vitest'
import {
  WsIncomingEventSchema,
  WsOutgoingEventSchema,
  GokiRoleSchema,
} from '../ws-events.js'

describe('GokiRoleSchema', () => {
  it.each(['strategy', 'tech', 'product', 'execution'])(
    'accepts "%s"',
    (role) => {
      expect(GokiRoleSchema.parse(role)).toBe(role)
    },
  )

  it('rejects unknown role', () => {
    expect(() => GokiRoleSchema.parse('marketing')).toThrow()
  })
})

describe('WsIncomingEventSchema', () => {
  it('parses send_message event', () => {
    const event = {
      type: 'send_message',
      conversationId: 'conv-1',
      content: 'Hello world',
    }
    const result = WsIncomingEventSchema.parse(event)
    expect(result.type).toBe('send_message')
  })

  it('parses subscribe event', () => {
    const event = { type: 'subscribe', conversationId: 'conv-1' }
    const result = WsIncomingEventSchema.parse(event)
    expect(result.type).toBe('subscribe')
  })

  it('parses unsubscribe event', () => {
    const event = { type: 'unsubscribe', conversationId: 'conv-1' }
    const result = WsIncomingEventSchema.parse(event)
    expect(result.type).toBe('unsubscribe')
  })

  it('rejects empty content in send_message', () => {
    expect(() =>
      WsIncomingEventSchema.parse({
        type: 'send_message',
        conversationId: 'conv-1',
        content: '',
      }),
    ).toThrow()
  })

  it('rejects content exceeding 50000 chars', () => {
    expect(() =>
      WsIncomingEventSchema.parse({
        type: 'send_message',
        conversationId: 'conv-1',
        content: 'x'.repeat(50001),
      }),
    ).toThrow()
  })

  it('accepts content at max length 50000', () => {
    const result = WsIncomingEventSchema.parse({
      type: 'send_message',
      conversationId: 'conv-1',
      content: 'x'.repeat(50000),
    })
    expect(result.type).toBe('send_message')
  })

  it('rejects unknown event type', () => {
    expect(() =>
      WsIncomingEventSchema.parse({ type: 'ping', conversationId: 'conv-1' }),
    ).toThrow()
  })
})

describe('WsOutgoingEventSchema', () => {
  it('parses message event', () => {
    const event = {
      type: 'message',
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'model',
        content: 'Response text',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('message')
  })

  it('parses message_stream event', () => {
    const event = {
      type: 'message_stream',
      conversationId: 'conv-1',
      modelId: 'gpt-4o',
      delta: 'partial text',
      done: false,
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('message_stream')
  })

  it('parses debate_started event', () => {
    const event = {
      type: 'debate_started',
      conversationId: 'conv-1',
      debateSessionId: 'debate-1',
      participants: [
        { role: 'strategy', modelId: 'claude-sonnet-4' },
        { role: 'tech', modelId: 'gpt-4o' },
      ],
      maxRounds: 5,
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('debate_started')
  })

  it('parses debate_started with optional fields', () => {
    const event = {
      type: 'debate_started',
      conversationId: 'conv-1',
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('debate_started')
  })

  it('parses goki_response event', () => {
    const event = {
      type: 'goki_response',
      debateSessionId: 'debate-1',
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'model',
        modelId: 'claude-sonnet-4',
        content: 'Strategic perspective...',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('goki_response')
  })

  it('parses debate_round_complete event', () => {
    const event = {
      type: 'debate_round_complete',
      conversationId: 'conv-1',
      debateSessionId: 'debate-1',
      debateRound: {
        roundNumber: 1,
        responses: [],
        consensusScore: 0.75,
      },
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('debate_round_complete')
  })

  it('parses consensus_reached event', () => {
    const event = {
      type: 'consensus_reached',
      conversationId: 'conv-1',
      debateSessionId: 'debate-1',
      debateResult: {
        status: 'consensus_reached',
        totalRounds: 3,
        consensusScore: 0.85,
        finalRecommendation: 'The team recommends...',
        areasOfAgreement: ['Quality is important', 'Speed matters'],
        rounds: [],
      },
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'system',
        content: 'Consensus reached after 3 rounds.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('consensus_reached')
  })

  it('parses error event', () => {
    const event = { type: 'error', message: 'Something went wrong' }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('error')
  })

  it('parses error event with optional conversationId', () => {
    const event = {
      type: 'error',
      message: 'Not found',
      conversationId: 'conv-1',
    }
    const result = WsOutgoingEventSchema.parse(event)
    if (result.type === 'error') {
      expect(result.conversationId).toBe('conv-1')
    }
  })
})
