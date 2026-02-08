import type { ChatMessage } from '@group-goki/shared'
import { createId, now } from '@group-goki/shared'
import type {
  ModelRegistry,
  DebateEngine,
  DebateResult,
  DebateRound,
  GokiRosterService,
  GokiRole,
  ModelRouter,
} from '@group-goki/core'
import type { ConversationManager } from '../conversation/manager.js'

export interface DiscussionEvent {
  readonly type:
    | 'user_message'
    | 'model_response'
    | 'debate_started'
    | 'goki_response'
    | 'debate_round_complete'
    | 'consensus_reached'
    | 'error'
  readonly message?: ChatMessage
  readonly debateResult?: DebateResult
  readonly debateRound?: DebateRound
  readonly debateSessionId?: string
  readonly conversationId?: string
  readonly participants?: readonly { role: GokiRole; modelId: string }[]
  readonly maxRounds?: number
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
  readonly getRegistry: () => ModelRegistry
  readonly debateEngine?: DebateEngine
  readonly rosterService?: GokiRosterService
  readonly router?: ModelRouter
  readonly defaultModelId?: string
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

      // 3. Check if debate mode is enabled (gokis configured)
      const rosterAssignments = deps.rosterService
        ? await deps.rosterService.getAllAssignments()
        : undefined
      const useDebateMode =
        deps.debateEngine &&
        deps.rosterService &&
        rosterAssignments &&
        rosterAssignments.size > 0

      // 4. Execute debate mode or fallback to single-model response
      if (useDebateMode) {
        return handleDebateMode(
          deps,
          manager,
          conversationId,
          content,
          userMessage,
          recentContext,
          rosterAssignments!,
          onEvent,
        )
      } else {
        return handleSingleModelResponse(
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
  rosterAssignments: ReadonlyMap<GokiRole, string>,
  onEvent: (event: DiscussionEvent) => void,
): Promise<ConversationManager> {
  const debateSessionId = createId()

  try {
    // Build participant list from roster
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
      conversationId,
      participants,
      maxRounds: 5,
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
    onEvent({ type: 'error', error: `Debate failed: ${errorMsg}. Using single model.` })

    // Fallback to single model response on debate error
    return handleSingleModelResponse(
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

/**
 * Simple single-model response when no gokis are configured.
 * Uses the default model to respond directly.
 */
async function handleSingleModelResponse(
  deps: DiscussionOrchestratorDeps,
  manager: ConversationManager,
  conversationId: string,
  content: string,
  userMessage: ChatMessage,
  recentContext: readonly { role: string; content: string }[],
  onEvent: (event: DiscussionEvent) => void,
): Promise<ConversationManager> {
  // Get default model
  const modelId = deps.defaultModelId ?? 'anthropic/claude-sonnet-4'

  // If no router, return error
  if (!deps.router) {
    onEvent({ type: 'error', error: 'No model router configured. Please configure goki roster.' })
    return manager
  }

  try {
    const provider = deps.router.getProvider(modelId)
    if (!provider) {
      onEvent({ type: 'error', error: `No provider found for model: ${modelId}` })
      return manager
    }

    // Build messages for completion
    const messages = [
      ...recentContext.map((ctx) => ({
        role: ctx.role as 'user' | 'assistant',
        content: ctx.content,
      })),
      { role: 'user' as const, content },
    ]

    const result = await provider.complete({
      modelId,
      messages,
      maxTokens: 4096,
      temperature: 0.7,
    })

    // Add response message
    const responseMessage = createChatMessage({
      conversationId,
      role: 'model',
      modelId,
      content: result.content,
      parentMessageId: userMessage.id,
    })
    manager = manager.addMessage(responseMessage)
    onEvent({ type: 'model_response', message: responseMessage })

    return manager
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    onEvent({ type: 'error', error: `Model response failed: ${errorMsg}` })
    return manager
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

function formatDebateRecommendation(result: DebateResult): string {
  const parts: string[] = []

  parts.push(`## Goki Discussion Summary`)
  parts.push('')

  // Status
  const statusText =
    result.status === 'consensus_reached'
      ? `Consensus Reached (${Math.round((result.consensusScore ?? 0) * 100)}%)`
      : `Discussion Complete (${result.totalRounds} rounds)`
  parts.push(`**Status**: ${statusText}`)
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
  const participants = [
    ...new Set(
      result.rounds
        .flatMap((r: DebateRound) => r.responses.map((resp: ChatMessage) => resp.modelId))
        .filter((id): id is string => id !== undefined),
    ),
  ]
  parts.push(`**Participants**: ${participants.join(', ')}`)

  return parts.join('\n')
}
