import type { EvaluationResult, ModelLeaderboardEntry, TaskCategory, Trend } from '@group-goki/shared'
import { now } from '@group-goki/shared'

export interface ModelProfile {
  readonly modelId: string
  readonly specializations: readonly string[]
  readonly overallAvgScore: number
  readonly totalEvaluations: number
}

export interface ModelLeaderboard {
  readonly record: (evaluation: EvaluationResult, category: string) => ModelLeaderboard
  readonly getTopModels: (category: string, limit?: number) => readonly ModelLeaderboardEntry[]
  readonly getModelProfile: (modelId: string) => ModelProfile | undefined
  readonly getSpecializations: (modelId: string) => readonly string[]
  readonly shouldRetain: (modelId: string) => boolean
  readonly getEntries: () => readonly ModelLeaderboardEntry[]
  readonly selectCandidates: (
    category: string,
    count: number,
    options?: {
      readonly includeFrontier?: boolean
      readonly includeChallenger?: boolean
      readonly allModelIds?: readonly string[]
    },
  ) => readonly string[]
  readonly hasExpertForDomain: (
    category: string,
    options?: {
      readonly minEvaluations?: number
      readonly minAvgScore?: number
    },
  ) => boolean
}

interface InternalEntry {
  readonly modelId: string
  readonly category: string
  readonly scores: readonly number[]
  readonly wins: number
  readonly totalGames: number
  readonly responseTimes: readonly number[]
  readonly tokenCosts: readonly number[]
  readonly lastEvaluatedAt: string
}

/**
 * Create a leaderboard from external ModelLeaderboardEntry data (e.g. loaded from DB).
 * Note: score distribution is lost in this path (scores become uniform at averageScore),
 * but totalWins is preserved exactly.
 */
export function createModelLeaderboard(
  existingEntries: readonly ModelLeaderboardEntry[] = [],
): ModelLeaderboard {
  const data = new Map<string, InternalEntry>(
    existingEntries.map((e) => {
      const key = `${e.modelId}:${e.category}`
      return [key, {
        modelId: e.modelId,
        category: e.category,
        scores: Array(e.totalEvaluations).fill(e.averageScore),
        wins: e.totalWins,
        totalGames: e.totalEvaluations,
        responseTimes: [e.avgResponseTimeMs],
        tokenCosts: [e.avgTokenCost],
        lastEvaluatedAt: e.lastEvaluatedAt,
      }]
    }),
  )
  return buildLeaderboard(data)
}

function toLeaderboardEntry(entry: InternalEntry): ModelLeaderboardEntry {
  const avgScore = entry.scores.length > 0
    ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
    : 0

  const recentScores = entry.scores.slice(-5)
  const olderScores = entry.scores.slice(-10, -5)

  let trend: Trend = 'stable'
  if (recentScores.length >= 3 && olderScores.length >= 3) {
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length
    if (recentAvg > olderAvg + 5) trend = 'improving'
    else if (recentAvg < olderAvg - 5) trend = 'declining'
  }

  return {
    modelId: entry.modelId,
    category: entry.category,
    averageScore: Math.round(avgScore * 10) / 10,
    totalEvaluations: entry.totalGames,
    totalWins: entry.wins,
    winRate: entry.totalGames > 0 ? entry.wins / entry.totalGames : 0,
    avgResponseTimeMs: entry.responseTimes.length > 0
      ? entry.responseTimes.reduce((a, b) => a + b, 0) / entry.responseTimes.length
      : 0,
    avgTokenCost: entry.tokenCosts.length > 0
      ? entry.tokenCosts.reduce((a, b) => a + b, 0) / entry.tokenCosts.length
      : 0,
    trend,
    lastEvaluatedAt: entry.lastEvaluatedAt,
  }
}

/**
 * Build leaderboard directly from internal entries.
 * This avoids the lossy InternalEntry -> ModelLeaderboardEntry -> InternalEntry round-trip,
 * preserving score distribution and exact win counts across record() calls.
 */
