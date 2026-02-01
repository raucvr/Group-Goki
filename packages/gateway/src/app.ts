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

  // Leaderboard
  let leaderboard = createModelLeaderboard()

  // Battle Royale components
  const taskAnalyzer = createTaskAnalyzer(router, env.JUDGE_MODEL_ID)
  const parallelRunner = createParallelRunner((_modelId: string) => openRouterAdapter)
  const judge = createJudgeEngine(router)

  const battleRoyale = createBattleRoyaleOrchestrator({
    taskAnalyzer,
    parallelRunner,
    judge,
    leaderboard,
    registry,
    onLeaderboardUpdate: (updated) => {
      leaderboard = updated
    },
  })

  // Chat components
  let conversationManager = createConversationManager()
  const turnManager = createTurnManager()
  const memoryManager = createMemoryManager()
  const memoryIntegrator = createMemoryIntegrator(memoryManager)

  const discussionOrchestrator = createDiscussionOrchestrator({
    conversationManager,
    battleRoyale,
    turnManager,
    leaderboard,
    registry,
    memoryLookup: async (query) => memoryIntegrator.lookupContext(query),
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
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
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
