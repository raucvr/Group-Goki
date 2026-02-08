import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGokiRosterService, ROLE_TO_CATEGORY } from '../roster-service.js'
import type { RosterRepository, RosterEntry } from '../../db/repositories/roster-repository.js'
import type { ExpertiseRepository } from '../../db/repositories/expertise-repository.js'
import type { ModelLeaderboard } from '../../battle-royale/leaderboard.js'

describe('createGokiRosterService', () => {
  let mockRosterRepo: RosterRepository
  let mockExpertiseRepo: ExpertiseRepository

  beforeEach(() => {
    mockRosterRepo = {
      assign: vi.fn(),
      findByRole: vi.fn(),
      findAll: vi.fn(),
      remove: vi.fn(),
    }

    mockExpertiseRepo = {
      save: vi.fn(),
      findByModelAndCategory: vi.fn(),
      findByCategory: vi.fn(),
      loadAllAsLeaderboardEntries: vi.fn(),
      hasExpertForDomain: vi.fn(),
    }
  })

  it('returns specialist model for assigned role', async () => {
    mockRosterRepo.findByRole = vi.fn().mockResolvedValue({
      id: 'roster-1',
      role: 'strategy',
      modelId: 'claude-sonnet-4',
      assignmentType: 'manual',
      assignedAt: '2025-01-15T12:00:00.000Z',
      updatedAt: '2025-01-15T12:00:00.000Z',
    } as RosterEntry)

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    const modelId = await service.getSpecialistForRole('strategy')

    expect(modelId).toBe('claude-sonnet-4')
    expect(mockRosterRepo.findByRole).toHaveBeenCalledWith('strategy')
  })

  it('returns undefined when role not assigned', async () => {
    mockRosterRepo.findByRole = vi.fn().mockResolvedValue(undefined)

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    const modelId = await service.getSpecialistForRole('tech')

    expect(modelId).toBeUndefined()
  })

  it('assigns model to role manually', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    await service.assignModelToRole('product', 'gpt-4o', 'manual')

    expect(mockRosterRepo.assign).toHaveBeenCalledWith('product', 'gpt-4o', 'manual')
  })

  it('auto-assigns roles from leaderboard top models', async () => {
    const mockLeaderboard: ModelLeaderboard = {
      updateFromEvaluations: vi.fn(),
      getTopModels: vi.fn()
        .mockReturnValueOnce([{ modelId: 'claude-sonnet-4', category: 'strategy', averageScore: 95, totalEvaluations: 5, totalWins: 4, winRate: 0.8, lastEvaluatedAt: '2025-01-15T12:00:00.000Z' }]) // strategy
        .mockReturnValueOnce([{ modelId: 'gpt-4o', category: 'technical', averageScore: 92, totalEvaluations: 5, totalWins: 3, winRate: 0.6, lastEvaluatedAt: '2025-01-15T12:00:00.000Z' }]) // tech
        .mockReturnValueOnce([{ modelId: 'gemini-pro', category: 'product', averageScore: 88, totalEvaluations: 5, totalWins: 3, winRate: 0.6, lastEvaluatedAt: '2025-01-15T12:00:00.000Z' }]) // product
        .mockReturnValueOnce([{ modelId: 'claude-opus-4', category: 'planning', averageScore: 90, totalEvaluations: 5, totalWins: 4, winRate: 0.8, lastEvaluatedAt: '2025-01-15T12:00:00.000Z' }]), // execution
      hasExpertForDomain: vi.fn().mockReturnValue(true),
      getEntries: vi.fn(),
      getAllCategories: vi.fn(),
    }

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    await service.autoAssignRoles(mockLeaderboard)

    expect(mockRosterRepo.assign).toHaveBeenCalledWith('strategy', 'claude-sonnet-4', 'auto')
    expect(mockRosterRepo.assign).toHaveBeenCalledWith('tech', 'gpt-4o', 'auto')
    expect(mockRosterRepo.assign).toHaveBeenCalledWith('product', 'gemini-pro', 'auto')
    expect(mockRosterRepo.assign).toHaveBeenCalledWith('execution', 'claude-opus-4', 'auto')
    expect(mockRosterRepo.assign).toHaveBeenCalledTimes(4)
  })

  it('skips auto-assignment when no top model found', async () => {
    const mockLeaderboard: ModelLeaderboard = {
      updateFromEvaluations: vi.fn(),
      getTopModels: vi.fn().mockReturnValue([]), // No models
      hasExpertForDomain: vi.fn().mockReturnValue(false),
      getEntries: vi.fn(),
      getAllCategories: vi.fn(),
    }

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    await service.autoAssignRoles(mockLeaderboard)

    expect(mockRosterRepo.assign).not.toHaveBeenCalled()
  })

  it('returns all roster assignments as map', async () => {
    mockRosterRepo.findAll = vi.fn().mockResolvedValue([
      {
        id: 'roster-1',
        role: 'strategy',
        modelId: 'claude-sonnet-4',
        assignmentType: 'manual',
        assignedAt: '2025-01-15T12:00:00.000Z',
        updatedAt: '2025-01-15T12:00:00.000Z',
      },
      {
        id: 'roster-2',
        role: 'tech',
        modelId: 'gpt-4o',
        assignmentType: 'auto',
        assignedAt: '2025-01-15T12:00:00.000Z',
        updatedAt: '2025-01-15T12:00:00.000Z',
      },
    ] as RosterEntry[])

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    const assignments = await service.getAllAssignments()

    expect(assignments.size).toBe(2)
    expect(assignments.get('strategy')).toBe('claude-sonnet-4')
    expect(assignments.get('tech')).toBe('gpt-4o')
  })

  it('removes role assignment', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    await service.removeRole('execution')

    expect(mockRosterRepo.remove).toHaveBeenCalledWith('execution')
  })

  it('uses correct category mapping for roles', () => {
    expect(ROLE_TO_CATEGORY.strategy).toBe('strategy')
    expect(ROLE_TO_CATEGORY.tech).toBe('technical')
    expect(ROLE_TO_CATEGORY.product).toBe('product')
    expect(ROLE_TO_CATEGORY.execution).toBe('planning')
  })

  it('handles empty roster gracefully', async () => {
    mockRosterRepo.findAll = vi.fn().mockResolvedValue([])

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    const assignments = await service.getAllAssignments()

    expect(assignments.size).toBe(0)
  })

  it('reassigns existing role with new model', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    await service.assignModelToRole('strategy', 'old-model', 'manual')
    await service.assignModelToRole('strategy', 'new-model', 'manual')

    expect(mockRosterRepo.assign).toHaveBeenCalledTimes(2)
    expect(mockRosterRepo.assign).toHaveBeenLastCalledWith('strategy', 'new-model', 'manual')
  })

  it('queries leaderboard with correct categories for auto-assignment', async () => {
    const mockLeaderboard: ModelLeaderboard = {
      updateFromEvaluations: vi.fn(),
      getTopModels: vi.fn().mockReturnValue([{
        modelId: 'test-model',
        category: 'test',
        averageScore: 90,
        totalEvaluations: 5,
        totalWins: 4,
        winRate: 0.8,
        lastEvaluatedAt: '2025-01-15T12:00:00.000Z',
      }]),
      hasExpertForDomain: vi.fn().mockReturnValue(true),
      getEntries: vi.fn(),
      getAllCategories: vi.fn(),
    }

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    await service.autoAssignRoles(mockLeaderboard)

    // Verify correct categories used from ROLE_TO_CATEGORY mapping
    expect(mockLeaderboard.getTopModels).toHaveBeenCalledWith('strategy', 1)
    expect(mockLeaderboard.getTopModels).toHaveBeenCalledWith('technical', 1)
    expect(mockLeaderboard.getTopModels).toHaveBeenCalledWith('product', 1)
    expect(mockLeaderboard.getTopModels).toHaveBeenCalledWith('planning', 1)
  })

  it('handles concurrent role assignments', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
      expertiseRepo: mockExpertiseRepo,
    })

    await Promise.all([
      service.assignModelToRole('strategy', 'model-1', 'manual'),
      service.assignModelToRole('tech', 'model-2', 'manual'),
      service.assignModelToRole('product', 'model-3', 'manual'),
    ])

    expect(mockRosterRepo.assign).toHaveBeenCalledTimes(3)
  })
})
