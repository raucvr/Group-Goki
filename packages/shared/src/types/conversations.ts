import { z } from 'zod'

export const ConversationStatusSchema = z.enum(['active', 'archived'])
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: ConversationStatusSchema,
  messageCount: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Conversation = z.infer<typeof ConversationSchema>
