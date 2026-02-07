import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { evaluations } from '../schema.js'
import type { EvaluationResult } from '@group-goki/shared'

export interface EvaluationRepository {
  readonly create: (evaluation: EvaluationResult) => Promise<EvaluationResult>
  readonly findById: (id: string) => Promise<EvaluationResult | null>
  readonly findByTaskId: (taskId: string) => Promise<readonly EvaluationResult[]>
  readonly findByModelId: (modelId: string, limit?: number) => Promise<readonly EvaluationResult[]>
}

export function createEvaluationRepository(
  db: BetterSQLite3Database,
): EvaluationRepository {
  return {
    async create(evaluation: EvaluationResult): Promise<EvaluationResult> {
      await db.insert(evaluations).values({
        id: evaluation.id,
        taskId: evaluation.taskId,
        modelId: evaluation.modelId,
        judgeModelId: evaluation.judgeModelId,
        overallScore: evaluation.overallScore,
        criteria: JSON.stringify(evaluation.criteria),
        rank: evaluation.rank,
        totalCompetitors: evaluation.totalCompetitors,
        responseTimeMs: evaluation.responseTimeMs,
        tokenCost: evaluation.tokenCost,
        strengthSummary: evaluation.strengthSummary ?? null,
        weaknessSummary: evaluation.weaknessSummary ?? null,
        createdAt: evaluation.createdAt,
      })
      return evaluation
    },

    async findById(id: string): Promise<EvaluationResult | null> {
      const rows = await db
        .select()
        .from(evaluations)
        .where(eq(evaluations.id, id))
        .limit(1)

      const row = rows[0]
      if (!row) return null

      return {
        id: row.id,
        taskId: row.taskId,
        modelId: row.modelId,
        judgeModelId: row.judgeModelId,
        overallScore: row.overallScore,
        criteria: JSON.parse(row.criteria),
        rank: row.rank,
        totalCompetitors: row.totalCompetitors,
        responseTimeMs: row.responseTimeMs,
        tokenCost: row.tokenCost,
        strengthSummary: row.strengthSummary ?? undefined,
        weaknessSummary: row.weaknessSummary ?? undefined,
        createdAt: row.createdAt,
      }
    },

    async findByTaskId(taskId: string): Promise<readonly EvaluationResult[]> {
      const rows = await db
        .select()
        .from(evaluations)
        .where(eq(evaluations.taskId, taskId))

      return rows.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        modelId: row.modelId,
        judgeModelId: row.judgeModelId,
        overallScore: row.overallScore,
        criteria: JSON.parse(row.criteria),
        rank: row.rank,
        totalCompetitors: row.totalCompetitors,
        responseTimeMs: row.responseTimeMs,
        tokenCost: row.tokenCost,
        strengthSummary: row.strengthSummary ?? undefined,
        weaknessSummary: row.weaknessSummary ?? undefined,
        createdAt: row.createdAt,
      }))
    },

    async findByModelId(modelId: string, limit: number = 100): Promise<readonly EvaluationResult[]> {
      const rows = await db
        .select()
        .from(evaluations)
        .where(eq(evaluations.modelId, modelId))
        .limit(limit)

      return rows.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        modelId: row.modelId,
        judgeModelId: row.judgeModelId,
        overallScore: row.overallScore,
        criteria: JSON.parse(row.criteria),
        rank: row.rank,
        totalCompetitors: row.totalCompetitors,
        responseTimeMs: row.responseTimeMs,
        tokenCost: row.tokenCost,
        strengthSummary: row.strengthSummary ?? undefined,
        weaknessSummary: row.weaknessSummary ?? undefined,
        createdAt: row.createdAt,
      }))
    },
  }
}
