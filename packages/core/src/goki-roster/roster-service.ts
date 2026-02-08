import type {
  RosterRepository,
  GokiRole,
  AssignmentType,
} from '../db/repositories/roster-repository.js'

export interface GokiRosterService {
  readonly getSpecialistForRole: (role: GokiRole) => Promise<string | undefined>
  readonly assignModelToRole: (
    role: GokiRole,
    modelId: string,
    assignmentType: AssignmentType,
  ) => Promise<void>
  readonly getAllAssignments: () => Promise<ReadonlyMap<GokiRole, string>>
  readonly removeRole: (role: GokiRole) => Promise<void>
}

export function createGokiRosterService(deps: {
  readonly rosterRepo: RosterRepository
}): GokiRosterService {
  return {
    async getSpecialistForRole(role) {
      const entry = await deps.rosterRepo.findByRole(role)
      return entry?.modelId
    },

    async assignModelToRole(role, modelId, assignmentType) {
      await deps.rosterRepo.assign(role, modelId, assignmentType)
    },

    async getAllAssignments() {
      const entries = await deps.rosterRepo.findAll()
      const map = new Map<GokiRole, string>()

      for (const entry of entries) {
        map.set(entry.role, entry.modelId)
      }

      return map
    },

    async removeRole(role) {
      await deps.rosterRepo.remove(role)
    },
  }
}
