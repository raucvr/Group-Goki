import { z } from 'zod'

export const EvaluationCriterionSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
})
export type EvaluationCriterion = z.infer<typeof EvaluationCriterionSchema>

export const EvaluationResultSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  modelId: z.string(),
  judgeModelId: z.string(),
  overallScore: z.number().min(0).max(100),
  criteria: z.array(EvaluationCriterionSchema),
  rank: z.number().int().positive(),
  totalCompetitors: z.number().int().positive(),
  responseTimeMs: z.number().nonnegative(),
  tokenCost: z.number().nonnegative(),
  strengthSummary: z.string().optional(),
  weaknessSummary: z.string().optional(),
  createdAt: z.string(),
})
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>

export const TrendSchema = z.enum(['improving', 'stable', 'declining'])
export type Trend = z.infer<typeof TrendSchema>

export const ModelLeaderboardEntrySchema = z.object({
  modelId: z.string(),
  category: z.string(),
  averageScore: z.number().min(0).max(100),
  totalEvaluations: z.number().int().nonnegative(),
  totalWins: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1),
  avgResponseTimeMs: z.number().nonnegative(),
  avgTokenCost: z.number().nonnegative(),
  trend: TrendSchema,
  lastEvaluatedAt: z.string(),
})
export type ModelLeaderboardEntry = z.infer<typeof ModelLeaderboardEntrySchema>
