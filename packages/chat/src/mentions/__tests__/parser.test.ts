import { describe, it, expect } from 'vitest'
import {
  parseMentions,
  extractMentionedModelIds,
  stripMentions,
  isModelMentioned,
  parseRoleMentions,
  parseUnifiedMentions,
} from '../parser.js'

describe('parseMentions', () => {
  const knownModelIds = [
    'anthropic/claude-sonnet-4',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'google/gemini-pro',
    'mistral/mistral-large',
  ]

  it('returns empty array for text without mentions', () => {
    const result = parseMentions('Hello world', knownModelIds)
    expect(result).toEqual([])
  })

  it('parses model mentions correctly', () => {
    const result = parseMentions('Hey @claude, help me', knownModelIds)

    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('is case insensitive', () => {
    const result = parseMentions('Hey @CLAUDE and @GPT-4O', knownModelIds)

    expect(result).toHaveLength(2)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
    expect(result[1].modelId).toBe('openai/gpt-4o')
  })

  it('ignores unknown mentions', () => {
    const result = parseMentions('Hey @unknown-model and @claude', knownModelIds)

    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('handles mentions at start of text', () => {
    const result = parseMentions('@claude help me', knownModelIds)

    expect(result).toHaveLength(1)
    expect(result[0].startIndex).toBe(0)
  })

  it('handles consecutive mentions', () => {
    const result = parseMentions('@claude @gpt-4o', knownModelIds)

    expect(result).toHaveLength(2)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
    expect(result[1].modelId).toBe('openai/gpt-4o')
  })

  it('returns empty array when no known models', () => {
    const result = parseMentions('Hey @claude', [])
    expect(result).toEqual([])
  })

  it('handles empty text', () => {
    const result = parseMentions('', knownModelIds)
    expect(result).toEqual([])
  })

  it('handles multiple mentions of same model', () => {
    const result = parseMentions('@claude and then @claude again', knownModelIds)

    expect(result).toHaveLength(2)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
    expect(result[1].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('handles mentions with special characters in model names', () => {
    const result = parseMentions('Hey @mistral/mistral-large', knownModelIds)

    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('mistral/mistral-large')
  })

  it('handles mention at end of text', () => {
    const result = parseMentions('Please help @claude', knownModelIds)

    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
  })
})

describe('extractMentionedModelIds', () => {
  it('extracts unique model IDs from mentions', () => {
    const mentions = [
      { modelId: 'model-a', startIndex: 0, endIndex: 7 },
      { modelId: 'model-b', startIndex: 8, endIndex: 15 },
    ]

    const result = extractMentionedModelIds(mentions)

    expect(result).toEqual(['model-a', 'model-b'])
  })

  it('removes duplicates', () => {
    const mentions = [
      { modelId: 'model-a', startIndex: 0, endIndex: 7 },
      { modelId: 'model-a', startIndex: 8, endIndex: 15 },
      { modelId: 'model-b', startIndex: 16, endIndex: 23 },
    ]

    const result = extractMentionedModelIds(mentions)

    expect(result).toEqual(['model-a', 'model-b'])
  })

  it('returns empty array for empty mentions', () => {
    const result = extractMentionedModelIds([])
    expect(result).toEqual([])
  })
})

describe('stripMentions', () => {
  it('removes @model mentions from text', () => {
    const result = stripMentions('Hey @claude, help me with @gpt-4o')
    expect(result).toBe('Hey , help me with')
  })

  it('cleans up excess whitespace', () => {
    const result = stripMentions('@claude   help   me')
    expect(result).toBe('help me')
  })

  it('returns unchanged text when no mentions', () => {
    const result = stripMentions('Hello world')
    expect(result).toBe('Hello world')
  })

  it('handles empty text', () => {
    const result = stripMentions('')
    expect(result).toBe('')
  })

  it('handles text with only mentions', () => {
    const result = stripMentions('@claude @gpt-4o')
    expect(result).toBe('')
  })
})

describe('isModelMentioned', () => {
  it('returns true when model is mentioned', () => {
    const mentions = [
      { modelId: 'model-a', startIndex: 0, endIndex: 7 },
      { modelId: 'model-b', startIndex: 8, endIndex: 15 },
    ]
    expect(isModelMentioned(mentions, 'model-a')).toBe(true)
  })

  it('returns false when model not mentioned', () => {
    const mentions = [
      { modelId: 'model-a', startIndex: 0, endIndex: 7 },
    ]
    expect(isModelMentioned(mentions, 'model-b')).toBe(false)
  })

  it('returns false for empty mentions array', () => {
    expect(isModelMentioned([], 'model-a')).toBe(false)
  })
})

describe('parseRoleMentions', () => {
  it('parses @strategy mention', () => {
    const result = parseRoleMentions('Ask @strategy for advice')
    expect(result).toEqual(['strategy'])
  })

  it('parses @tech mention', () => {
    const result = parseRoleMentions('Ask @tech for implementation')
    expect(result).toEqual(['tech'])
  })

  it('parses @product mention', () => {
    const result = parseRoleMentions('Ask @product for roadmap')
    expect(result).toEqual(['product'])
  })

  it('parses @execution mention', () => {
    const result = parseRoleMentions('Ask @execution for plan')
    expect(result).toEqual(['execution'])
  })

  it('parses multiple role mentions', () => {
    const result = parseRoleMentions('@strategy @tech @product @execution')
    expect(result).toEqual(['strategy', 'tech', 'product', 'execution'])
  })

  it('deduplicates repeated role mentions', () => {
    const result = parseRoleMentions('@strategy and @strategy again')
    expect(result).toEqual(['strategy'])
  })

  it('is case-insensitive', () => {
    const result = parseRoleMentions('@STRATEGY @Tech @PRODUCT')
    expect(result).toEqual(['strategy', 'tech', 'product'])
  })

  it('returns empty array when no role mentions', () => {
    const result = parseRoleMentions('Hello world')
    expect(result).toEqual([])
  })

  it('ignores non-role @ mentions', () => {
    const result = parseRoleMentions('@claude @unknown @strategy')
    expect(result).toEqual(['strategy'])
  })
})

describe('parseUnifiedMentions', () => {
  const knownModelIds = [
    'anthropic/claude-sonnet-4',
    'openai/gpt-4o',
    'google/gemini-pro',
  ]

  const roleToModelMap = new Map<'strategy' | 'tech' | 'product' | 'execution', string>([
    ['strategy', 'anthropic/claude-sonnet-4'],
    ['tech', 'openai/gpt-4o'],
    ['product', 'google/gemini-pro'],
    ['execution', 'anthropic/claude-sonnet-4'],
  ])

  it('parses model mentions', () => {
    const result = parseUnifiedMentions('@claude help me', knownModelIds, roleToModelMap)
    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('parses role mentions and maps to model IDs', () => {
    const result = parseUnifiedMentions('@strategy help me', knownModelIds, roleToModelMap)
    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('parses both model and role mentions', () => {
    const result = parseUnifiedMentions('@claude and @tech together', knownModelIds, roleToModelMap)
    expect(result).toHaveLength(2)
    expect(result.map(m => m.modelId)).toContain('anthropic/claude-sonnet-4')
    expect(result.map(m => m.modelId)).toContain('openai/gpt-4o')
  })

  it('deduplicates when role and model map to same ID', () => {
    const result = parseUnifiedMentions('@claude @strategy', knownModelIds, roleToModelMap)
    // Both map to claude-sonnet-4, should only appear once
    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('handles missing role mappings gracefully', () => {
    const emptyMap = new Map<'strategy' | 'tech' | 'product' | 'execution', string>()
    const result = parseUnifiedMentions('@strategy @claude', knownModelIds, emptyMap)
    // Only the model mention should be included, not the unmapped role
    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('anthropic/claude-sonnet-4')
  })

  it('returns empty array when no mentions', () => {
    const result = parseUnifiedMentions('Hello world', knownModelIds, roleToModelMap)
    expect(result).toEqual([])
  })

  it('includes correct position info for mentions', () => {
    const result = parseUnifiedMentions('@tech help', knownModelIds, roleToModelMap)
    expect(result[0].startIndex).toBe(0)
    expect(result[0].endIndex).toBe(5) // @tech is 5 chars
  })
})
