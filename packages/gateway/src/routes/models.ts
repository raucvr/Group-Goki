import { Hono } from 'hono'
import type { ModelRegistry } from '@group-goki/core'

export function createModelRoutes(getRegistry: () => ModelRegistry) {
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

  // Get model by ID
  app.get('/:modelId', (c) => {
    const modelId = c.req.param('modelId')
    const registry = getRegistry()

    const model = registry.getAll().find((m) => m.id === modelId)
    if (!model) {
      return c.json({ success: false, error: 'Model not found' }, 404)
    }

    return c.json({ success: true, data: model })
  })

  return app
}
