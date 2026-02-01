import { Hono } from 'hono'
import type { ModelRegistry, ModelLeaderboard } from '@group-goki/core'
import { createModelAgent, formatAgentSummary } from '@group-goki/chat'

export function createModelRoutes(
  getRegistry: () => ModelRegistry,
  getLeaderboard: () => ModelLeaderboard,
) {
  const app = new Hono()

  // List all models
  app.get('/', (c) => {
    const registry = getRegistry()
    const models = registry.getAll()
    return c.json({ success: true, data: models })
  })

  // List active models
  app.get('/active', (c) => {
    const registry = getRegistry()
    const models = registry.getActive()
    return c.json({ success: true, data: models })
  })

  // Get leaderboard
  app.get('/leaderboard', (c) => {
    const category = c.req.query('category')
    const leaderboard = getLeaderboard()

    if (category) {
      const entries = leaderboard.getTopModels(category, 20)
      return c.json({ success: true, data: entries })
    }

    const entries = leaderboard.getEntries()
    return c.json({ success: true, data: entries })
  })

  // Get model profile (agent view)
  app.get('/:modelId/profile', (c) => {
    const modelId = c.req.param('modelId')
    const registry = getRegistry()
    const leaderboard = getLeaderboard()

    const model = registry.getAll().find((m) => m.id === modelId)
    if (!model) {
      return c.json({ success: false, error: 'Model not found' }, 404)
    }

    const entries = leaderboard.getEntries()
    const agent = createModelAgent(modelId, model.name, model.tier, entries)

    return c.json({
      success: true,
      data: {
        agent,
        summary: formatAgentSummary(agent),
        shouldRetain: leaderboard.shouldRetain(modelId),
      },
    })
  })

  return app
}
