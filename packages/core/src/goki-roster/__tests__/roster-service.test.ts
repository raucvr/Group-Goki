import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGokiRosterService } from '../roster-service.js'
import type { RosterRepository, RosterEntry } from '../../db/repositories/roster-repository.js'

describe('createGokiRosterService', () => {
  let mockRosterRepo: RosterRepository

  beforeEach(() => {
    mockRosterRepo = {
      assign: vi.fn(),
      findByRole: vi.fn(),
      findAll: vi.fn(),
      remove: vi.fn(),
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
    })

    const modelId = await service.getSpecialistForRole('strategy')

    expect(modelId).toBe('claude-sonnet-4')
    expect(mockRosterRepo.findByRole).toHaveBeenCalledWith('strategy')
  })

  it('returns undefined when role not assigned', async () => {
    mockRosterRepo.findByRole = vi.fn().mockResolvedValue(undefined)

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
    })

    const modelId = await service.getSpecialistForRole('tech')

    expect(modelId).toBeUndefined()
  })

  it('assigns model to role manually', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
    })

    await service.assignModelToRole('product', 'gpt-4o', 'manual')

    expect(mockRosterRepo.assign).toHaveBeenCalledWith('product', 'gpt-4o', 'manual')
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
    })

    const assignments = await service.getAllAssignments()

    expect(assignments.size).toBe(2)
    expect(assignments.get('strategy')).toBe('claude-sonnet-4')
    expect(assignments.get('tech')).toBe('gpt-4o')
  })

  it('removes role assignment', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
    })

    await service.removeRole('execution')

    expect(mockRosterRepo.remove).toHaveBeenCalledWith('execution')
  })

  it('handles empty roster gracefully', async () => {
    mockRosterRepo.findAll = vi.fn().mockResolvedValue([])

    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
    })

    const assignments = await service.getAllAssignments()

    expect(assignments.size).toBe(0)
  })

  it('reassigns existing role with new model', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
    })

    await service.assignModelToRole('strategy', 'old-model', 'manual')
    await service.assignModelToRole('strategy', 'new-model', 'manual')

    expect(mockRosterRepo.assign).toHaveBeenCalledTimes(2)
    expect(mockRosterRepo.assign).toHaveBeenLastCalledWith('strategy', 'new-model', 'manual')
  })

  it('handles concurrent role assignments', async () => {
    const service = createGokiRosterService({
      rosterRepo: mockRosterRepo,
    })

    await Promise.all([
      service.assignModelToRole('strategy', 'model-1', 'manual'),
      service.assignModelToRole('tech', 'model-2', 'manual'),
      service.assignModelToRole('product', 'model-3', 'manual'),
    ])

    expect(mockRosterRepo.assign).toHaveBeenCalledTimes(3)
  })
})
