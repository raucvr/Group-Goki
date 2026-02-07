import { describe, it, expect } from 'vitest'
import { parseMentions, extractMentionedModelIds } from '../parser.js'

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
