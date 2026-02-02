import type { ChatMessage, EvaluationResult } from '@group-goki/shared'
import type { MemoryManager } from './store.js'
import type { MemorySearchResult } from './types.js'

export interface LookupResult {
  readonly context: string | undefined
  readonly manager: MemoryManager
}

/**
 * Integrates memory system with chat conversations.
 * All methods return updated MemoryManager to maintain immutability.
 */
export interface MemoryIntegrator {
  readonly lookupContext: (query: string) => LookupResult
  readonly learnFromConversation: (
    conversationId: string,
    messages: readonly ChatMessage[],
  ) => MemoryManager
  readonly learnFromEvaluation: (
    evaluation: EvaluationResult,
    taskCategory: string,
  ) => MemoryManager
}

export function createMemoryIntegrator(
  initialManager: MemoryManager,
): MemoryIntegrator {
  return {
    lookupContext(query) {
      const results = initialManager.search(query, 5)
      if (results.length === 0) {
        return { context: undefined, manager: initialManager }
      }

      // Record access for retrieved items, producing a new manager
      let updated = initialManager
      for (const result of results) {
        updated = updated.recordAccess(result.item.id)
      }

      return { context: formatMemoryContext(results), manager: updated }
    },

    learnFromConversation(conversationId, messages) {
      let manager = initialManager

      // Extract key insights from conversation
      const modelMessages = messages.filter((m) => m.role === 'model')
      if (modelMessages.length === 0) return manager

      // Find or create conversation category
      const store = manager.getStore()
      let conversationCategory = [...store.categories.values()].find(
        (c) => c.name === 'conversations',
      )

      if (!conversationCategory) {
        const result = manager.createCategory('conversations', 'Knowledge from group chat discussions')
        manager = result.manager
        conversationCategory = result.category
      }

      // Summarize the conversation as a memory item
      const userMessages = messages.filter((m) => m.role === 'user')
      const topic = userMessages[0]?.content.slice(0, 100) ?? 'Unknown topic'
      const topScoreMessage = modelMessages.reduce(
        (best, m) => (m.evaluationScore ?? 0) > (best.evaluationScore ?? 0) ? m : best,
      )

      const summary = [
        `Topic: ${topic}`,
        `Best response by: ${topScoreMessage.modelId ?? 'unknown'}`,
        `Key insight: ${topScoreMessage.content.slice(0, 300)}`,
      ].join('\n')

      const importance = calculateConversationImportance(messages)
      const { manager: updated, item } = manager.addItem(
        conversationCategory.id,
        summary,
        importance,
      )

      // Add conversation as resource
      const { manager: withResource } = updated.addResource(
        item.id,
        'conversation',
        conversationId,
        messages.map((m) => `[${m.role}${m.modelId ? `:${m.modelId}` : ''}] ${m.content.slice(0, 200)}`).join('\n'),
      )

      return withResource
    },

    learnFromEvaluation(evaluation, taskCategory) {
      let manager = initialManager

      const store = manager.getStore()
      let evalCategory = [...store.categories.values()].find(
        (c) => c.name === 'model-performance',
      )

      if (!evalCategory) {
        const result = manager.createCategory('model-performance', 'Model evaluation results and specializations')
        manager = result.manager
        evalCategory = result.category
      }

      const summary = [
        `Model: ${evaluation.modelId}`,
        `Category: ${taskCategory}`,
        `Score: ${evaluation.overallScore}/100 (Rank ${evaluation.rank}/${evaluation.totalCompetitors})`,
        evaluation.strengthSummary ? `Strengths: ${evaluation.strengthSummary}` : '',
        evaluation.weaknessSummary ? `Weaknesses: ${evaluation.weaknessSummary}` : '',
      ].filter(Boolean).join('\n')

      const importance = evaluation.overallScore / 100
      const { manager: updated, item } = manager.addItem(
        evalCategory.id,
        summary,
        importance,
      )

      const { manager: withResource } = updated.addResource(
        item.id,
        'evaluation',
        evaluation.id,
        JSON.stringify(evaluation.criteria),
      )

      return withResource
    },
  }
}

function formatMemoryContext(results: readonly MemorySearchResult[]): string {
  return results.map((r) => [
    `[${r.category.name}] (relevance: ${r.relevanceScore.toFixed(1)})`,
    r.item.content,
  ].join('\n')).join('\n\n')
}

function calculateConversationImportance(messages: readonly ChatMessage[]): number {
  let score = 0.3 // Base importance

  // More messages = more important conversation
  score += Math.min(messages.length * 0.05, 0.3)

  // Higher evaluation scores = more important
  const evalScores = messages
    .filter((m) => m.evaluationScore !== undefined)
    .map((m) => m.evaluationScore!)
  if (evalScores.length > 0) {
    const avgScore = evalScores.reduce((a, b) => a + b, 0) / evalScores.length
    score += (avgScore / 100) * 0.3
  }

  return Math.min(score, 1.0)
}