function buildLeaderboard(
  data: ReadonlyMap<string, InternalEntry>,
): ModelLeaderboard {
  return {
    record(evaluation, category) {
      const key = `${evaluation.modelId}:${category}`
      const existing = data.get(key)
      const isWin = evaluation.rank === 1

      const updated: InternalEntry = existing
        ? {
            ...existing,
            scores: [...existing.scores, evaluation.overallScore],
            wins: existing.wins + (isWin ? 1 : 0),
            totalGames: existing.totalGames + 1,
            responseTimes: [...existing.responseTimes, evaluation.responseTimeMs],
            tokenCosts: [...existing.tokenCosts, evaluation.tokenCost],
            lastEvaluatedAt: now(),
          }
        : {
            modelId: evaluation.modelId,
            category,
            scores: [evaluation.overallScore],
            wins: isWin ? 1 : 0,
            totalGames: 1,
            responseTimes: [evaluation.responseTimeMs],
            tokenCosts: [evaluation.tokenCost],
            lastEvaluatedAt: now(),
          }

      const newData = new Map(data)
      newData.set(key, updated)
      return buildLeaderboard(newData)
    },

    getTopModels(category, limit = 5) {
      return [...data.values()]
        .filter((e) => e.category === category)
        .map(toLeaderboardEntry)
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, limit)
    },

    getModelProfile(modelId) {
      const entries = [...data.values()].filter((e) => e.modelId === modelId)
      if (entries.length === 0) return undefined

      const allScores = entries.flatMap((e) => e.scores)
      const overallAvgScore = allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0

      // Specializations: categories where model is in top 3
      const specializations = entries
        .filter((entry) => {
          const categoryEntries = [...data.values()]
            .filter((e) => e.category === entry.category)
            .map(toLeaderboardEntry)
            .sort((a, b) => b.averageScore - a.averageScore)
          const rank = categoryEntries.findIndex((e) => e.modelId === modelId) + 1
          return rank <= 3
        })
        .map((e) => e.category)

      return {
        modelId,
        specializations,
        overallAvgScore: Math.round(overallAvgScore * 10) / 10,
        totalEvaluations: entries.reduce((sum, e) => sum + e.totalGames, 0),
      }
    },

    getSpecializations(modelId) {
      const profile = this.getModelProfile(modelId)
      return profile?.specializations ?? []
    },

    shouldRetain(modelId) {
      const profile = this.getModelProfile(modelId)
      if (!profile) return true // Keep untested models
      if (profile.totalEvaluations < 5) return true // Not enough data
      return profile.specializations.length > 0
    },

    getEntries() {
      return [...data.values()].map(toLeaderboardEntry)
    },

    selectCandidates(category, count, options = {}) {
      const { includeChallenger = true, allModelIds = [] } = options

      const topModels = this.getTopModels(category, count)
      const selected = new Set<string>(topModels.map((m) => m.modelId))

      // Add challenger: a model not yet tested in this category
      if (includeChallenger && allModelIds.length > 0) {
        const testedInCategory = new Set(
          [...data.values()]
            .filter((e) => e.category === category)
            .map((e) => e.modelId),
        )
        const challengers = allModelIds.filter(
          (id) => !testedInCategory.has(id) && !selected.has(id),
        )
        if (challengers.length > 0) {
          const randomChallenger = challengers[Math.floor(Math.random() * challengers.length)]!
          selected.add(randomChallenger)
        }
      }

      return [...selected].slice(0, count + 1) // Allow one extra for challenger
    },

    hasExpertForDomain(category, options = {}) {
      const { minEvaluations = 3, minAvgScore = 70 } = options
      const topModels = this.getTopModels(category, 1)

      if (topModels.length === 0) return false

      const topModel = topModels[0]!
      return topModel.totalEvaluations >= minEvaluations && topModel.averageScore >= minAvgScore
    },
  }
}
