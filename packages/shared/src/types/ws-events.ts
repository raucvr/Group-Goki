import { z } from 'zod'
import { ChatMessageSchema } from './messages.js'
import { EvaluationResultSchema } from './evaluation.js'

// Client -> Server events
export const WsAuthSchema = z.object({
  type: z.literal('auth'),
  token: z.string(),
})

export const WsSendMessageSchema = z.object({
  type: z.literal('send_message'),
  conversationId: z.string(),
  content: z.string().min(1).max(50000),
})

export const WsSubscribeSchema = z.object({
  type: z.literal('subscribe'),
  conversationId: z.string(),
})

export const WsUnsubscribeSchema = z.object({
  type: z.literal('unsubscribe'),
  conversationId: z.string(),
})

export const WsIncomingEventSchema = z.discriminatedUnion('type', [
  WsAuthSchema,
  WsSendMessageSchema,
  WsSubscribeSchema,
  WsUnsubscribeSchema,
])
export type WsIncomingEvent = z.infer<typeof WsIncomingEventSchema>

// Server -> Client events
export const BattleRoyalePhaseSchema = z.enum([
  'analyzing',
  'competing',
  'judging',
  'discussing',
  'complete',
])
export type BattleRoyalePhase = z.infer<typeof BattleRoyalePhaseSchema>

export const WsMessageEventSchema = z.object({
  type: z.literal('message'),
  message: ChatMessageSchema,
})

export const WsStreamEventSchema = z.object({
  type: z.literal('message_stream'),
  conversationId: z.string(),
  modelId: z.string(),
  delta: z.string(),
  done: z.boolean(),
})

export const WsBattleProgressSchema = z.object({
  type: z.literal('battle_royale_progress'),
  conversationId: z.string(),
  phase: BattleRoyalePhaseSchema,
  detail: z.string(),
  candidateModels: z.array(z.string()).optional(),
})

export const WsEvaluationResultSchema = z.object({
  type: z.literal('evaluation_result'),
  conversationId: z.string(),
  evaluations: z.array(EvaluationResultSchema),
  winnerModelId: z.string(),
  consensus: z.string().optional(),
  divergences: z.string().optional(),
})

export const WsAuthenticatedEventSchema = z.object({
  type: z.literal('authenticated'),
  userId: z.string(),
})

// Debate events
export const WsDebateStartedSchema = z.object({
  type: z.literal('debate_started'),
  conversationId: z.string(),
  debateSessionId: z.string(),
  participants: z.array(
    z.object({
      role: z.enum(['strategy', 'tech', 'product', 'execution']),
      modelId: z.string(),
    }),
  ),
  maxRounds: z.number(),
})

export const WsGokiResponseSchema = z.object({
  type: z.literal('goki_response'),
  conversationId: z.string(),
  debateSessionId: z.string(),
  role: z.enum(['strategy', 'tech', 'product', 'execution']),
  modelId: z.string(),
  message: ChatMessageSchema,
  roundNumber: z.number(),
})

export const WsDebateRoundCompleteSchema = z.object({
  type: z.literal('debate_round_complete'),
  conversationId: z.string(),
  debateSessionId: z.string(),
  roundNumber: z.number(),
  consensusScore: z.number().optional(),
})

export const WsConsensusReachedSchema = z.object({
  type: z.literal('consensus_reached'),
  conversationId: z.string(),
  debateSessionId: z.string(),
  totalRounds: z.number(),
  consensusScore: z.number(),
  finalRecommendation: z.string(),
  areasOfAgreement: z.array(z.string()),
})

export const WsErrorEventSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  conversationId: z.string().optional(),
})

export const WsOutgoingEventSchema = z.discriminatedUnion('type', [
  WsAuthenticatedEventSchema,
  WsMessageEventSchema,
  WsStreamEventSchema,
  WsBattleProgressSchema,
  WsEvaluationResultSchema,
  WsDebateStartedSchema,
  WsGokiResponseSchema,
  WsDebateRoundCompleteSchema,
  WsConsensusReachedSchema,
  WsErrorEventSchema,
])
export type WsOutgoingEvent = z.infer<typeof WsOutgoingEventSchema>
