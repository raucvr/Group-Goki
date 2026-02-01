/**
 * Turn Manager for free discussion mode.
 *
 * In free discussion, models don't take strict turns.
 * Instead, the system decides which models should respond based on:
 * - Direct mentions (highest priority)
 * - Topic relevance / model specialization
 * - Battle Royale results (winner always responds)
 * - "Follow-up" mode: other models can add to the discussion
 */

export type TurnReason =
  | 'mentioned'
  | 'battle_winner'
  | 'specialist'
  | 'follow_up'
  | 'challenger'

export interface TurnDecision {
  readonly modelId: string
  readonly reason: TurnReason
  readonly priority: number // 1 = highest
}

export interface TurnManagerConfig {
  readonly maxRespondersPerTurn: number
  readonly enableFollowUp: boolean
  readonly followUpThreshold: number // Min score difference to trigger follow-up
}

export interface TurnManager {
  readonly decide: (context: TurnContext) => readonly TurnDecision[]
  readonly withConfig: (config: Partial<TurnManagerConfig>) => TurnManager
}

export interface TurnContext {
  readonly mentionedModelIds: readonly string[]
  readonly battleWinnerModelId?: string
  readonly specialistModelIds: readonly string[]
  readonly allEvaluations: readonly { modelId: string; score: number }[]
  readonly challengerModelId?: string
}

const DEFAULT_CONFIG: TurnManagerConfig = {
  maxRespondersPerTurn: 3,
  enableFollowUp: true,
  followUpThreshold: 15,
}

export function createTurnManager(
  config: Partial<TurnManagerConfig> = {},
): TurnManager {
  const resolvedConfig: TurnManagerConfig = { ...DEFAULT_CONFIG, ...config }

  return {
    decide(context) {
      const decisions: TurnDecision[] = []
      const alreadySelected = new Set<string>()

      // Priority 1: Directly mentioned models
      for (const modelId of context.mentionedModelIds) {
        if (!alreadySelected.has(modelId)) {
          decisions.push({ modelId, reason: 'mentioned', priority: 1 })
          alreadySelected.add(modelId)
        }
      }

      // Priority 2: Battle Royale winner
      if (context.battleWinnerModelId && !alreadySelected.has(context.battleWinnerModelId)) {
        decisions.push({
          modelId: context.battleWinnerModelId,
          reason: 'battle_winner',
          priority: 2,
        })
        alreadySelected.add(context.battleWinnerModelId)
      }

      // Priority 3: Topic specialists
      for (const modelId of context.specialistModelIds) {
        if (!alreadySelected.has(modelId)) {
          decisions.push({ modelId, reason: 'specialist', priority: 3 })
          alreadySelected.add(modelId)
        }
      }

      // Priority 4: Follow-up from strong performers
      if (resolvedConfig.enableFollowUp && context.allEvaluations.length > 1) {
        const sorted = [...context.allEvaluations].sort((a, b) => b.score - a.score)
        const topScore = sorted[0]?.score ?? 0

        for (const evaluation of sorted) {
          if (alreadySelected.has(evaluation.modelId)) continue
          if (topScore - evaluation.score <= resolvedConfig.followUpThreshold) {
            decisions.push({
              modelId: evaluation.modelId,
              reason: 'follow_up',
              priority: 4,
            })
            alreadySelected.add(evaluation.modelId)
          }
        }
      }

      // Priority 5: Challenger slot
      if (context.challengerModelId && !alreadySelected.has(context.challengerModelId)) {
        decisions.push({
          modelId: context.challengerModelId,
          reason: 'challenger',
          priority: 5,
        })
        alreadySelected.add(context.challengerModelId)
      }

      // Sort by priority and limit
      return decisions
        .sort((a, b) => a.priority - b.priority)
        .slice(0, resolvedConfig.maxRespondersPerTurn)
    },

    withConfig(newConfig) {
      return createTurnManager({ ...resolvedConfig, ...newConfig })
    },
  }
}
