import type { ChatMessage } from '@group-goki/shared'
import { createId, now } from '@group-goki/shared'
import type {
  BattleRoyaleOrchestrator,
  BattleRoyaleResult,
  ModelLeaderboard,
  ModelRegistry,
  DebateEngine,
  DebateResult,
  DebateRound,
  GokiRosterService,
  GokiRole,
} from '@group-goki/core'
import type { ConversationManager } from '../conversation/manager.js'
import type { TurnManager, TurnDecision } from '../turns/turn-manager.js'
import {
  parseMentions,
  extractMentionedModelIds,
  parseUnifiedMentions,
  type RoleMention,
} from '../mentions/parser.js'

export interface DiscussionEvent {
  readonly type:
    | 'user_message'
    | 'model_response'
    | 'battle_progress'
    | 'evaluation'
    | 'debate_started'
    | 'goki_response'
    | 'debate_round_complete'
    | 'consensus_reached'
    | 'error'
  readonly message?: ChatMessage
  readonly battleResult?: BattleRoyaleResult
  readonly debateResult?: DebateResult
  readonly debateRound?: DebateRound
  readonly debateSessionId?: string
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
  readonly debateEngine?: DebateEngine
  readonly rosterService?: GokiRosterService
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

      // 2. Get conversation context
      const recentContext = manager.getRecentContext(conversationId, 10)

      // 3. Check if debate mode is enabled
      const rosterAssignments = deps.rosterService
        ? await deps.rosterService.getAllAssignments()
        : undefined
      const useDebateMode =
        deps.debateEngine &&
        deps.rosterService &&
        rosterAssignments &&
        rosterAssignments.size > 0

      // 4. Execute debate mode or fallback to Battle Royale
      if (useDebateMode) {
        return handleDebateMode(
          deps,
          manager,
          conversationId,
          content,
          userMessage,
          recentContext,
          onEvent,
        )
      } else {
        return handleBattleRoyaleMode(
          deps,
          manager,
          conversationId,
          content,
          userMessage,
          recentContext,
          onEvent,
        )
      }
    },
  }
}

async function handleDebateMode(
  deps: DiscussionOrchestratorDeps,
  manager: ConversationManager,
  conversationId: string,
  content: string,
  userMessage: ChatMessage,
  recentContext: readonly { role: string; content: string }[],
  onEvent: (event: DiscussionEvent) => void,
): Promise<ConversationManager> {
  const debateSessionId = createId()

  try {
    // Get roster assignments for participants
    const rosterAssignments = await deps.rosterService!.getAllAssignments()
    const participants = Array.from(rosterAssignments.entries()).map(
      ([role, modelId]: [GokiRole, string]) => ({
        role,
        modelId,
      }),
    )

    // Emit debate started event
    onEvent({
      type: 'debate_started',
      debateSessionId,
    })

    // Initiate debate
    const debateResult = await deps.debateEngine!.initiateDebate(
      conversationId,
      content,
      userMessage.id,
      recentContext,
      (round: DebateRound) => {
        // Add each goki response to conversation manager
        for (const response of round.responses) {
          manager = manager.addMessage(response)
          onEvent({
            type: 'goki_response',
            message: response,
            debateSessionId,
          })
        }

        // Emit round complete event
        onEvent({
          type: 'debate_round_complete',
          debateRound: round,
          debateSessionId,
        })
      },
    )

    // Add final recommendation message
    const recommendationMessage = createChatMessage({
      conversationId,
      role: 'system',
      content: formatDebateRecommendation(debateResult),
      parentMessageId: userMessage.id,
      metadata: {
        type: 'debate_recommendation',
        debateSessionId,
        status: debateResult.status,
        totalRounds: debateResult.totalRounds,
        consensusScore: debateResult.consensusScore,
      },
    })
    manager = manager.addMessage(recommendationMessage)

    // Emit consensus reached event
    onEvent({
      type: 'consensus_reached',
      debateResult,
      debateSessionId,
      message: recommendationMessage,
    })

    return manager
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    onEvent({ type: 'error', error: `Debate failed: ${errorMsg}. Falling back to Battle Royale.` })

    // Fallback to Battle Royale on debate error
    return handleBattleRoyaleMode(
      deps,
      manager,
      conversationId,
      content,
      userMessage,
      recentContext,
      onEvent,
    )
  }
}

async function handleBattleRoyaleMode(
  deps: DiscussionOrchestratorDeps,
  manager: ConversationManager,
  conversationId: string,
  content: string,
  userMessage: ChatMessage,
  recentContext: readonly { role: string; content: string }[],
  onEvent: (event: DiscussionEvent) => void,
): Promise<ConversationManager> {
  // Parse mentions
  const allModelIds = deps.getRegistry().getActive().map((m) => m.id)
  const mentions = parseMentions(content, allModelIds)
  const mentionedIds = extractMentionedModelIds(mentions)

  // Run Battle Royale
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

  // Emit evaluation results
  onEvent({ type: 'evaluation', battleResult })

  // Determine who responds via Turn Manager
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

  // Add winner response as primary message
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

  // Add follow-up responses from other decided models
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

  // Add consensus summary if multiple responses
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

function formatDebateRecommendation(result: DebateResult): string {
  const parts: string[] = []

  parts.push(`## Executive Advisory Team Recommendation`)
  parts.push('')

  // Status
  const statusEmoji = result.status === 'consensus_reached' ? '✅' : '⏱️'
  const statusText =
    result.status === 'consensus_reached'
      ? `Consensus Reached (${Math.round((result.consensusScore ?? 0) * 100)}%)`
      : `Maximum Rounds Reached (${result.totalRounds} rounds)`
  parts.push(`**Status**: ${statusEmoji} ${statusText}`)
  parts.push('')

  // Final recommendation
  parts.push(`**Recommendation**:`)
  parts.push(result.finalRecommendation)
  parts.push('')

  // Areas of agreement
  if (result.areasOfAgreement.length > 0) {
    parts.push(`**Areas of Agreement**:`)
    result.areasOfAgreement.forEach((area: string) => parts.push(`- ${area}`))
    parts.push('')
  }

  // Participants
  const participants = result.rounds
    .flatMap((r: DebateRound) => r.responses.map((resp: ChatMessage) => resp.modelId))
    .filter((id: string | undefined, idx: number, arr: (string | undefined)[]) => arr.indexOf(id) === idx)
  parts.push(`**Participants**: ${participants.join(', ')}`)

  return parts.join('\n')
}
