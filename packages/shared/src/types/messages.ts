import { z } from 'zod'

export const ChatRoleSchema = z.enum(['user', 'model', 'system', 'judge'])
export type ChatRole = z.infer<typeof ChatRoleSchema>

export const MentionSchema = z.object({
  modelId: z.string(),
  startIndex: z.number().int().nonnegative(),
  endIndex: z.number().int().nonnegative(),
})
export type Mention = z.infer<typeof MentionSchema>

export const ChatMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: ChatRoleSchema,
  modelId: z.string().optional(),
  content: z.string(),
  mentions: z.array(MentionSchema).default([]),
  parentMessageId: z.string().optional(),
  evaluationScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string(),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>
