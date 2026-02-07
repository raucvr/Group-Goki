import { describe, it, expect } from 'vitest'
import { loadEnv } from '../env.js'

describe('loadEnv', () => {
  it('loads valid environment variables', () => {
    const env = {
      OPENROUTER_API_KEY: 'test-key',
      DATABASE_URL: 'sqlite://./test.db',
      GATEWAY_PORT: '3100',
      WEB_PORT: '3000',
      NODE_ENV: 'development' as const,
      LOG_LEVEL: 'info' as const,
      JUDGE_MODEL_ID: 'claude-sonnet-4',
      MAX_PARALLEL_MODELS: '5',
      MAX_MONTHLY_BUDGET_USD: '100',
    }

    const result = loadEnv(env)

    expect(result.OPENROUTER_API_KEY).toBe('test-key')
    expect(result.DATABASE_URL).toBe('sqlite://./test.db')
    expect(result.GATEWAY_PORT).toBe(3100)
    expect(result.WEB_PORT).toBe(3000)
    expect(result.NODE_ENV).toBe('development')
    expect(result.LOG_LEVEL).toBe('info')
    expect(result.JUDGE_MODEL_ID).toBe('claude-sonnet-4')
    expect(result.MAX_PARALLEL_MODELS).toBe(5)
    expect(result.MAX_MONTHLY_BUDGET_USD).toBe(100)
  })

  it('uses default values when optional variables are missing', () => {
    const env = {
      OPENROUTER_API_KEY: 'test-key',
    }

    const result = loadEnv(env)

    expect(result.DATABASE_URL).toBe('sqlite://./data/group-goki.db')
    expect(result.GATEWAY_PORT).toBe(3100)
    expect(result.WEB_PORT).toBe(3000)
    expect(result.NODE_ENV).toBe('development')
    expect(result.LOG_LEVEL).toBe('info')
    expect(result.JUDGE_MODEL_ID).toBe('anthropic/claude-sonnet-4')
    expect(result.MAX_PARALLEL_MODELS).toBe(5)
    expect(result.MAX_MONTHLY_BUDGET_USD).toBe(100)
  })

  it('throws error when OPENROUTER_API_KEY is missing', () => {
    const env = {}

    expect(() => loadEnv(env)).toThrow('OPENROUTER_API_KEY')
  })

  it('throws error when OPENROUTER_API_KEY is empty', () => {
    const env = {
      OPENROUTER_API_KEY: '',
    }

    expect(() => loadEnv(env)).toThrow('OPENROUTER_API_KEY')
  })

  it('validates NODE_ENV enum values', () => {
    const validEnvs = ['development', 'production', 'test'] as const

    for (const nodeEnv of validEnvs) {
      const result = loadEnv({
        OPENROUTER_API_KEY: 'key',
        NODE_ENV: nodeEnv,
      })
      expect(result.NODE_ENV).toBe(nodeEnv)
    }
  })

  it('throws error for invalid NODE_ENV', () => {
    const env = {
      OPENROUTER_API_KEY: 'key',
      NODE_ENV: 'staging',
    }

    expect(() => loadEnv(env)).toThrow()
  })

  it('validates LOG_LEVEL enum values', () => {
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error'] as const

    for (const level of validLevels) {
      const result = loadEnv({
        OPENROUTER_API_KEY: 'key',
        LOG_LEVEL: level,
      })
      expect(result.LOG_LEVEL).toBe(level)
    }
  })

  it('validates numeric constraints for MAX_PARALLEL_MODELS', () => {
    expect(() =>
      loadEnv({
        OPENROUTER_API_KEY: 'key',
        MAX_PARALLEL_MODELS: '0',
      }),
    ).toThrow()

    expect(() =>
      loadEnv({
        OPENROUTER_API_KEY: 'key',
        MAX_PARALLEL_MODELS: '21',
      }),
    ).toThrow()

    const result = loadEnv({
      OPENROUTER_API_KEY: 'key',
      MAX_PARALLEL_MODELS: '10',
    })
    expect(result.MAX_PARALLEL_MODELS).toBe(10)
  })

  it('validates positive MAX_MONTHLY_BUDGET_USD', () => {
    expect(() =>
      loadEnv({
        OPENROUTER_API_KEY: 'key',
        MAX_MONTHLY_BUDGET_USD: '0',
      }),
    ).toThrow()

    expect(() =>
      loadEnv({
        OPENROUTER_API_KEY: 'key',
        MAX_MONTHLY_BUDGET_USD: '-10',
      }),
    ).toThrow()
  })
})
