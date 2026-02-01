import { z } from 'zod'

export const ModelProviderSchema = z.enum([
  'openrouter',
  'anthropic',
  'openai',
  'google',
  'mistral',
  'meta',
  'deepseek',
  'cohere',
  'qwen',
])
export type ModelProvider = z.infer<typeof ModelProviderSchema>

export const ModelCapabilitySchema = z.enum([
  'strategy',
  'technical-architecture',
  'code-generation',
  'code-review',
  'market-analysis',
  'financial-modeling',
  'legal-analysis',
  'creative-writing',
  'data-analysis',
  'research',
  'debate',
  'synthesis',
  'planning',
  'math-reasoning',
])
export type ModelCapability = z.infer<typeof ModelCapabilitySchema>

export const ModelTierSchema = z.enum(['frontier', 'strong', 'efficient', 'budget'])
export type ModelTier = z.infer<typeof ModelTierSchema>

export const ModelRegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ModelProviderSchema,
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  costPerInputToken: z.number().nonnegative(),
  costPerOutputToken: z.number().nonnegative(),
  capabilities: z.array(ModelCapabilitySchema),
  tier: ModelTierSchema,
  active: z.boolean(),
  avatarUrl: z.string().optional(),
})
export type ModelRegistryEntry = z.infer<typeof ModelRegistryEntrySchema>
