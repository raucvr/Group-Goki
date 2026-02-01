import { z } from 'zod'
import type { Task, TaskCategory, TaskComplexity } from '@group-goki/shared'
import { createId, now } from '@group-goki/shared'

const AnalysisResponseSchema = z.object({
  category: z.enum([
    'strategy', 'technical', 'market-analysis', 'financial',
    'legal', 'creative', 'research', 'planning', 'general',
  ]),
  complexity: z.enum(['simple', 'moderate', 'complex', 'multi-domain']),
  subtasks: z.array(z.object({
    description: z.string(),
    category: z.enum([
      'strategy', 'technical', 'market-analysis', 'financial',
      'legal', 'creative', 'research', 'planning', 'general',
    ]),
    requiredCapabilities: z.array(z.string()),
    priority: z.number().int().min(1).max(10),
  })).default([]),
})

export function parseAnalysisResponse(
  responseContent: string,
  userMessage: string,
  conversationId: string,
): Task {
  // Extract JSON from potential markdown code blocks
  const jsonStr = extractJson(responseContent)

  try {
    const parsed = AnalysisResponseSchema.parse(JSON.parse(jsonStr))
    const taskId = createId()

    return {
      id: taskId,
      conversationId,
      userMessage,
      category: parsed.category,
      complexity: parsed.complexity,
      subtasks: parsed.subtasks.map((st) => ({
        id: createId(),
        parentTaskId: taskId,
        category: st.category as TaskCategory,
        description: st.description,
        requiredCapabilities: st.requiredCapabilities as any,
        priority: st.priority,
        status: 'pending' as const,
      })),
      status: 'analyzing',
      createdAt: now(),
    }
  } catch {
    // Fallback: treat as general moderate task
    return {
      id: createId(),
      conversationId,
      userMessage,
      category: 'general',
      complexity: 'moderate',
      subtasks: [],
      status: 'analyzing',
      createdAt: now(),
    }
  }
}

function extractJson(text: string): string {
  // Try direct parse first
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed

  // Extract from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch?.[1]) return codeBlockMatch[1].trim()

  // Find first { to last }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  return trimmed
}
