import type { Task } from '@group-goki/shared'
import type { ModelRouter } from '../router/model-router.js'
import { buildAnalysisPrompt } from './prompts.js'
import { parseAnalysisResponse } from './parser.js'

export interface TaskAnalyzer {
  readonly analyze: (
    userMessage: string,
    conversationId: string,
    conversationContext?: readonly { role: string; content: string }[],
  ) => Promise<Task>
}

export function createTaskAnalyzer(
  router: ModelRouter,
  analyzerModelId: string = 'anthropic/claude-sonnet-4',
): TaskAnalyzer {
  return {
    async analyze(userMessage, conversationId, conversationContext = []) {
      const prompt = buildAnalysisPrompt(userMessage, conversationContext)

      try {
        const response = await router.route({
          modelId: analyzerModelId,
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2000,
          temperature: 0.3,
        })

        return parseAnalysisResponse(response.content, userMessage, conversationId)
      } catch (error) {
        // Fallback: create a general task without analysis
        const { createId, now } = await import('@group-goki/shared')
        return {
          id: createId(),
          conversationId,
          userMessage,
          category: 'general' as const,
          complexity: 'moderate' as const,
          subtasks: [],
          status: 'analyzing' as const,
          createdAt: now(),
        }
      }
    },
  }
}
