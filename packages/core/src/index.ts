// Config
export { loadEnv } from './config/env.js'
export type { Env } from './config/env.js'

// Router
export { createOpenRouterAdapter } from './router/providers/openrouter-adapter.js'
export { createModelRegistry } from './router/model-registry.js'
export { createModelRouter } from './router/model-router.js'
export { DEFAULT_MODELS } from './router/default-models.js'
export type { ModelRegistry } from './router/model-registry.js'
export type { ModelRouter, ParallelResult } from './router/model-router.js'
export type {
  ProviderAdapter,
  CompletionRequest,
  CompletionResponse,
  CompletionStream,
  StreamChunk,
} from './router/provider-adapter.js'
export { ProviderError, TimeoutError, withTimeout } from './router/provider-adapter.js'

// Budget
export { createCostTracker } from './budget/cost-tracker.js'
export type { CostTracker, CostRecord } from './budget/cost-tracker.js'

// Database
export { createDatabase } from './db/client.js'
export type { DatabaseInstance, DatabaseConnection } from './db/client.js'
export * as dbSchema from './db/schema.js'
export { runMigrations } from './db/migrate.js'

export { createConversationRepository } from './db/repositories/conversation-repository.js'
export type { ConversationRepository } from './db/repositories/conversation-repository.js'

export { createMessageRepository } from './db/repositories/message-repository.js'
export type { MessageRepository } from './db/repositories/message-repository.js'

export { createEvaluationRepository } from './db/repositories/evaluation-repository.js'
export type { EvaluationRepository } from './db/repositories/evaluation-repository.js'

export { createExpertiseRepository } from './db/repositories/expertise-repository.js'
export type {
  ExpertiseRepository,
  ExpertiseRecord,
} from './db/repositories/expertise-repository.js'

export { createRosterRepository } from './db/repositories/roster-repository.js'
export type {
  RosterRepository,
  RosterEntry,
  GokiRole,
  AssignmentType,
} from './db/repositories/roster-repository.js'

// Goki Roster
export { createGokiRosterService } from './goki-roster/index.js'
export type { GokiRosterService } from './goki-roster/index.js'

// Debate Engine
export { createDebateEngine, createConsensusDetector } from './debate/index.js'
export type {
  DebateEngine,
  DebateConfig,
  DebateRound,
  DebateResult,
  ConsensusDetector,
  ConsensusResult,
} from './debate/index.js'

// Utils
export { runWithConcurrencyLimit } from './utils/concurrency.js'
export { escapeXml, wrapInTag } from './utils/prompt-sanitizer.js'
