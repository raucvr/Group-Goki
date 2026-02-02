/**
 * Model Agent - represents an LLM model as a participant in the group chat.
 * Each agent wraps a model with its personality derived from actual performance data.
 */

import type { ModelLeaderboardEntry } from '@group-goki/shared'

const MIN_SPECIALIZATION_SCORE = 70
const MIN_SPECIALIZATION_EVALUATIONS = 3

export interface ModelAgent {
  readonly modelId: string
  readonly displayName: string
  readonly specializations: readonly string[]
  readonly tier: string
  readonly stats: AgentStats
}

export interface AgentStats {
  readonly averageScore: number
  readonly winRate: number
  readonly totalBattles: number
  readonly trend: string
  readonly bestCategory: string | undefined
}

/**
 * Create a model agent from leaderboard data.
 * The agent's "personality" is entirely data-driven — no role-playing.
 */
export function createModelAgent(
  modelId: string,
  displayName: string,
  tier: string,
  leaderboardEntries: readonly ModelLeaderboardEntry[],
): ModelAgent {
  const myEntries = leaderboardEntries.filter((e) => e.modelId === modelId)

  const totalBattles = myEntries.reduce((sum, e) => sum + e.totalEvaluations, 0)
  const weightedScoreSum = myEntries.reduce(
    (sum, e) => sum + e.averageScore * e.totalEvaluations,
    0,
  )
  const averageScore = totalBattles > 0 ? weightedScoreSum / totalBattles : 0

  const totalWins = myEntries.reduce((sum, e) => sum + e.totalWins, 0)
  const winRate = totalBattles > 0 ? totalWins / totalBattles : 0

  const bestEntry = myEntries.length > 0
    ? myEntries.reduce((best, e) =>
        e.averageScore > best.averageScore ? e : best,
      )
    : undefined

  const specializations = myEntries
    .filter((e) => e.averageScore >= MIN_SPECIALIZATION_SCORE && e.totalEvaluations >= MIN_SPECIALIZATION_EVALUATIONS)
    .map((e) => e.category)

  const trends = myEntries.map((e) => e.trend)
  const overallTrend = trends.includes('improving')
    ? 'improving'
    : trends.includes('declining')
      ? 'declining'
      : 'stable'

  return {
    modelId,
    displayName,
    specializations,
    tier,
    stats: {
      averageScore: Math.round(averageScore * 10) / 10,
      winRate: Math.round(winRate * 1000) / 1000,
      totalBattles,
      trend: overallTrend,
      bestCategory: bestEntry?.category,
    },
  }
}

/**
 * Format agent info for display in chat UI.
 */
export function formatAgentSummary(agent: ModelAgent): string {
  const parts = [
    `**${agent.displayName}** (${agent.tier})`,
  ]

  if (agent.stats.totalBattles > 0) {
    parts.push(
      `Score: ${agent.stats.averageScore} | Win Rate: ${(agent.stats.winRate * 100).toFixed(1)}% | Battles: ${agent.stats.totalBattles}`,
    )
  } else {
    parts.push('No battles yet')
  }

  if (agent.specializations.length > 0) {
    parts.push(`Specializes in: ${agent.specializations.join(', ')}`)
  }

  if (agent.stats.trend !== 'stable') {
    parts.push(`Trend: ${agent.stats.trend}`)
  }

  return parts.join('\n')
}
