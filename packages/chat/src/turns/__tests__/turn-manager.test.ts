import { describe, it, expect } from 'vitest'
import { createTurnManager } from '../turn-manager.js'

describe('createTurnManager', () => {
  it('returns mentioned models with highest priority', () => {
    const manager = createTurnManager()
    const context = {
      mentionedModelIds: ['model-a', 'model-b'],
      specialistModelIds: [],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    const mentioned = decisions.filter(d => d.reason === 'mentioned')
    expect(mentioned).toHaveLength(2)
    expect(mentioned[0].priority).toBe(1)
    expect(mentioned[0].modelId).toBe('model-a')
    expect(mentioned[1].priority).toBe(1)
    expect(mentioned[1].modelId).toBe('model-b')
  })

  it('includes battle winner if specified', () => {
    const manager = createTurnManager()
    const context = {
      mentionedModelIds: [],
      battleWinnerModelId: 'winner-model',
      specialistModelIds: [],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    const winner = decisions.find(d => d.reason === 'battle_winner')
    expect(winner).toBeDefined()
    expect(winner?.modelId).toBe('winner-model')
  })

  it('includes specialists when no mentions or winner', () => {
    const manager = createTurnManager()
    const context = {
      mentionedModelIds: [],
      specialistModelIds: ['specialist-1', 'specialist-2'],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    const specialists = decisions.filter(d => d.reason === 'specialist')
    expect(specialists).toHaveLength(2)
  })

  it('respects maxRespondersPerTurn limit', () => {
    const manager = createTurnManager().withConfig({ maxRespondersPerTurn: 2 })
    const context = {
      mentionedModelIds: ['model-a', 'model-b', 'model-c'],
      specialistModelIds: ['specialist-1', 'specialist-2'],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    expect(decisions.length).toBeLessThanOrEqual(2)
  })

  it('includes challenger when score difference exceeds threshold', () => {
    const manager = createTurnManager().withConfig({ followUpThreshold: 10 })
    const context = {
      mentionedModelIds: [],
      battleWinnerModelId: 'winner',
      specialistModelIds: [],
      allEvaluations: [
        { modelId: 'winner', score: 90 },
        { modelId: 'challenger', score: 75 },
      ],
      challengerModelId: 'challenger',
    }

    const decisions = manager.decide(context)

    const challenger = decisions.find(d => d.reason === 'challenger')
    expect(challenger).toBeDefined()
    expect(challenger?.modelId).toBe('challenger')
  })

  it('prioritizes mentions over battle winner', () => {
    const manager = createTurnManager()
    const context = {
      mentionedModelIds: ['mentioned-model'],
      battleWinnerModelId: 'winner-model',
      specialistModelIds: [],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    expect(decisions[0].reason).toBe('mentioned')
    expect(decisions[0].priority).toBe(1)
  })

  it('returns empty array when no models to respond', () => {
    const manager = createTurnManager()
    const context = {
      mentionedModelIds: [],
      specialistModelIds: [],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    expect(decisions).toEqual([])
  })

  it('deduplicates models when mentioned and also specialist', () => {
    const manager = createTurnManager()
    const context = {
      mentionedModelIds: ['model-a'],
      specialistModelIds: ['model-a', 'model-b'],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    const modelAEntries = decisions.filter(d => d.modelId === 'model-a')
    expect(modelAEntries).toHaveLength(1)
    expect(modelAEntries[0].reason).toBe('mentioned')
  })

  it('withConfig returns new manager with updated config', () => {
    const manager1 = createTurnManager()
    const manager2 = manager1.withConfig({ maxRespondersPerTurn: 5 })

    // Create contexts that would return different results based on config
    const context = {
      mentionedModelIds: ['a', 'b', 'c', 'd', 'e'],
      specialistModelIds: [],
      allEvaluations: [],
    }

    const decisions1 = manager1.decide(context)
    const decisions2 = manager2.decide(context)

    expect(decisions1.length).toBe(3) // Default maxRespondersPerTurn
    expect(decisions2.length).toBe(5) // Updated config
  })

  it('returns unique model IDs in decisions', () => {
    const manager = createTurnManager()
    const context = {
      mentionedModelIds: ['model-a'],
      battleWinnerModelId: 'model-a', // Same as mentioned
      specialistModelIds: [],
      allEvaluations: [],
    }

    const decisions = manager.decide(context)

    const modelIds = decisions.map(d => d.modelId)
    const uniqueIds = [...new Set(modelIds)]
    expect(modelIds.length).toBe(uniqueIds.length)
  })
})
