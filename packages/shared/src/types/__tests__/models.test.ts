import { describe, it, expect } from 'vitest'
import {
  ModelProviderSchema,
  ModelCapabilitySchema,
  ModelTierSchema,
  ModelRegistryEntrySchema,
} from '../models.js'

describe('ModelProviderSchema', () => {
  const validProviders = [
    'openrouter', 'anthropic', 'openai', 'google',
    'mistral', 'meta', 'deepseek', 'cohere', 'qwen',
  ]

  it.each(validProviders)('accepts "%s"', (provider) => {
    expect(ModelProviderSchema.parse(provider)).toBe(provider)
  })

  it('rejects unknown provider', () => {
    expect(() => ModelProviderSchema.parse('unknown')).toThrow()
  })
})

describe('ModelCapabilitySchema', () => {
  const validCapabilities = [
    'strategy', 'technical-architecture', 'code-generation', 'code-review',
    'market-analysis', 'financial-modeling', 'legal-analysis', 'creative-writing',
    'data-analysis', 'research', 'debate', 'synthesis', 'planning', 'math-reasoning',
  ]

  it.each(validCapabilities)('accepts "%s"', (cap) => {
    expect(ModelCapabilitySchema.parse(cap)).toBe(cap)
  })

  it('rejects unknown capability', () => {
    expect(() => ModelCapabilitySchema.parse('flying')).toThrow()
  })
})

describe('ModelTierSchema', () => {
  it.each(['frontier', 'strong', 'efficient', 'budget'])('accepts "%s"', (tier) => {
    expect(ModelTierSchema.parse(tier)).toBe(tier)
  })

  it('rejects unknown tier', () => {
    expect(() => ModelTierSchema.parse('premium')).toThrow()
  })
})

describe('ModelRegistryEntrySchema', () => {
  const validEntry = {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai' as const,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPerInputToken: 0.000005,
    costPerOutputToken: 0.000015,
    capabilities: ['strategy', 'code-generation'] as const,
    tier: 'frontier' as const,
    active: true,
  }

  it('parses a valid entry', () => {
    const result = ModelRegistryEntrySchema.parse(validEntry)
    expect(result.id).toBe('gpt-4o')
    expect(result.capabilities).toHaveLength(2)
  })

  it('accepts optional avatarUrl', () => {
    const withAvatar = { ...validEntry, avatarUrl: 'https://example.com/avatar.png' }
    expect(ModelRegistryEntrySchema.parse(withAvatar).avatarUrl).toBe('https://example.com/avatar.png')
  })

  it('allows omitting avatarUrl', () => {
    const result = ModelRegistryEntrySchema.parse(validEntry)
    expect(result.avatarUrl).toBeUndefined()
  })

  it('rejects non-positive contextWindow', () => {
    expect(() => ModelRegistryEntrySchema.parse({ ...validEntry, contextWindow: 0 })).toThrow()
    expect(() => ModelRegistryEntrySchema.parse({ ...validEntry, contextWindow: -1 })).toThrow()
  })

  it('rejects non-positive maxOutputTokens', () => {
    expect(() => ModelRegistryEntrySchema.parse({ ...validEntry, maxOutputTokens: 0 })).toThrow()
  })

  it('rejects negative costs', () => {
    expect(() =>
      ModelRegistryEntrySchema.parse({ ...validEntry, costPerInputToken: -0.001 }),
    ).toThrow()
    expect(() =>
      ModelRegistryEntrySchema.parse({ ...validEntry, costPerOutputToken: -0.001 }),
    ).toThrow()
  })

  it('accepts zero costs (free models)', () => {
    const freeModel = { ...validEntry, costPerInputToken: 0, costPerOutputToken: 0 }
    const result = ModelRegistryEntrySchema.parse(freeModel)
    expect(result.costPerInputToken).toBe(0)
  })

  it('rejects non-integer contextWindow', () => {
    expect(() =>
      ModelRegistryEntrySchema.parse({ ...validEntry, contextWindow: 128000.5 }),
    ).toThrow()
  })

  it('rejects invalid capability in array', () => {
    expect(() =>
      ModelRegistryEntrySchema.parse({ ...validEntry, capabilities: ['flying'] }),
    ).toThrow()
  })
})
