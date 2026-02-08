import { eq, and, desc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { modelDomainExpertise } from '../schema.js'
import { createId, now } from '@group-goki/shared'
import type { ModelLeaderboardEntry } from '@group-goki/shared'

export interface ExpertiseRecord {
  readonly id: string
  readonly modelId: string
  readonly category: string
  readonly scores: readonly number[]
  readonly totalWins: number
  readonly totalEvaluations: number
  readonly avgScore: number
  readonly winRate: number
  readonly lastEvaluatedAt: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ExpertiseRepository {
  readonly save: (record: ExpertiseRecord) => Promise<void>
  readonly findByModelAndCategory: (
    modelId: string,
    category: string,
  ) => Promise<ExpertiseRecord | undefined>
  readonly findByCategory: (category: string) => Promise<readonly ExpertiseRecord[]>
  readonly loadAllAsLeaderboardEntries: () => Promise<readonly ModelLeaderboardEntry[]>
  readonly hasExpertForDomain: (
    category: string,
    options?: {
      readonly minEvaluations?: number
      readonly minAvgScore?: number
    },
  ) => Promise<boolean>
}

export function createExpertiseRepository(
  db: BetterSQLite3Database,
): ExpertiseRepository {
  return {
    async save(record) {
      await db
        .insert(modelDomainExpertise)
        .values({
          id: record.id,
          modelId: record.modelId,
          category: record.category,
          scores: JSON.stringify(record.scores),
          totalWins: record.totalWins,
          totalEvaluations: record.totalEvaluations,
          avgScore: record.avgScore,
          winRate: record.winRate,
          lastEvaluatedAt: record.lastEvaluatedAt,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })
        .onConflictDoUpdate({
          target: [modelDomainExpertise.modelId, modelDomainExpertise.category],
          set: {
            scores: JSON.stringify(record.scores),
            totalWins: record.totalWins,
            totalEvaluations: record.totalEvaluations,
            avgScore: record.avgScore,
            winRate: record.winRate,
            lastEvaluatedAt: record.lastEvaluatedAt,
            updatedAt: now(),
          },
        })
    },

    async findByModelAndCategory(modelId, category) {
      const rows = await db
        .select()
        .from(modelDomainExpertise)
        .where(
          and(
            eq(modelDomainExpertise.modelId, modelId),
            eq(modelDomainExpertise.category, category),
          ),
        )
        .limit(1)

      const row = rows[0]
      if (!row) return undefined

      return {
        id: row.id,
        modelId: row.modelId,
        category: row.category,
        scores: JSON.parse(row.scores) as number[],
        totalWins: row.totalWins,
        totalEvaluations: row.totalEvaluations,
        avgScore: row.avgScore,
        winRate: row.winRate,
        lastEvaluatedAt: row.lastEvaluatedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    },

    async findByCategory(category) {
      const rows = await db
        .select()
        .from(modelDomainExpertise)
        .where(eq(modelDomainExpertise.category, category))
        .orderBy(desc(modelDomainExpertise.avgScore))

      return rows.map((row) => ({
        id: row.id,
        modelId: row.modelId,
        category: row.category,
        scores: JSON.parse(row.scores) as number[],
        totalWins: row.totalWins,
        totalEvaluations: row.totalEvaluations,
        avgScore: row.avgScore,
        winRate: row.winRate,
        lastEvaluatedAt: row.lastEvaluatedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))
    },

    async loadAllAsLeaderboardEntries() {
      const rows = await db.select().from(modelDomainExpertise)

      return rows.map((row) => ({
        modelId: row.modelId,
        category: row.category,
        averageScore: row.avgScore,
        totalEvaluations: row.totalEvaluations,
        totalWins: row.totalWins,
        winRate: row.winRate,
        avgResponseTimeMs: 0, // Not stored in expertise table
        avgTokenCost: 0, // Not stored in expertise table
        trend: 'stable' as const,
        lastEvaluatedAt: row.lastEvaluatedAt,
      }))
    },

    async hasExpertForDomain(category, options = {}) {
      const { minEvaluations = 3, minAvgScore = 70 } = options

      const rows = await db
        .select()
        .from(modelDomainExpertise)
        .where(eq(modelDomainExpertise.category, category))
        .orderBy(desc(modelDomainExpertise.avgScore))
        .limit(1)

      const row = rows[0]
      if (!row) return false

      return row.totalEvaluations >= minEvaluations && row.avgScore >= minAvgScore
    },
  }
}
