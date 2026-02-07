import { describe, it, expect } from 'vitest'
import {
  WsIncomingEventSchema,
  WsOutgoingEventSchema,
  BattleRoyalePhaseSchema,
} from '../ws-events.js'

describe('BattleRoyalePhaseSchema', () => {
  it.each(['analyzing', 'competing', 'judging', 'discussing', 'complete'])(
    'accepts "%s"',
    (phase) => {
      expect(BattleRoyalePhaseSchema.parse(phase)).toBe(phase)
    },
  )

  it('rejects unknown phase', () => {
    expect(() => BattleRoyalePhaseSchema.parse('starting')).toThrow()
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

  it('parses battle_royale_progress event', () => {
    const event = {
      type: 'battle_royale_progress',
      conversationId: 'conv-1',
      phase: 'competing',
      detail: 'Models are generating responses',
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('battle_royale_progress')
  })

  it('parses battle_royale_progress with optional candidateModels', () => {
    const event = {
      type: 'battle_royale_progress',
      conversationId: 'conv-1',
      phase: 'competing',
      detail: 'Running',
      candidateModels: ['gpt-4o', 'claude-3.5-sonnet'],
    }
    const result = WsOutgoingEventSchema.parse(event)
    if (result.type === 'battle_royale_progress') {
      expect(result.candidateModels).toEqual(['gpt-4o', 'claude-3.5-sonnet'])
    }
  })

  it('parses evaluation_result event', () => {
    const event = {
      type: 'evaluation_result',
      conversationId: 'conv-1',
      evaluations: [
        {
          id: 'eval-1',
          taskId: 'task-1',
          modelId: 'gpt-4o',
          judgeModelId: 'claude-3.5-sonnet',
          overallScore: 90,
          criteria: [{ name: 'quality', score: 90, reasoning: 'good' }],
          rank: 1,
          totalCompetitors: 2,
          responseTimeMs: 1000,
          tokenCost: 0.01,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      winnerModelId: 'gpt-4o',
    }
    const result = WsOutgoingEventSchema.parse(event)
    expect(result.type).toBe('evaluation_result')
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
