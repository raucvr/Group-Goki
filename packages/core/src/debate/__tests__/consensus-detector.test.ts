import { describe, it, expect, vi } from 'vitest'
import { createConsensusDetector } from '../consensus-detector.js'
import type { ModelRouter } from '../../router/model-router.js'
import type { ChatMessage } from '@group-goki/shared'

const createMockMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'model',
  modelId: 'model-a',
  content: 'Test message',
  mentions: [],
  metadata: {},
  createdAt: '2025-01-15T12:00:00.000Z',
  ...overrides,
})

describe('createConsensusDetector', () => {
  it('detects consensus when models agree', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue({
        complete: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            hasConsensus: true,
            consensusScore: 0.9,
            reasoning: 'All models agree on the core recommendation.',
            areasOfAgreement: ['Use microservices architecture', 'Implement caching layer'],
            areasOfDisagreement: [],
          }),
        }),
      }),
    }

    const detector = createConsensusDetector(mockRouter, 'judge-model')
    const debateHistory = [
      createMockMessage({ modelId: 'strategy-model', content: 'We should use microservices.' }),
    ]
    const currentRound = [
      createMockMessage({ modelId: 'tech-model', content: 'I agree, microservices would work well.' }),
      createMockMessage({ modelId: 'product-model', content: 'Microservices make sense for scalability.' }),
    ]

    const result = await detector.detect(debateHistory, currentRound)

    expect(result.hasConsensus).toBe(true)
    expect(result.consensusScore).toBe(0.9)
    expect(result.areasOfAgreement).toContain('Use microservices architecture')
    expect(result.areasOfDisagreement).toHaveLength(0)
  })

  it('detects lack of consensus when models disagree', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue({
        complete: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            hasConsensus: false,
            consensusScore: 0.4,
            reasoning: 'Models have fundamental disagreements about the approach.',
            areasOfAgreement: ['Need to improve performance'],
            areasOfDisagreement: ['Architecture choice: monolith vs microservices', 'Database: SQL vs NoSQL'],
          }),
        }),
      }),
    }

    const detector = createConsensusDetector(mockRouter, 'judge-model')
    const debateHistory = [
      createMockMessage({ modelId: 'strategy-model', content: 'Use monolith architecture.' }),
    ]
    const currentRound = [
      createMockMessage({ modelId: 'tech-model', content: 'We should go with microservices instead.' }),
      createMockMessage({ modelId: 'product-model', content: 'I prefer microservices for flexibility.' }),
    ]

    const result = await detector.detect(debateHistory, currentRound)

    expect(result.hasConsensus).toBe(false)
    expect(result.consensusScore).toBe(0.4)
    expect(result.areasOfDisagreement).toHaveLength(2)
  })

  it('handles partial consensus with medium score', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue({
        complete: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            hasConsensus: false,
            consensusScore: 0.65,
            reasoning: 'Models agree on direction but differ on implementation details.',
            areasOfAgreement: ['Need better caching', 'Improve API performance'],
            areasOfDisagreement: ['Redis vs Memcached'],
          }),
        }),
      }),
    }

    const detector = createConsensusDetector(mockRouter, 'judge-model')
    const result = await detector.detect(
      [createMockMessage({ content: 'We need caching.' })],
      [
        createMockMessage({ content: 'Redis would be best.' }),
        createMockMessage({ content: 'Memcached is simpler and sufficient.' }),
      ],
    )

    expect(result.consensusScore).toBe(0.65)
    expect(result.areasOfAgreement.length).toBeGreaterThan(0)
    expect(result.areasOfDisagreement.length).toBeGreaterThan(0)
  })

  it('handles empty debate history', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue({
        complete: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            hasConsensus: true,
            consensusScore: 1.0,
            reasoning: 'Single response, no disagreement possible.',
            areasOfAgreement: ['Initial recommendation'],
            areasOfDisagreement: [],
          }),
        }),
      }),
    }

    const detector = createConsensusDetector(mockRouter, 'judge-model')
    const result = await detector.detect(
      [],
      [createMockMessage({ content: 'My recommendation.' })],
    )

    expect(result).toBeDefined()
    expect(result.hasConsensus).toBe(true)
  })

  it('passes correct prompt to judge model', async () => {
    const completeMock = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        hasConsensus: true,
        consensusScore: 0.8,
        reasoning: 'Test',
        areasOfAgreement: ['Test'],
        areasOfDisagreement: [],
      }),
    })

    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue({ complete: completeMock }),
    }

    const detector = createConsensusDetector(mockRouter, 'judge-model')
    await detector.detect(
      [createMockMessage({ content: 'Previous message' })],
      [createMockMessage({ content: 'Current message' })],
    )

    expect(completeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'judge-model',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Previous message'),
          }),
        ]),
      }),
    )
  })

  it('throws error when provider is not found', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue(undefined),
    }

    const detector = createConsensusDetector(mockRouter, 'missing-model')

    await expect(
      detector.detect(
        [createMockMessage({ content: 'Test' })],
        [createMockMessage({ content: 'Test' })],
      ),
    ).rejects.toThrow('No provider found for judge model: missing-model')
  })

  it('parses JSON response correctly', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue({
        complete: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            hasConsensus: true,
            consensusScore: 0.95,
            reasoning: 'Strong agreement',
            areasOfAgreement: ['Point 1', 'Point 2', 'Point 3'],
            areasOfDisagreement: ['Minor detail'],
          }),
        }),
      }),
    }

    const detector = createConsensusDetector(mockRouter, 'judge-model')
    const result = await detector.detect(
      [createMockMessage({ content: 'Debate history' })],
      [createMockMessage({ content: 'Current round' })],
    )

    expect(result.hasConsensus).toBe(true)
    expect(result.consensusScore).toBe(0.95)
    expect(result.reasoning).toBe('Strong agreement')
    expect(result.areasOfAgreement).toEqual(['Point 1', 'Point 2', 'Point 3'])
    expect(result.areasOfDisagreement).toEqual(['Minor detail'])
  })
})
