import type { Mention } from '@group-goki/shared'

/**
 * Parse @model mentions from user input text.
 * Supports formats like @claude, @gpt-4o, @anthropic/claude-sonnet-4
 */
export function parseMentions(
  text: string,
  knownModelIds: readonly string[],
): readonly Mention[] {
  const mentions: Mention[] = []
  // Match @word patterns (allowing / and -)
  const mentionRegex = /@([\w/.-]+)/g
  let match: RegExpExecArray | null

  while ((match = mentionRegex.exec(text)) !== null) {
    const raw = match[1]!
    const startIndex = match.index
    const endIndex = startIndex + match[0].length

    // Try exact match first
    const exactMatch = knownModelIds.find(
      (id) => id.toLowerCase() === raw.toLowerCase(),
    )
    if (exactMatch) {
      mentions.push({ modelId: exactMatch, startIndex, endIndex })
      continue
    }

    // Try partial match (e.g., @claude matches anthropic/claude-sonnet-4)
    const partialMatch = knownModelIds.find((id) => {
      const parts = id.split('/')
      const modelName = parts[parts.length - 1] ?? ''
      return modelName.toLowerCase().startsWith(raw.toLowerCase())
    })
    if (partialMatch) {
      mentions.push({ modelId: partialMatch, startIndex, endIndex })
    }
  }

  return mentions
}

/**
 * Extract unique model IDs from mentions.
 */
export function extractMentionedModelIds(
  mentions: readonly Mention[],
): readonly string[] {
  return [...new Set(mentions.map((m) => m.modelId))]
}

/**
 * Strip mention syntax from text, leaving just the readable content.
 */
export function stripMentions(text: string): string {
  return text.replace(/@[\w/.-]+/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Check if a specific model is mentioned.
 */
export function isModelMentioned(
  mentions: readonly Mention[],
  modelId: string,
): boolean {
  return mentions.some((m) => m.modelId === modelId)
}
