import { describe, it, expect } from 'vitest'
import {
  EvaluationCriterionSchema,
  EvaluationResultSchema,
  TrendSchema,
  ModelLeaderboardEntrySchema,
} from '../evaluation.js'

describe('EvaluationCriterionSchema', () => {
  it('parses valid criterion', () => {
    const result = EvaluationCriterionSchema.parse({
      name: 'clarity',
      score: 85,
      reasoning: 'Well structured response',
    })
    expect(result.name).toBe('clarity')
    expect(result.score).toBe(85)
  })

  it('rejects score below 0', () => {
    expect(() =>
      EvaluationCriterionSchema.parse({ name: 'x', score: -1, reasoning: 'y' }),
    ).toThrow()
  })

  it('rejects score above 100', () => {
    expect(() =>
      EvaluationCriterionSchema.parse({ name: 'x', score: 101, reasoning: 'y' }),
    ).toThrow()
  })

  it('accepts boundary scores 0 and 100', () => {
    expect(EvaluationCriterionSchema.parse({ name: 'x', score: 0, reasoning: 'y' }).score).toBe(0)
    expect(EvaluationCriterionSchema.parse({ name: 'x', score: 100, reasoning: 'y' }).score).toBe(100)
  })
})

describe('TrendSchema', () => {
  it('accepts valid trends', () => {
    expect(TrendSchema.parse('improving')).toBe('improving')
    expect(TrendSchema.parse('stable')).toBe('stable')
    expect(TrendSchema.parse('declining')).toBe('declining')
  })

  it('rejects invalid trend', () => {
    expect(() => TrendSchema.parse('rising')).toThrow()
  })
})

describe('EvaluationResultSchema', () => {
  const validResult = {
    id: 'eval-1',
    taskId: 'task-1',
    modelId: 'gpt-4o',
    judgeModelId: 'claude-3.5-sonnet',
    overallScore: 88,
    criteria: [{ name: 'clarity', score: 90, reasoning: 'good' }],
    rank: 1,
    totalCompetitors: 3,
    responseTimeMs: 1500,
    tokenCost: 0.05,
    createdAt: '2025-01-01T00:00:00.000Z',
  }

  it('parses a valid evaluation result', () => {
    const result = EvaluationResultSchema.parse(validResult)
    expect(result.overallScore).toBe(88)
    expect(result.criteria).toHaveLength(1)
  })

  it('accepts optional strength/weakness summaries', () => {
    const withSummaries = {
      ...validResult,
      strengthSummary: 'Strong analytical approach',
      weaknessSummary: 'Lacked examples',
    }
    const result = EvaluationResultSchema.parse(withSummaries)
    expect(result.strengthSummary).toBe('Strong analytical approach')
  })

  it('rejects rank of 0 or negative', () => {
    expect(() => EvaluationResultSchema.parse({ ...validResult, rank: 0 })).toThrow()
    expect(() => EvaluationResultSchema.parse({ ...validResult, rank: -1 })).toThrow()
  })

  it('rejects negative responseTimeMs', () => {
    expect(() =>
      EvaluationResultSchema.parse({ ...validResult, responseTimeMs: -100 }),
    ).toThrow()
  })

  it('rejects overallScore out of range', () => {
    expect(() => EvaluationResultSchema.parse({ ...validResult, overallScore: -1 })).toThrow()
    expect(() => EvaluationResultSchema.parse({ ...validResult, overallScore: 101 })).toThrow()
  })
})

describe('ModelLeaderboardEntrySchema', () => {
  const validEntry = {
    modelId: 'gpt-4o',
    category: 'strategy',
    averageScore: 85.5,
    totalEvaluations: 10,
    totalWins: 7,
    winRate: 0.7,
    avgResponseTimeMs: 2000,
    avgTokenCost: 0.03,
    trend: 'improving' as const,
    lastEvaluatedAt: '2025-01-01T00:00:00.000Z',
  }

  it('parses a valid leaderboard entry', () => {
    const result = ModelLeaderboardEntrySchema.parse(validEntry)
    expect(result.modelId).toBe('gpt-4o')
    expect(result.winRate).toBe(0.7)
  })

  it('rejects winRate above 1', () => {
    expect(() =>
      ModelLeaderboardEntrySchema.parse({ ...validEntry, winRate: 1.1 }),
    ).toThrow()
  })

  it('rejects negative winRate', () => {
    expect(() =>
      ModelLeaderboardEntrySchema.parse({ ...validEntry, winRate: -0.1 }),
    ).toThrow()
  })

  it('accepts boundary winRate values 0 and 1', () => {
    expect(ModelLeaderboardEntrySchema.parse({ ...validEntry, winRate: 0 }).winRate).toBe(0)
    expect(ModelLeaderboardEntrySchema.parse({ ...validEntry, winRate: 1 }).winRate).toBe(1)
  })
})
