import { z } from 'zod'
import type { EvaluationResult, Task } from '@group-goki/shared'
import { createId, now } from '@group-goki/shared'
import type { CompletionResponse } from '../router/provider-adapter.js'
import type { ModelRouter } from '../router/model-router.js'
import { buildJudgePrompt } from './judge-prompts.js'

const JudgeResponseSchema = z.object({
  evaluations: z.array(z.object({
    responseIndex: z.number().int().nonnegative(),
    overallScore: z.number().min(0).max(100),
    criteria: z.array(z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      reasoning: z.string(),
    })),
    strengthSummary: z.string().optional(),
    weaknessSummary: z.string().optional(),
  })),
  consensus: z.string().optional(),
  divergences: z.string().optional(),
})

export interface JudgeResult {
  readonly evaluations: readonly EvaluationResult[]
  readonly consensus: string
  readonly divergences: string
}

export interface JudgeEngine {
  readonly evaluate: (
    task: Task,
    responses: readonly CompletionResponse[],
    options?: { readonly judgeModelId?: string },
  ) => Promise<JudgeResult>
}

export function createJudgeEngine(router: ModelRouter): JudgeEngine {
  return {
    async evaluate(task, responses, options = {}) {
      const judgeModelId = options.judgeModelId ?? 'anthropic/claude-sonnet-4'

      if (responses.length === 0) {
        return { evaluations: [], consensus: '', divergences: '' }
      }

      if (responses.length === 1) {
        // Single response: give it a default score of 75
        const response = responses[0]!
        return {
          evaluations: [{
            id: createId(),
            taskId: task.id,
            modelId: response.modelId,
            judgeModelId,
            overallScore: 75,
            criteria: [
              { name: 'accuracy', score: 75, reasoning: 'Single response, no comparison available' },
              { name: 'depth', score: 75, reasoning: 'Single response, no comparison available' },
              { name: 'actionability', score: 75, reasoning: 'Single response, no comparison available' },
              { name: 'clarity', score: 75, reasoning: 'Single response, no comparison available' },
              { name: 'creativity', score: 75, reasoning: 'Single response, no comparison available' },
              { name: 'relevance', score: 75, reasoning: 'Single response, no comparison available' },
            ],
            rank: 1,
            totalCompetitors: 1,
            responseTimeMs: response.responseTimeMs,
            tokenCost: 0,
            createdAt: now(),
          }],
          consensus: response.content.slice(0, 200),
          divergences: '',
        }
      }

      const prompt = buildJudgePrompt(task, responses)

      try {
        const judgeResponse = await router.route({
          modelId: judgeModelId,
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 4000,
          temperature: 0.2,
        })

        return parseJudgeResponse(
          judgeResponse.content,
          task,
          responses,
          judgeModelId,
          judgeResponse.inputTokens * 0.000003 + judgeResponse.outputTokens * 0.000015,
        )
      } catch (error) {
        // Fallback: score by response time (faster = higher score)
        const sorted = [...responses].sort((a, b) => a.responseTimeMs - b.responseTimeMs)
        const evaluations: EvaluationResult[] = sorted.map((r, i) => ({
          id: createId(),
          taskId: task.id,
          modelId: r.modelId,
          judgeModelId: 'fallback',
          overallScore: 80 - i * 10,
          criteria: [],
          rank: i + 1,
          totalCompetitors: responses.length,
          responseTimeMs: r.responseTimeMs,
          tokenCost: 0,
          createdAt: now(),
        }))

        return { evaluations, consensus: '', divergences: '' }
      }
    },
  }
}

function parseJudgeResponse(
  content: string,
  task: Task,
  responses: readonly CompletionResponse[],
  judgeModelId: string,
  judgeCost: number,
): JudgeResult {
  const jsonStr = extractJson(content)

  try {
    const parsed = JudgeResponseSchema.parse(JSON.parse(jsonStr))

    // Sort by overall score descending to assign ranks
    const sortedEvals = [...parsed.evaluations].sort(
      (a, b) => b.overallScore - a.overallScore,
    )

    const evaluations: EvaluationResult[] = sortedEvals.map((ev, rank) => {
      const response = responses[ev.responseIndex]
      if (!response) {
        throw new Error(`Invalid response index: ${ev.responseIndex}`)
      }

      return {
        id: createId(),
        taskId: task.id,
        modelId: response.modelId,
        judgeModelId,
        overallScore: ev.overallScore,
        criteria: ev.criteria,
        rank: rank + 1,
        totalCompetitors: responses.length,
        responseTimeMs: response.responseTimeMs,
        tokenCost: judgeCost / responses.length,
        strengthSummary: ev.strengthSummary,
        weaknessSummary: ev.weaknessSummary,
        createdAt: now(),
      }
    })

    return {
      evaluations,
      consensus: parsed.consensus ?? '',
      divergences: parsed.divergences ?? '',
    }
  } catch {
    // Fallback
    const evaluations: EvaluationResult[] = responses.map((r, i) => ({
      id: createId(),
      taskId: task.id,
      modelId: r.modelId,
      judgeModelId: 'fallback',
      overallScore: 70,
      criteria: [],
      rank: i + 1,
      totalCompetitors: responses.length,
      responseTimeMs: r.responseTimeMs,
      tokenCost: 0,
      createdAt: now(),
    }))

    return { evaluations, consensus: '', divergences: '' }
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch?.[1]) return codeBlockMatch[1].trim()

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  return trimmed
}
