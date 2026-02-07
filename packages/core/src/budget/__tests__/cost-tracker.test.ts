import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCostTracker } from '../cost-tracker.js'
import type { CompletionResponse } from '../../router/provider-adapter.js'
import type { ModelRegistryEntry } from '@group-goki/shared'

const createMockResponse = (overrides: Partial<CompletionResponse> = {}): CompletionResponse => ({
  modelId: 'gpt-4o',
  content: 'Test response',
  inputTokens: 100,
  outputTokens: 50,
  responseTimeMs: 1000,
  finishReason: 'stop',
  ...overrides,
})

const createMockModel = (overrides: Partial<ModelRegistryEntry> = {}): ModelRegistryEntry => ({
  id: 'gpt-4o',
  name: 'GPT-4o',
  provider: 'openai',
  contextWindow: 128000,
  maxOutputTokens: 4096,
  costPerInputToken: 0.000005,
  costPerOutputToken: 0.000015,
  capabilities: [],
  tier: 'frontier',
  active: true,
  ...overrides,
})

describe('createCostTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates empty tracker when no records provided', () => {
    const tracker = createCostTracker()

    expect(tracker.getTotalCostUsd()).toBe(0)
    expect(tracker.getRecords()).toEqual([])
    expect(tracker.isWithinBudget(100)).toBe(true)
  })

  it('records cost correctly', () => {
    const tracker = createCostTracker()
    const response = createMockResponse({ inputTokens: 1000, outputTokens: 500 })
    const model = createMockModel({ costPerInputToken: 0.001, costPerOutputToken: 0.002 })

    const newTracker = tracker.record(response, model)

    // Cost = 1000 * 0.001 + 500 * 0.002 = 1 + 1 = 2
    expect(newTracker.getTotalCostUsd()).toBe(2)
    expect(tracker.getTotalCostUsd()).toBe(0)
  })

  it('calculates cost for free models', () => {
    const tracker = createCostTracker()
    const response = createMockResponse({ inputTokens: 1000, outputTokens: 500 })
    const freeModel = createMockModel({ costPerInputToken: 0, costPerOutputToken: 0 })

    const newTracker = tracker.record(response, freeModel)

    expect(newTracker.getTotalCostUsd()).toBe(0)
  })

  it('accumulates multiple records', () => {
    let tracker = createCostTracker()
    const model = createMockModel()

    tracker = tracker.record(createMockResponse({ inputTokens: 100, outputTokens: 50 }), model)
    tracker = tracker.record(createMockResponse({ inputTokens: 200, outputTokens: 100 }), model)
    tracker = tracker.record(createMockResponse({ inputTokens: 300, outputTokens: 150 }), model)

    // Each: input * 0.000005 + output * 0.000015
    // 1: 100*0.000005 + 50*0.000015 = 0.0005 + 0.00075 = 0.00125
    // 2: 200*0.000005 + 100*0.000015 = 0.001 + 0.0015 = 0.0025
    // 3: 300*0.000005 + 150*0.000015 = 0.0015 + 0.00225 = 0.00375
    // Total: 0.0075
    expect(tracker.getTotalCostUsd()).toBeCloseTo(0.0075, 6)
  })

  it('gets cost by model', () => {
    let tracker = createCostTracker()
    const model1 = createMockModel({ id: 'model-1', costPerInputToken: 0.001, costPerOutputToken: 0.002 })
    const model2 = createMockModel({ id: 'model-2', costPerInputToken: 0.0005, costPerOutputToken: 0.001 })

    tracker = tracker.record(createMockResponse({ modelId: 'model-1', inputTokens: 100, outputTokens: 50 }), model1)
    tracker = tracker.record(createMockResponse({ modelId: 'model-2', inputTokens: 200, outputTokens: 100 }), model2)

    // model-1: 100*0.001 + 50*0.002 = 0.1 + 0.1 = 0.2
    expect(tracker.getCostByModel('model-1')).toBe(0.2)
    // model-2: 200*0.0005 + 100*0.001 = 0.1 + 0.1 = 0.2
    expect(tracker.getCostByModel('model-2')).toBe(0.2)
    expect(tracker.getCostByModel('non-existent')).toBe(0)
  })

  it('returns top spenders', () => {
    let tracker = createCostTracker()
    const expensiveModel = createMockModel({ id: 'expensive', costPerInputToken: 0.01, costPerOutputToken: 0.02 })
    const cheapModel = createMockModel({ id: 'cheap', costPerInputToken: 0.0001, costPerOutputToken: 0.0002 })

    tracker = tracker.record(createMockResponse({ modelId: 'expensive', inputTokens: 100, outputTokens: 50 }), expensiveModel)
    tracker = tracker.record(createMockResponse({ modelId: 'cheap', inputTokens: 1000, outputTokens: 500 }), cheapModel)
    tracker = tracker.record(createMockResponse({ modelId: 'expensive', inputTokens: 200, outputTokens: 100 }), expensiveModel)

    const topSpenders = tracker.getTopSpenders(2)

    expect(topSpenders).toHaveLength(2)
    expect(topSpenders[0].modelId).toBe('expensive')
    expect(topSpenders[0].totalCost).toBeGreaterThan(topSpenders[1].totalCost)
  })

  it('checks if within budget', () => {
    let tracker = createCostTracker()
    const model = createMockModel({ costPerInputToken: 0.01, costPerOutputToken: 0.02 })

    expect(tracker.isWithinBudget(1)).toBe(true)

    tracker = tracker.record(createMockResponse({ inputTokens: 100, outputTokens: 50 }), model)
    // Cost: 100*0.01 + 50*0.02 = 1 + 1 = 2

    expect(tracker.isWithinBudget(3)).toBe(true)
    expect(tracker.isWithinBudget(2)).toBe(false)
    expect(tracker.isWithinBudget(1)).toBe(false)
  })

  it('calculates monthly spend correctly', () => {
    let tracker = createCostTracker()
    const model = createMockModel()

    // Record in current month
    tracker = tracker.record(createMockResponse(), model)

    expect(tracker.getMonthlySpendUsd()).toBeGreaterThan(0)

    // Create tracker with old record
    const oldTracker = createCostTracker([{
      modelId: 'old-model',
      inputTokens: 1000,
      outputTokens: 500,
      costUsd: 10,
      timestamp: '2024-01-01T00:00:00.000Z', // Previous year
    }])

    expect(oldTracker.getMonthlySpendUsd()).toBe(0)
  })

  it('preserves all record fields', () => {
    const tracker = createCostTracker()
    const response = createMockResponse({ modelId: 'test-model', inputTokens: 100, outputTokens: 50 })
    const model = createMockModel({ id: 'test-model' })

    const newTracker = tracker.record(response, model)
    const records = newTracker.getRecords()

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      modelId: 'test-model',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: expect.any(Number),
      timestamp: expect.any(String),
    })
  })
})
