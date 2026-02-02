import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// Conversations
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull().default('active'),
  messageCount: integer('message_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// Messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id),
  role: text('role').notNull(),
  modelId: text('model_id'),
  content: text('content').notNull(),
  mentions: text('mentions').notNull().default('[]'),
  parentMessageId: text('parent_message_id'),
  evaluationScore: real('evaluation_score'),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
})

// Evaluations from Battle Royale
export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  modelId: text('model_id').notNull(),
  judgeModelId: text('judge_model_id').notNull(),
  overallScore: real('overall_score').notNull(),
  criteria: text('criteria').notNull(), // JSON array
  rank: integer('rank').notNull(),
  totalCompetitors: integer('total_competitors').notNull(),
  responseTimeMs: real('response_time_ms').notNull(),
  tokenCost: real('token_cost').notNull(),
  strengthSummary: text('strength_summary'),
  weaknessSummary: text('weakness_summary'),
  createdAt: text('created_at').notNull(),
})

// Model performance leaderboard
export const modelPerformance = sqliteTable('model_performance', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull(),
  category: text('category').notNull(),
  averageScore: real('average_score').notNull(),
  totalEvaluations: integer('total_evaluations').notNull(),
  winRate: real('win_rate').notNull(),
  avgResponseTimeMs: real('avg_response_time_ms').notNull(),
  avgTokenCost: real('avg_token_cost').notNull(),
  trend: text('trend').notNull().default('stable'),
  lastEvaluatedAt: text('last_evaluated_at').notNull(),
})

// Memory: Categories (top layer)
export const memoryCategories = sqliteTable('memory_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentCategoryId: text('parent_category_id'),
  createdAt: text('created_at').notNull(),
})

// Memory: Items (middle layer)
export const memoryItems = sqliteTable('memory_items', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => memoryCategories.id),
  content: text('content').notNull(),
  embedding: text('embedding'), // JSON array of floats
  importance: real('importance').notNull().default(0.5),
  accessCount: integer('access_count').notNull().default(0),
  lastAccessedAt: text('last_accessed_at'),
  createdAt: text('created_at').notNull(),
})

// Memory: Resources (bottom layer - raw data)
export const memoryResources = sqliteTable('memory_resources', {
  id: text('id').primaryKey(),
  itemId: text('item_id')
    .notNull()
    .references(() => memoryItems.id),
  resourceType: text('resource_type').notNull(), // 'conversation', 'document', 'evaluation'
  sourceId: text('source_id').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
})

// Cost records
export const costRecords = sqliteTable('cost_records', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  timestamp: text('timestamp').notNull(),
})
