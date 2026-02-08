import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import {
  loadEnv,
  createOpenRouterAdapter,
  createModelRegistry,
  createModelRouter,
  createCostTracker,
  createDatabase,
  createTaskAnalyzer,
  createParallelRunner,
  createJudgeEngine,
  createModelLeaderboard,
  createBattleRoyaleOrchestrator,
  createExpertiseRepository,
  createRosterRepository,
  createGokiRosterService,
  createConsensusDetector,
  createDebateEngine,
  DEFAULT_MODELS,
} from '@group-goki/core'
import {
  createConversationManager,
  createDiscussionOrchestrator,
  createTurnManager,
  createMemoryManager,
  createMemoryIntegrator,
} from '@group-goki/chat'
import type { ConversationManager } from '@group-goki/chat'
import type { ModelLeaderboard, ModelRegistry } from '@group-goki/core'
import { createConversationRoutes } from './routes/conversations.js'
import { createModelRoutes } from './routes/models.js'
import { createHealthRoutes } from './routes/health.js'

export interface AppState {
  conversationManager: ConversationManager
  leaderboard: ModelLeaderboard
  registry: ModelRegistry
}

export function createApp() {
  const env = loadEnv()

  // Database
  const { db, close: closeDb } = createDatabase(env.DATABASE_URL)

  // Repositories
  const expertiseRepo = createExpertiseRepository(db as any)
  const rosterRepo = createRosterRepository(db as any)

  // Model Registry
  let registry = createModelRegistry()
  for (const model of DEFAULT_MODELS) {
    registry = registry.register(model)
  }

  // Router
  const openRouterAdapter = createOpenRouterAdapter(env.OPENROUTER_API_KEY)
  const providers = new Map([['openrouter', openRouterAdapter]])
  const router = createModelRouter(registry, providers)

  // Cost Tracker
  let costTracker = createCostTracker()

  // Leaderboard - Load from database
  let leaderboard = createModelLeaderboard()

  // Async initialization of leaderboard from database
  expertiseRepo
    .loadAllAsLeaderboardEntries()
    .then((entries: readonly import('@group-goki/shared').ModelLeaderboardEntry[]) => {
      leaderboard = createModelLeaderboard(entries)
    })
    .catch((error: Error) => {
      console.error('Failed to load leaderboard from database:', error)
    })

  // Goki Roster Service
  const rosterService = createGokiRosterService({
    rosterRepo,
    expertiseRepo,
  })

  // Battle Royale components
  const taskAnalyzer = createTaskAnalyzer(router, env.JUDGE_MODEL_ID)
  const parallelRunner = createParallelRunner((modelId: string) => router.getProvider(modelId))
  const judge = createJudgeEngine(router, registry)

  const battleRoyale = createBattleRoyaleOrchestrator({
    taskAnalyzer,
    parallelRunner,
    judge,
    leaderboard,
    registry,
    onLeaderboardUpdate: (updated) => {
      leaderboard = updated
      // Persist leaderboard updates to database
      persistLeaderboardToDb(updated, expertiseRepo).catch((error) => {
        console.error('Failed to persist leaderboard to database:', error)
      })
    },
  })

  // Debate Engine components
  const consensusDetector = createConsensusDetector(router, env.JUDGE_MODEL_ID)
  const debateEngine = createDebateEngine({
    router,
    rosterService,
    consensusDetector,
    config: {
      maxRounds: 5,
      consensusThreshold: 0.8,
      enableConsensusCheck: true,
      turnOrder: ['strategy', 'tech', 'product', 'execution'],
    },
  })

  // Chat components
  let conversationManager = createConversationManager()
  const turnManager = createTurnManager()
  let currentMemoryManager = createMemoryManager()

  const discussionOrchestrator = createDiscussionOrchestrator({
    getConversationManager: () => conversationManager,
    battleRoyale,
    turnManager,
    getLeaderboard: () => leaderboard,
    getRegistry: () => registry,
    debateEngine,
    rosterService,
    memoryLookup: async (query) => {
      const integrator = createMemoryIntegrator(currentMemoryManager)
      const { context, manager } = integrator.lookupContext(query)
      currentMemoryManager = manager
      return context
    },
  })

  // State accessors
  const state: AppState = {
    get conversationManager() {
      return conversationManager
    },
    set conversationManager(m: ConversationManager) {
      conversationManager = m
    },
    get leaderboard() {
      return leaderboard
    },
    get registry() {
      return registry
    },
  }

  // Hono app
  const app = new Hono()

  // Middleware
  app.use('*', cors({
    origin: env.CORS_ORIGINS,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }))
  app.use('*', logger())

  // Routes
  app.route('/api/health', createHealthRoutes())
  app.route(
    '/api/conversations',
    createConversationRoutes(
      () => conversationManager,
      (m) => { conversationManager = m },
    ),
  )
  app.route(
    '/api/models',
    createModelRoutes(
      () => registry,
      () => leaderboard,
    ),
  )

  return {
    app,
    state,
    discussionOrchestrator,
    closeDb,
    env,
    getConversationManager: () => conversationManager,
    setConversationManager: (m: ConversationManager) => { conversationManager = m },
  }
}

/**
 * Persist leaderboard entries to database
 */
async function persistLeaderboardToDb(
  leaderboard: ModelLeaderboard,
  expertiseRepo: ReturnType<typeof createExpertiseRepository>,
): Promise<void> {
  const entries = leaderboard.getEntries()
  const timestamp = new Date().toISOString()

  for (const entry of entries) {
    await expertiseRepo.save({
      id: `${entry.modelId}:${entry.category}`,
      modelId: entry.modelId,
      category: entry.category,
      scores: [entry.averageScore], // Store as single-item array
      totalWins: entry.totalWins,
      totalEvaluations: entry.totalEvaluations,
      avgScore: entry.averageScore,
      winRate: entry.winRate,
      lastEvaluatedAt: entry.lastEvaluatedAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
}
