import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createModelLeaderboard } from '../leaderboard.js'
import type { EvaluationResult, ModelLeaderboardEntry } from '@group-goki/shared'

const createMockEvaluation = (overrides: Partial<EvaluationResult> = {}): EvaluationResult => ({
  id: 'eval-1',
  taskId: 'task-1',
  modelId: 'model-1',
  judgeModelId: 'judge-1',
  overallScore: 85,
  criteria: [{ name: 'quality', score: 85, reasoning: 'Good' }],
  rank: 1,
  totalCompetitors: 3,
  responseTimeMs: 1000,
  tokenCost: 0.01,
  createdAt: '2025-01-15T12:00:00.000Z',
  ...overrides,
})

const createMockEntry = (overrides: Partial<ModelLeaderboardEntry> = {}): ModelLeaderboardEntry => ({
  modelId: 'model-1',
  category: 'general',
  averageScore: 80,
  totalEvaluations: 5,
  totalWins: 3,
  winRate: 0.6,
  avgResponseTimeMs: 1000,
  avgTokenCost: 0.01,
  trend: 'stable',
  lastEvaluatedAt: '2025-01-15T12:00:00.000Z',
  ...overrides,
})

describe('createModelLeaderboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates empty leaderboard', () => {
    const leaderboard = createModelLeaderboard()

    expect(leaderboard.getEntries()).toEqual([])
    expect(leaderboard.getTopModels('general')).toEqual([])
    expect(leaderboard.getModelProfile('any')).toBeUndefined()
  })

  it('loads existing entries', () => {
    const entries = [
      createMockEntry({ modelId: 'model-1', averageScore: 85 }),
      createMockEntry({ modelId: 'model-2', averageScore: 75 }),
    ]
    const leaderboard = createModelLeaderboard(entries)

    expect(leaderboard.getEntries()).toHaveLength(2)
    expect(leaderboard.getModelProfile('model-1')?.overallAvgScore).toBe(85)
  })

  it('records evaluation and returns new leaderboard', () => {
    const leaderboard = createModelLeaderboard()
    const evaluation = createMockEvaluation({ modelId: 'model-1', overallScore: 90 })

    const newLeaderboard = leaderboard.record(evaluation, 'general')

    expect(newLeaderboard.getEntries()).toHaveLength(1)
    expect(leaderboard.getEntries()).toHaveLength(0)

    const entry = newLeaderboard.getEntries()[0]
    expect(entry.modelId).toBe('model-1')
    expect(entry.averageScore).toBe(90)
    expect(entry.totalEvaluations).toBe(1)
  })

  it('accumulates evaluations for same model and category', () => {
    let leaderboard = createModelLeaderboard()

    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 80, rank: 2 }),
      'general'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 90, rank: 1 }),
      'general'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 100, rank: 1 }),
      'general'
    )

    const entry = leaderboard.getEntries()[0]
    expect(entry.totalEvaluations).toBe(3)
    expect(entry.averageScore).toBe(90) // (80 + 90 + 100) / 3
    expect(entry.totalWins).toBe(2) // rank 1 twice
    expect(entry.winRate).toBe(2 / 3)
  })

  it('separates entries by category', () => {
    let leaderboard = createModelLeaderboard()

    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 90 }),
      'technical'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 70 }),
      'creative'
    )

    expect(leaderboard.getEntries()).toHaveLength(2)

    const technical = leaderboard.getTopModels('technical')
    expect(technical[0].averageScore).toBe(90)

    const creative = leaderboard.getTopModels('creative')
    expect(creative[0].averageScore).toBe(70)
  })

  it('returns top models sorted by average score', () => {
    let leaderboard = createModelLeaderboard()

    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-b', overallScore: 75 }),
      'general'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-a', overallScore: 95 }),
      'general'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-c', overallScore: 85 }),
      'general'
    )

    const topModels = leaderboard.getTopModels('general', 2)

    expect(topModels).toHaveLength(2)
    expect(topModels[0].modelId).toBe('model-a')
    expect(topModels[0].averageScore).toBe(95)
    expect(topModels[1].modelId).toBe('model-c')
    expect(topModels[1].averageScore).toBe(85)
  })

  it('returns model profile with average score and evaluation count', () => {
    let leaderboard = createModelLeaderboard()

    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 95 }),
      'code-generation'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 90 }),
      'strategy'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 60 }),
      'creative-writing'
    )

    const profile = leaderboard.getModelProfile('model-1')

    expect(profile).toBeDefined()
    expect(profile?.modelId).toBe('model-1')
    expect(profile?.overallAvgScore).toBeCloseTo(81.67, 1)
    expect(profile?.totalEvaluations).toBe(3)
  })

  it('calculates win rate correctly', () => {
    let leaderboard = createModelLeaderboard()

    // 3 evaluations, 2 wins = 66.7%
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 95, rank: 1 }),
      'general'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 80, rank: 2 }),
      'general'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 90, rank: 1 }),
      'general'
    )

    const entry = leaderboard.getEntries()[0]
    expect(entry.totalWins).toBe(2)
    expect(entry.totalEvaluations).toBe(3)
    expect(entry.winRate).toBeCloseTo(0.667, 2)
  })

  it('updates lastEvaluatedAt timestamp', () => {
    let leaderboard = createModelLeaderboard()

    vi.setSystemTime(new Date('2025-01-20T10:00:00.000Z'))

    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-1', overallScore: 90 }),
      'general'
    )

    const entry = leaderboard.getEntries()[0]
    expect(entry.lastEvaluatedAt).toBe('2025-01-20T10:00:00.000Z')
  })

  it('handles multiple models in same category', () => {
    let leaderboard = createModelLeaderboard()

    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-a', overallScore: 90 }),
      'technical'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-b', overallScore: 85 }),
      'technical'
    )
    leaderboard = leaderboard.record(
      createMockEvaluation({ modelId: 'model-c', overallScore: 95 }),
      'technical'
    )

    const entries = leaderboard.getEntries()
    expect(entries).toHaveLength(3)

    const topModels = leaderboard.getTopModels('technical', 2)
    expect(topModels[0].modelId).toBe('model-c')
    expect(topModels[1].modelId).toBe('model-a')
  })
})
