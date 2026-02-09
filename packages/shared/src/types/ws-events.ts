import { z } from 'zod'
import { ChatMessageSchema } from './messages.js'

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

export const WsAuthenticatedEventSchema = z.object({
  type: z.literal('authenticated'),
  userId: z.string(),
})

// Debate events (simplified to match DiscussionEvent)
export const GokiRoleSchema = z.enum(['strategy', 'tech', 'product', 'execution'])
export type GokiRole = z.infer<typeof GokiRoleSchema>

export const WsDebateStartedSchema = z.object({
  type: z.literal('debate_started'),
  conversationId: z.string(),
  debateSessionId: z.string().optional(),
  participants: z.array(
    z.object({
      role: GokiRoleSchema,
      modelId: z.string(),
    }),
  ).optional(),
  maxRounds: z.number().optional(),
})

export const WsGokiResponseSchema = z.object({
  type: z.literal('goki_response'),
  message: ChatMessageSchema,
  debateSessionId: z.string().optional(),
})

export const WsDebateRoundCompleteSchema = z.object({
  type: z.literal('debate_round_complete'),
  conversationId: z.string(),
  debateSessionId: z.string().optional(),
  debateRound: z.unknown().optional(), // Accept any DebateRound shape
})

export const WsConsensusReachedSchema = z.object({
  type: z.literal('consensus_reached'),
  conversationId: z.string(),
  debateSessionId: z.string().optional(),
  debateResult: z.unknown().optional(), // Accept any DebateResult shape
  message: ChatMessageSchema,
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
  WsDebateStartedSchema,
  WsGokiResponseSchema,
  WsDebateRoundCompleteSchema,
  WsConsensusReachedSchema,
  WsErrorEventSchema,
])
export type WsOutgoingEvent = z.infer<typeof WsOutgoingEventSchema>
