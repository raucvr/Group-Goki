import { z } from 'zod'

const EnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default('sqlite://./data/group-goki.db'),
  GATEWAY_PORT: z.coerce.number().int().default(3100),
  WEB_PORT: z.coerce.number().int().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  JUDGE_MODEL_ID: z.string().default('anthropic/claude-sonnet-4'),
  MAX_PARALLEL_MODELS: z.coerce.number().int().min(1).max(20).default(5),
  MAX_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(100),
})

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(env: Record<string, string | undefined> = process.env): Env {
  const result = EnvSchema.safeParse(env)
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `  ${i.path.join('.')}: ${i.message}`,
    )
    throw new Error(`Environment validation failed:\n${issues.join('\n')}`)
  }
  return result.data
}
