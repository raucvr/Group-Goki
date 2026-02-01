import type { Task, EvaluationResult } from '@group-goki/shared'
import type { CompletionResponse } from '../router/provider-adapter.js'
import type { TaskAnalyzer } from '../task-analyzer/analyzer.js'
import type { ParallelRunner } from './parallel-runner.js'
import type { JudgeEngine } from './judge.js'
import type { ModelLeaderboard } from './leaderboard.js'
import type { ModelRegistry } from '../router/model-registry.js'

export interface BattleRoyaleResult {
  readonly task: Task
  readonly winnerModelId: string
  readonly winnerResponse: string
  readonly allEvaluations: readonly EvaluationResult[]
  readonly allResponses: readonly CompletionResponse[]
  readonly consensus: string
  readonly divergences: string
  readonly totalTimeMs: number
}

export interface BattleRoyaleOptions {
  readonly candidateCount?: number
  readonly skipBattle?: boolean
  readonly timeoutMs?: number
  readonly onProgress?: (phase: string, detail: string, models?: readonly string[]) => void
}

export interface BattleRoyaleOrchestrator {
  readonly execute: (
    userMessage: string,
    conversationId: string,
    conversationContext: readonly { role: string; content: string }[],
    options?: BattleRoyaleOptions,
  ) => Promise<BattleRoyaleResult>
}

export function createBattleRoyaleOrchestrator(deps: {
  readonly taskAnalyzer: TaskAnalyzer
  readonly parallelRunner: ParallelRunner
  readonly judge: JudgeEngine
  readonly leaderboard: ModelLeaderboard
  readonly registry: ModelRegistry
  readonly onLeaderboardUpdate?: (leaderboard: ModelLeaderboard) => void
}): BattleRoyaleOrchestrator {
  let currentLeaderboard = deps.leaderboard

  return {
    async execute(userMessage, conversationId, conversationContext, options = {}) {
      const {
        candidateCount = 3,
        skipBattle = false,
        timeoutMs = 90000,
        onProgress,
      } = options
      const startTime = Date.now()

      // Phase 1: Analyze the task
      onProgress?.('analyzing', 'Classifying task and identifying required capabilities...')
      const task = await deps.taskAnalyzer.analyze(
        userMessage,
        conversationId,
        conversationContext,
      )

      // Phase 2: Select candidate models
      const allActiveIds = deps.registry.getActive().map((m) => m.id)
      const candidates = currentLeaderboard.selectCandidates(
        task.category,
        candidateCount,
        { includeChallenger: true, allModelIds: allActiveIds },
      )

      // If simple task or skip battle, route to top model
      if (skipBattle || task.complexity === 'simple') {
        const topModelId = candidates[0] ?? allActiveIds[0]
        if (!topModelId) {
          throw new Error('No models available')
        }

        onProgress?.('competing', `Routing to top model: ${topModelId}`)
        const result = await deps.parallelRunner.run(
          {
            messages: [
              ...conversationContext.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage },
            ],
            maxTokens: 4000,
            temperature: 0.7,
            systemPrompt: buildCompetitionPrompt(task),
          },
          [topModelId],
          { timeoutMs },
        )

        const response = result.successful[0]
        if (!response) {
          throw new Error(`Model ${topModelId} failed to respond`)
        }

        return {
          task: { ...task, status: 'complete' as const },
          winnerModelId: topModelId,
          winnerResponse: response.content,
          allEvaluations: [],
          allResponses: [response],
          consensus: response.content.slice(0, 200),
          divergences: '',
          totalTimeMs: Date.now() - startTime,
        }
      }

      // Phase 3: Run candidates in parallel
      onProgress?.('competing', `${candidates.length} models competing...`, candidates)
      const runResult = await deps.parallelRunner.run(
        {
          messages: [
            ...conversationContext.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          maxTokens: 4000,
          temperature: 0.7,
          systemPrompt: buildCompetitionPrompt(task),
        },
        candidates,
        {
          timeoutMs,
          onProgress: (modelId, status) => {
            onProgress?.('competing', `${modelId}: ${status}`, candidates)
          },
        },
      )

      if (runResult.successful.length === 0) {
        throw new Error('All models failed to respond')
      }

      // Phase 4: Judge the responses
      onProgress?.('judging', `Evaluating ${runResult.successful.length} responses...`)
      const judgeResult = await deps.judge.evaluate(task, runResult.successful)

      // Phase 5: Update leaderboard
      for (const evaluation of judgeResult.evaluations) {
        currentLeaderboard = currentLeaderboard.record(evaluation, task.category)
      }
      deps.onLeaderboardUpdate?.(currentLeaderboard)

      // Find winner
      const winner = judgeResult.evaluations.reduce((best, e) =>
        e.overallScore > best.overallScore ? e : best,
      )
      const winnerResponse = runResult.successful.find(
        (r) => r.modelId === winner.modelId,
      )

      if (!winnerResponse) {
        throw new Error('Winner response not found')
      }

      return {
        task: { ...task, status: 'complete' as const },
        winnerModelId: winner.modelId,
        winnerResponse: winnerResponse.content,
        allEvaluations: judgeResult.evaluations,
        allResponses: runResult.successful,
        consensus: judgeResult.consensus,
        divergences: judgeResult.divergences,
        totalTimeMs: Date.now() - startTime,
      }
    },
  }
}

function buildCompetitionPrompt(task: Task): string {
  return `You are an expert AI participating in a competitive evaluation. Provide the highest quality response possible.

Task Category: ${task.category}
Complexity: ${task.complexity}

Guidelines:
- Be thorough but concise
- Provide specific, actionable insights
- Use structured formatting for complex analyses
- Back claims with reasoning
- Do NOT mention that you are competing or being evaluated
- Focus entirely on helping the user with their request`
}
