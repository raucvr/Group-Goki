import { Hono } from 'hono'

export function createHealthRoutes() {
  const app = new Hono()

  app.get('/', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    })
  })

  return app
}
