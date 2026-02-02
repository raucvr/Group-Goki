// Conversation
export { createConversationManager } from './conversation/manager.js'
export type { ConversationManager, ConversationStore } from './conversation/manager.js'

// Mentions
export {
  parseMentions,
  extractMentionedModelIds,
  stripMentions,
  isModelMentioned,
} from './mentions/parser.js'

// Turns
export { createTurnManager } from './turns/turn-manager.js'
export type {
  TurnManager,
  TurnManagerConfig,
  TurnDecision,
  TurnContext,
  TurnReason,
} from './turns/turn-manager.js'

// Discussion
export { createDiscussionOrchestrator } from './discussion/orchestrator.js'
export type {
  DiscussionOrchestrator,
  DiscussionOrchestratorDeps,
  DiscussionEvent,
} from './discussion/orchestrator.js'
export {
  buildDiscussionSystemPrompt,
  buildDiscussionUserMessage,
} from './discussion/prompts.js'
export type { DiscussionPromptContext } from './discussion/prompts.js'

// Memory
export { createMemoryManager } from './memory/store.js'
export type { MemoryManager, MemoryStore } from './memory/store.js'
export { createMemoryIntegrator } from './memory/integrator.js'
export type { MemoryIntegrator, LookupResult } from './memory/integrator.js'
export type {
  MemoryCategory,
  MemoryItem,
  MemoryResource,
  MemorySearchResult,
} from './memory/types.js'

// Agents
export { createModelAgent, formatAgentSummary } from './agents/model-agent.js'
export type { ModelAgent, AgentStats } from './agents/model-agent.js'
