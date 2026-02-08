import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import {
  loadEnv,
  createOpenRouterAdapter,
  createModelRegistry,
  createModelRouter,
  createDatabase,
  createRosterRepository,
  createGokiRosterService,
  createConsensusDetector,
  createDebateEngine,
  DEFAULT_MODELS,
} from '@group-goki/core'
import {
  createConversationManager,
  createDiscussionOrchestrator,
  createMemoryManager,
  createMemoryIntegrator,
} from '@group-goki/chat'
import type { ConversationManager } from '@group-goki/chat'
import type { ModelRegistry } from '@group-goki/core'
import { createConversationRoutes } from './routes/conversations.js'
import { createModelRoutes } from './routes/models.js'
import { createHealthRoutes } from './routes/health.js'

export interface AppState {
  conversationManager: ConversationManager
  registry: ModelRegistry
}

export async function createApp() {
  const env = loadEnv()

  // Database
  const { db, close: closeDb } = createDatabase(env.DATABASE_URL)

  // Repositories
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

  // Goki Roster Service
  const rosterService = createGokiRosterService({
    rosterRepo,
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
  let currentMemoryManager = createMemoryManager()

  const discussionOrchestrator = createDiscussionOrchestrator({
    getConversationManager: () => conversationManager,
    getRegistry: () => registry,
    debateEngine,
    rosterService,
    router,
    defaultModelId: env.JUDGE_MODEL_ID,
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
    createModelRoutes(() => registry),
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
