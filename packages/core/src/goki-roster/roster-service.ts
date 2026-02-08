import type {
  RosterRepository,
  GokiRole,
  AssignmentType,
} from '../db/repositories/roster-repository.js'
import type { ExpertiseRepository } from '../db/repositories/expertise-repository.js'
import type { ModelLeaderboard } from '../battle-royale/leaderboard.js'

export const ROLE_TO_CATEGORY: Record<GokiRole, string> = {
  strategy: 'strategy',
  tech: 'technical',
  product: 'product',
  execution: 'planning',
}

export interface GokiRosterService {
  readonly getSpecialistForRole: (role: GokiRole) => Promise<string | undefined>
  readonly assignModelToRole: (
    role: GokiRole,
    modelId: string,
    assignmentType: AssignmentType,
  ) => Promise<void>
  readonly autoAssignRoles: (leaderboard: ModelLeaderboard) => Promise<void>
  readonly getAllAssignments: () => Promise<ReadonlyMap<GokiRole, string>>
  readonly removeRole: (role: GokiRole) => Promise<void>
}

export function createGokiRosterService(deps: {
  readonly rosterRepo: RosterRepository
  readonly expertiseRepo: ExpertiseRepository
}): GokiRosterService {
  return {
    async getSpecialistForRole(role) {
      const entry = await deps.rosterRepo.findByRole(role)
      return entry?.modelId
    },

    async assignModelToRole(role, modelId, assignmentType) {
      await deps.rosterRepo.assign(role, modelId, assignmentType)
    },

    async autoAssignRoles(leaderboard) {
      const roles: GokiRole[] = ['strategy', 'tech', 'product', 'execution']

      for (const role of roles) {
        const category = ROLE_TO_CATEGORY[role]
        const topModels = leaderboard.getTopModels(category, 1)

        if (topModels.length > 0) {
          const topModel = topModels[0]!
          // Only auto-assign if model has enough evaluations
          if (topModel.totalEvaluations >= 3) {
            await deps.rosterRepo.assign(role, topModel.modelId, 'auto')
          }
        }
      }
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
