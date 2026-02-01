import type { CompletionResponse } from '../router/provider-adapter.js'
import type { ModelRegistryEntry } from '@group-goki/shared'
import { now } from '@group-goki/shared'

export interface CostRecord {
  readonly modelId: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly costUsd: number
  readonly timestamp: string
}

export interface CostTracker {
  readonly record: (response: CompletionResponse, model: ModelRegistryEntry) => CostTracker
  readonly getTotalCostUsd: () => number
  readonly getMonthlySpendUsd: () => number
  readonly getCostByModel: (modelId: string) => number
  readonly isWithinBudget: (maxMonthlyUsd: number) => boolean
  readonly getRecords: () => readonly CostRecord[]
  readonly getTopSpenders: (limit: number) => readonly { modelId: string; totalCost: number }[]
}

function getMonthStart(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function createCostTracker(
  existingRecords: readonly CostRecord[] = [],
): CostTracker {
  const records = existingRecords

  return {
    record(response, model) {
      const costUsd =
        response.inputTokens * model.costPerInputToken +
        response.outputTokens * model.costPerOutputToken

      const newRecord: CostRecord = {
        modelId: response.modelId,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd,
        timestamp: now(),
      }

      return createCostTracker([...records, newRecord])
    },

    getTotalCostUsd() {
      return records.reduce((sum, r) => sum + r.costUsd, 0)
    },

    getMonthlySpendUsd() {
      const monthStart = getMonthStart().toISOString()
      return records
        .filter((r) => r.timestamp >= monthStart)
        .reduce((sum, r) => sum + r.costUsd, 0)
    },

    getCostByModel(modelId) {
      return records
        .filter((r) => r.modelId === modelId)
        .reduce((sum, r) => sum + r.costUsd, 0)
    },

    isWithinBudget(maxMonthlyUsd) {
      return this.getMonthlySpendUsd() < maxMonthlyUsd
    },

    getRecords() {
      return records
    },

    getTopSpenders(limit) {
      const byModel = new Map<string, number>()
      for (const r of records) {
        byModel.set(r.modelId, (byModel.get(r.modelId) ?? 0) + r.costUsd)
      }
      return [...byModel.entries()]
        .map(([modelId, totalCost]) => ({ modelId, totalCost }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, limit)
    },
  }
}
