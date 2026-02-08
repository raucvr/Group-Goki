import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDebateEngine } from '../debate-engine.js'
import type { ModelRouter } from '../../router/model-router.js'
import type { GokiRosterService } from '../../goki-roster/roster-service.js'
import type { ConsensusDetector, ConsensusResult } from '../consensus-detector.js'

describe('createDebateEngine', () => {
  let mockRouter: ModelRouter
  let mockRosterService: GokiRosterService
  let mockConsensusDetector: ConsensusDetector

  beforeEach(() => {
    mockRouter = {
      route: vi.fn(),
      routeParallel: vi.fn(),
      getProvider: vi.fn().mockReturnValue({
        complete: vi.fn().mockResolvedValue({
          content: 'Test goki response',
        }),
      }),
    }

    mockRosterService = {
      getSpecialistForRole: vi.fn()
        .mockResolvedValueOnce('strategy-model')
        .mockResolvedValueOnce('tech-model')
        .mockResolvedValueOnce('product-model')
        .mockResolvedValueOnce('execution-model'),
      assignModelToRole: vi.fn(),
      autoAssignRoles: vi.fn(),
      getAllAssignments: vi.fn(),
      removeRole: vi.fn(),
    }

    mockConsensusDetector = {
      detect: vi.fn().mockResolvedValue({
        hasConsensus: true,
        consensusScore: 0.9,
        reasoning: 'All gokis agree',
        areasOfAgreement: ['Use microservices'],
        areasOfDisagreement: [],
      } as ConsensusResult),
    }
  })

  it('completes single round debate when consensus reached immediately', async () => {
    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 5,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech', 'product', 'execution'],
      },
    })

    const result = await engine.initiateDebate(
      'conv-1',
      'Should we use microservices?',
      'user-msg-1',
      [],
    )

    expect(result.status).toBe('consensus_reached')
    expect(result.totalRounds).toBe(2) // Round 1 skips consensus check, consensus detected in round 2
    expect(result.consensusScore).toBe(0.9)
    expect(result.areasOfAgreement).toContain('Use microservices')
  })

  it('runs multiple rounds until consensus', async () => {
    let callCount = 0
    mockConsensusDetector.detect = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        return Promise.resolve({
          hasConsensus: false,
          consensusScore: 0.5,
          reasoning: 'Still debating',
          areasOfAgreement: [],
          areasOfDisagreement: ['Architecture choice'],
        })
      }
      return Promise.resolve({
        hasConsensus: true,
        consensusScore: 0.85,
        reasoning: 'Reached agreement',
        areasOfAgreement: ['Use microservices'],
        areasOfDisagreement: [],
      })
    })

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 5,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech', 'product', 'execution'],
      },
    })

    const result = await engine.initiateDebate(
      'conv-1',
      'Architecture decision',
      'user-msg-1',
      [],
    )

    expect(result.status).toBe('consensus_reached')
    expect(result.totalRounds).toBe(4) // Consensus check starts at round 2, so need round 4 (3 checks total)
    expect(result.consensusScore).toBe(0.85)
  })

  it('stops at max rounds when consensus not reached', async () => {
    mockConsensusDetector.detect = vi.fn().mockResolvedValue({
      hasConsensus: false,
      consensusScore: 0.6,
      reasoning: 'Fundamental disagreement',
      areasOfAgreement: ['Need scalability'],
      areasOfDisagreement: ['Monolith vs microservices'],
    })

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 3,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech', 'product', 'execution'],
      },
    })

    const result = await engine.initiateDebate(
      'conv-1',
      'Architecture decision',
      'user-msg-1',
      [],
    )

    expect(result.status).toBe('max_rounds_exceeded')
    expect(result.totalRounds).toBe(3)
    expect(result.consensusScore).toBe(0.6)
  })

  it('calls each goki in turn order', async () => {
    const completeMock = vi.fn().mockResolvedValue({
      content: 'Goki response',
    })

    mockRouter.getProvider = vi.fn().mockReturnValue({
      complete: completeMock,
    })

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 1,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech', 'product', 'execution'],
      },
    })

    await engine.initiateDebate('conv-1', 'Test question', 'user-msg-1', [])

    // Should call getSpecialistForRole 4 times (once per role)
    expect(mockRosterService.getSpecialistForRole).toHaveBeenCalledTimes(4)
    expect(mockRosterService.getSpecialistForRole).toHaveBeenCalledWith('strategy')
    expect(mockRosterService.getSpecialistForRole).toHaveBeenCalledWith('tech')
    expect(mockRosterService.getSpecialistForRole).toHaveBeenCalledWith('product')
    expect(mockRosterService.getSpecialistForRole).toHaveBeenCalledWith('execution')
  })

  it('invokes onRoundComplete callback for each round', async () => {
    const onRoundComplete = vi.fn()

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 2,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech', 'product', 'execution'],
      },
    })

    mockConsensusDetector.detect = vi.fn()
      .mockResolvedValueOnce({
        hasConsensus: false,
        consensusScore: 0.5,
        reasoning: 'Need more discussion',
        areasOfAgreement: [],
        areasOfDisagreement: ['Approach'],
      })
      .mockResolvedValueOnce({
        hasConsensus: true,
        consensusScore: 0.9,
        reasoning: 'Agreement reached',
        areasOfAgreement: ['Final decision'],
        areasOfDisagreement: [],
      })

    await engine.initiateDebate(
      'conv-1',
      'Test question',
      'user-msg-1',
      [],
      onRoundComplete,
    )

    expect(onRoundComplete).toHaveBeenCalledTimes(2)
    expect(onRoundComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        roundNumber: 1,
        responses: expect.any(Array),
      }),
    )
  })

  it('includes previous debate history in goki prompts', async () => {
    const completeMock = vi.fn().mockResolvedValue({
      content: 'Round 2 response',
    })

    mockRouter.getProvider = vi.fn().mockReturnValue({
      complete: completeMock,
    })

    mockConsensusDetector.detect = vi.fn()
      .mockResolvedValueOnce({
        hasConsensus: false,
        consensusScore: 0.4,
        reasoning: 'Need round 2',
        areasOfAgreement: [],
        areasOfDisagreement: [],
      })
      .mockResolvedValueOnce({
        hasConsensus: true,
        consensusScore: 0.9,
        reasoning: 'Done',
        areasOfAgreement: ['Agreement'],
        areasOfDisagreement: [],
      })

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 2,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech'],
      },
    })

    await engine.initiateDebate('conv-1', 'Question', 'user-msg-1', [])

    // In round 2, messages should include round 1 responses
    const round2Calls = completeMock.mock.calls.slice(2)
    expect(round2Calls.length).toBeGreaterThan(0)
    expect(round2Calls[0][0].messages.length).toBeGreaterThan(1)
  })

  it('handles goki response errors gracefully', async () => {
    mockRouter.getProvider = vi.fn()
      .mockReturnValueOnce({
        complete: vi.fn().mockResolvedValue({ content: 'Strategy response' }),
      })
      .mockReturnValueOnce({
        complete: vi.fn().mockRejectedValue(new Error('Tech model failed')),
      })
      .mockReturnValueOnce({
        complete: vi.fn().mockResolvedValue({ content: 'Product response' }),
      })
      .mockReturnValueOnce({
        complete: vi.fn().mockResolvedValue({ content: 'Execution response' }),
      })

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 1,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech', 'product', 'execution'],
      },
    })

    const result = await engine.initiateDebate('conv-1', 'Question', 'user-msg-1', [])

    // Should still complete with 3 successful responses
    expect(result.rounds[0].responses).toHaveLength(4)
    expect(result.rounds[0].responses[1].content).toContain('error')
  })

  it('skips consensus check for round 1', async () => {
    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 1,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech'],
      },
    })

    await engine.initiateDebate('conv-1', 'Question', 'user-msg-1', [])

    // Consensus detection should not be called for round 1
    expect(mockConsensusDetector.detect).not.toHaveBeenCalled()
  })

  it('respects consensusThreshold setting', async () => {
    mockConsensusDetector.detect = vi.fn().mockResolvedValue({
      hasConsensus: true,
      consensusScore: 0.75, // Below 0.8 threshold
      reasoning: 'Moderate agreement',
      areasOfAgreement: ['Some agreement'],
      areasOfDisagreement: [],
    })

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 3,
        consensusThreshold: 0.8, // Higher than score
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech'],
      },
    })

    const result = await engine.initiateDebate('conv-1', 'Question', 'user-msg-1', [])

    // Should continue to max rounds because score < threshold
    expect(result.status).toBe('max_rounds_exceeded')
    expect(result.totalRounds).toBe(3)
  })

  it('synthesizes final recommendation from round responses', async () => {
    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 1,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy', 'tech'],
      },
    })

    const result = await engine.initiateDebate('conv-1', 'Question', 'user-msg-1', [])

    expect(result.finalRecommendation).toBeDefined()
    expect(result.finalRecommendation.length).toBeGreaterThan(0)
  })

  it('handles missing specialist for role', async () => {
    mockRosterService.getSpecialistForRole = vi.fn().mockResolvedValue(undefined)

    const engine = createDebateEngine({
      router: mockRouter,
      rosterService: mockRosterService,
      consensusDetector: mockConsensusDetector,
      config: {
        maxRounds: 1,
        consensusThreshold: 0.8,
        enableConsensusCheck: true,
        turnOrder: ['strategy'],
      },
    })

    const result = await engine.initiateDebate('conv-1', 'Question', 'user-msg-1', [])

    // When no specialist is assigned, the role is skipped, resulting in empty responses
    expect(result.rounds[0].responses).toHaveLength(0)
    expect(result.status).toBe('max_rounds_exceeded')
  })
})
