import type { ChatMessage } from '@group-goki/shared'

export interface DiscussionPromptContext {
  readonly userMessage: string
  readonly taskCategory: string
  readonly taskComplexity: string
  readonly conversationHistory: readonly ChatMessage[]
  readonly otherResponses: readonly { modelId: string; content: string }[]
  readonly isFollowUp: boolean
  readonly memoryContext?: string
}

/**
 * Build the system prompt for a model participating in discussion.
 */
export function buildDiscussionSystemPrompt(context: DiscussionPromptContext): string {
  const parts: string[] = [
    'You are an expert AI assistant participating in a group discussion.',
    `Task domain: ${context.taskCategory} (${context.taskComplexity} complexity).`,
    '',
    'Guidelines:',
    '- Provide direct, actionable responses',
    '- Be specific with recommendations and reasoning',
    '- Use structured formatting for complex analysis',
    '- If you disagree with another response, explain why with evidence',
    '- Focus entirely on helping with the task at hand',
  ]

  if (context.isFollowUp && context.otherResponses.length > 0) {
    parts.push('')
    parts.push('Previous responses from other models in this discussion:')
    for (const response of context.otherResponses) {
      parts.push(`--- ${response.modelId} ---`)
      parts.push(response.content.slice(0, 2000))
      parts.push('---')
    }
    parts.push('')
    parts.push('Your role in this follow-up:')
    parts.push('- Add complementary insights not already covered')
    parts.push('- Correct any inaccuracies you notice')
    parts.push('- Provide alternative perspectives if relevant')
    parts.push('- Do NOT simply repeat what was already said')
  }

  if (context.memoryContext) {
    parts.push('')
    parts.push('Relevant context from previous conversations:')
    parts.push(context.memoryContext)
  }

  return parts.join('\n')
}

/**
 * Build the user message with conversation history context.
 */
export function buildDiscussionUserMessage(
  userMessage: string,
  recentHistory: readonly { role: string; content: string }[],
): string {
  if (recentHistory.length === 0) return userMessage

  const historyParts = recentHistory.slice(-5).map(
    (m) => `[${m.role}]: ${m.content.slice(0, 500)}`,
  )

  return [
    'Recent conversation context:',
    ...historyParts,
    '',
    'Current message:',
    userMessage,
  ].join('\n')
}
