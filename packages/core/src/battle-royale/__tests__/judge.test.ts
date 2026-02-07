import { describe, it, expect, vi } from 'vitest'
import { createJudgeEngine } from '../judge.js'
import type { ModelRouter } from '../../router/model-router.js'
import type { Task, EvaluationResult } from '@group-goki/shared'

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  conversationId: 'conv-1',
  userMessage: 'Test task',
  category: 'general',
  complexity: 'moderate',
  subtasks: [],
  status: 'analyzing',
  createdAt: '2025-01-15T12:00:00.000Z',
  ...overrides,
})

const createMockResponse = (overrides: { modelId: string; content: string; inputTokens?: number; outputTokens?: number }): { modelId: string; content: string; inputTokens: number; outputTokens: number; responseTimeMs: number; finishReason: 'stop' } => ({
  modelId: overrides.modelId,
  content: overrides.content,
  inputTokens: overrides.inputTokens ?? 100,
  outputTokens: overrides.outputTokens ?? 50,
  responseTimeMs: 1000,
  finishReason: 'stop',
})

describe('createJudgeEngine', () => {
  it('evaluates responses and returns rankings', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn().mockResolvedValue({
        modelId: 'judge-model',
        content: JSON.stringify({
          evaluations: [
            { responseIndex: 0, overallScore: 85, criteria: [{ name: 'quality', score: 85, reasoning: 'Good' }] },
            { responseIndex: 1, overallScore: 70, criteria: [{ name: 'quality', score: 70, reasoning: 'Okay' }] },
          ],
          consensus: 'Both responses addressed the task.',
          divergences: 'First response was more detailed.',
        }),
        inputTokens: 200,
        outputTokens: 100,
        responseTimeMs: 1500,
        finishReason: 'stop',
      }),
      routeParallel: vi.fn(),
      getProvider: vi.fn(),
    }

    const judge = createJudgeEngine(mockRouter)
    const task = createMockTask()
    const responses = [
      createMockResponse({ modelId: 'model-a', content: 'Response A' }),
      createMockResponse({ modelId: 'model-b', content: 'Response B' }),
    ]

    const result = await judge.evaluate(task, responses)

    expect(result.evaluations).toHaveLength(2)
    expect(result.evaluations[0].rank).toBe(1)
    expect(result.evaluations[0].overallScore).toBe(85)
    expect(result.evaluations[1].rank).toBe(2)
    expect(result.evaluations[1].overallScore).toBe(70)
  })

  it('sorts evaluations by score descending', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn().mockResolvedValue({
        modelId: 'judge-model',
        content: JSON.stringify({
          evaluations: [
            { responseIndex: 1, overallScore: 60, criteria: [{ name: 'quality', score: 60, reasoning: 'Poor' }] },
            { responseIndex: 0, overallScore: 95, criteria: [{ name: 'quality', score: 95, reasoning: 'Excellent' }] },
            { responseIndex: 2, overallScore: 80, criteria: [{ name: 'quality', score: 80, reasoning: 'Good' }] },
          ],
        }),
        inputTokens: 200,
        outputTokens: 100,
        responseTimeMs: 1500,
        finishReason: 'stop',
      }),
      routeParallel: vi.fn(),
      getProvider: vi.fn(),
    }

    const judge = createJudgeEngine(mockRouter)
    const result = await judge.evaluate(createMockTask(), [
      createMockResponse({ modelId: 'model-a', content: 'A' }),
      createMockResponse({ modelId: 'model-b', content: 'B' }),
      createMockResponse({ modelId: 'model-c', content: 'C' }),
    ])

    // Should be sorted: 95 (rank 1), 80 (rank 2), 60 (rank 3)
    expect(result.evaluations[0].overallScore).toBe(95)
    expect(result.evaluations[0].rank).toBe(1)
    expect(result.evaluations[1].overallScore).toBe(80)
    expect(result.evaluations[1].rank).toBe(2)
    expect(result.evaluations[2].overallScore).toBe(60)
    expect(result.evaluations[2].rank).toBe(3)
  })

  it('handles empty responses array', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn(),
    }

    const judge = createJudgeEngine(mockRouter)
    const result = await judge.evaluate(createMockTask(), [])

    expect(result.evaluations).toEqual([])
  })

  it('handles single response', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn().mockResolvedValue({
        modelId: 'judge-model',
        content: JSON.stringify({
          evaluations: [{ responseIndex: 0, overallScore: 75, criteria: [{ name: 'quality', score: 75, reasoning: 'Okay' }] }],
        }),
        inputTokens: 200,
        outputTokens: 100,
        responseTimeMs: 1500,
        finishReason: 'stop',
      }),
      routeParallel: vi.fn(),
      getProvider: vi.fn(),
    }

    const judge = createJudgeEngine(mockRouter)
    const result = await judge.evaluate(createMockTask(), [createMockResponse({ modelId: 'model-a', content: 'A' })])

    expect(result.evaluations).toHaveLength(1)
    expect(result.evaluations[0].rank).toBe(1)
    expect(result.evaluations[0].totalCompetitors).toBe(1)
  })

  it('records model IDs correctly in evaluations', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn().mockResolvedValue({
        modelId: 'judge-model',
        content: JSON.stringify({
          evaluations: [
            { responseIndex: 0, overallScore: 90, criteria: [{ name: 'quality', score: 90, reasoning: 'Good' }] },
            { responseIndex: 1, overallScore: 80, criteria: [{ name: 'quality', score: 80, reasoning: 'Okay' }] },
          ],
        }),
        inputTokens: 200,
        outputTokens: 100,
        responseTimeMs: 1500,
        finishReason: 'stop',
      }),
      routeParallel: vi.fn(),
      getProvider: vi.fn(),
    }

    const judge = createJudgeEngine(mockRouter)
    const result = await judge.evaluate(createMockTask(), [
      createMockResponse({ modelId: 'gpt-4o', content: 'Response A' }),
      createMockResponse({ modelId: 'claude-3-5', content: 'Response B' }),
    ])

    expect(result.evaluations[0].modelId).toBe('gpt-4o')
    expect(result.evaluations[1].modelId).toBe('claude-3-5')
  })

  it('handles responses with different scores', async () => {
    const mockRouter: ModelRouter = {
      route: vi.fn().mockResolvedValue({
        modelId: 'judge-model',
        content: JSON.stringify({
          evaluations: [
            { responseIndex: 0, overallScore: 85, criteria: [{ name: 'quality', score: 85, reasoning: 'Good' }] },
            { responseIndex: 1, overallScore: 90, criteria: [{ name: 'quality', score: 90, reasoning: 'Excellent' }] },
          ],
        }),
        inputTokens: 200,
        outputTokens: 100,
        responseTimeMs: 1500,
        finishReason: 'stop',
      }),
      routeParallel: vi.fn(),
      getProvider: vi.fn(),
    }

    const judge = createJudgeEngine(mockRouter)
    const result = await judge.evaluate(createMockTask(), [
      createMockResponse({ modelId: 'model-a', content: 'A' }),
      createMockResponse({ modelId: 'model-b', content: 'B' }),
    ])

    expect(result.evaluations).toHaveLength(2)
    // Higher score should be ranked first
    expect(result.evaluations[0].overallScore).toBe(90)
    expect(result.evaluations[1].overallScore).toBe(85)
  })
})
