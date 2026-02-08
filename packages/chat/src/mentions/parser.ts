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

/**
 * Goki role mentions (@strategy, @tech, @product, @execution).
 */
export type RoleMention = 'strategy' | 'tech' | 'product' | 'execution'

/**
 * Parse @role mentions (strategy, tech, product, execution).
 * Returns matched roles.
 */
export function parseRoleMentions(text: string): readonly RoleMention[] {
  const roles: RoleMention[] = []
  const roleRegex = /@(strategy|tech|product|execution)\b/gi
  let match: RegExpExecArray | null

  while ((match = roleRegex.exec(text)) !== null) {
    const role = match[1]!.toLowerCase() as RoleMention
    if (!roles.includes(role)) {
      roles.push(role)
    }
  }

  return roles
}

/**
 * Parse both @model and @role mentions.
 * Returns unified mention list with modelIds resolved from roles.
 */
export function parseUnifiedMentions(
  text: string,
  knownModelIds: readonly string[],
  roleToModelMap: ReadonlyMap<RoleMention, string>,
): readonly Mention[] {
  const modelMentions = parseMentions(text, knownModelIds)
  const roleMentions = parseRoleMentions(text)

  // Convert role mentions to model mentions
  const roleModelMentions: Mention[] = []
  for (const role of roleMentions) {
    const modelId = roleToModelMap.get(role)
    if (modelId) {
      // Find position of @role in text (approximate)
      const rolePattern = new RegExp(`@${role}\\b`, 'i')
      const match = rolePattern.exec(text)
      if (match) {
        roleModelMentions.push({
          modelId,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }
  }

  // Merge and deduplicate
  const allMentions = [...modelMentions, ...roleModelMentions]
  const seen = new Set<string>()
  return allMentions.filter((m) => {
    if (seen.has(m.modelId)) return false
    seen.add(m.modelId)
    return true
  })
}
