import type { ChatMessage } from '@group-goki/shared'
import { createId, now } from '@group-goki/shared'
import type {
  BattleRoyaleOrchestrator,
  BattleRoyaleResult,
  ModelLeaderboard,
  ModelRegistry,
} from '@group-goki/core'
import type { ConversationManager } from '../conversation/manager.js'
import type { TurnManager, TurnDecision } from '../turns/turn-manager.js'
import { parseMentions, extractMentionedModelIds } from '../mentions/parser.js'

export interface DiscussionEvent {
  readonly type: 'user_message' | 'model_response' | 'battle_progress' | 'evaluation' | 'error'
  readonly message?: ChatMessage
  readonly battleResult?: BattleRoyaleResult
  readonly phase?: string
  readonly detail?: string
  readonly error?: string
}

export interface DiscussionOrchestrator {
  readonly handleUserMessage: (
    conversationId: string,
    content: string,
    onEvent: (event: DiscussionEvent) => void,
  ) => Promise<ConversationManager>
}

export interface DiscussionOrchestratorDeps {
  readonly getConversationManager: () => ConversationManager
  readonly battleRoyale: BattleRoyaleOrchestrator
  readonly turnManager: TurnManager
  readonly getLeaderboard: () => ModelLeaderboard
  readonly getRegistry: () => ModelRegistry
  readonly memoryLookup?: (query: string) => Promise<string | undefined>
}

export function createDiscussionOrchestrator(
  deps: DiscussionOrchestratorDeps,
): DiscussionOrchestrator {
  return {
    async handleUserMessage(conversationId, content, onEvent) {
      let manager = deps.getConversationManager()

      // 1. Store user message
      const userMessage = createChatMessage({
        conversationId,
        role: 'user',
        content,
      })
      manager = manager.addMessage(userMessage)
      onEvent({ type: 'user_message', message: userMessage })

      // 2. Parse mentions
      const allModelIds = deps.getRegistry().getActive().map((m) => m.id)
      const mentions = parseMentions(content, allModelIds)
      const mentionedIds = extractMentionedModelIds(mentions)

      // 3. Get conversation context
      const recentContext = manager.getRecentContext(conversationId, 10)

      // 4. Run Battle Royale
      let battleResult: BattleRoyaleResult
      try {
        battleResult = await deps.battleRoyale.execute(
          content,
          conversationId,
          recentContext,
          {
            onProgress: (phase, detail, models) => {
              onEvent({ type: 'battle_progress', phase, detail })
            },
          },
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        onEvent({ type: 'error', error: errorMsg })
        return manager
      }

      // 5. Emit evaluation results
      onEvent({ type: 'evaluation', battleResult })

      // 6. Determine who responds via Turn Manager
      const specialistIds = getSpecialists(
        deps.getLeaderboard(),
        battleResult.task.category,
      )

      const decisions = deps.turnManager.decide({
        mentionedModelIds: mentionedIds,
        battleWinnerModelId: battleResult.winnerModelId,
        specialistModelIds: specialistIds,
        allEvaluations: battleResult.allEvaluations.map((e) => ({
          modelId: e.modelId,
          score: e.overallScore,
        })),
      })

      // 7. Add winner response as primary message
      const winnerMessage = createChatMessage({
        conversationId,
        role: 'model',
        modelId: battleResult.winnerModelId,
        content: battleResult.winnerResponse,
        parentMessageId: userMessage.id,
        evaluationScore: battleResult.allEvaluations.find(
          (e) => e.modelId === battleResult.winnerModelId,
        )?.overallScore,
        mentions,
      })
      manager = manager.addMessage(winnerMessage)
      onEvent({ type: 'model_response', message: winnerMessage })

      // 8. Add follow-up responses from other decided models
      const followUpDecisions = decisions.filter(
        (d) => d.modelId !== battleResult.winnerModelId,
      )

      for (const decision of followUpDecisions) {
        const followUpResponse = battleResult.allResponses.find(
          (r) => r.modelId === decision.modelId,
        )
        if (!followUpResponse) continue

        const followUpMessage = createChatMessage({
          conversationId,
          role: 'model',
          modelId: decision.modelId,
          content: followUpResponse.content,
          parentMessageId: userMessage.id,
          evaluationScore: battleResult.allEvaluations.find(
            (e) => e.modelId === decision.modelId,
          )?.overallScore,
          metadata: { turnReason: decision.reason },
        })
        manager = manager.addMessage(followUpMessage)
        onEvent({ type: 'model_response', message: followUpMessage })
      }

      // 9. Add consensus summary if multiple responses
      if (battleResult.consensus && battleResult.allResponses.length > 1) {
        const consensusMessage = createChatMessage({
          conversationId,
          role: 'system',
          content: formatConsensus(battleResult),
          parentMessageId: userMessage.id,
          metadata: { type: 'consensus_summary' },
        })
        manager = manager.addMessage(consensusMessage)
        onEvent({ type: 'model_response', message: consensusMessage })
      }

      return manager
    },
  }
}

function createChatMessage(params: {
  conversationId: string
  role: 'user' | 'model' | 'system' | 'judge'
  content: string
  modelId?: string
  parentMessageId?: string
  evaluationScore?: number
  mentions?: readonly { modelId: string; startIndex: number; endIndex: number }[]
  metadata?: Record<string, unknown>
}): ChatMessage {
  return {
    id: createId(),
    conversationId: params.conversationId,
    role: params.role,
    modelId: params.modelId,
    content: params.content,
    mentions: params.mentions ? [...params.mentions] : [],
    parentMessageId: params.parentMessageId,
    evaluationScore: params.evaluationScore,
    metadata: params.metadata ?? {},
    createdAt: now(),
  }
}

const TOP_SPECIALIST_COUNT = 3

function getSpecialists(
  leaderboard: ModelLeaderboard,
  category: string,
): readonly string[] {
  return leaderboard
    .getTopModels(category, TOP_SPECIALIST_COUNT)
    .map((m) => m.modelId)
}

function formatConsensus(result: BattleRoyaleResult): string {
  const parts: string[] = []

  if (result.consensus) {
    parts.push(`**Consensus**: ${result.consensus}`)
  }
  if (result.divergences) {
    parts.push(`**Divergences**: ${result.divergences}`)
  }

  const rankings = [...result.allEvaluations]
    .sort((a, b) => a.rank - b.rank)
    .map((e) => `${e.rank}. ${e.modelId} (${e.overallScore}/100)`)

  if (rankings.length > 0) {
    parts.push(`**Rankings**: ${rankings.join(' | ')}`)
  }

  return parts.join('\n\n')
}
