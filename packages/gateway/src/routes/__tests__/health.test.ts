import { describe, it, expect } from 'vitest'
import { createHealthRoutes } from '../health.js'

describe('createHealthRoutes', () => {
  it('returns health status on GET /', async () => {
    const routes = createHealthRoutes()

    const req = new Request('http://localhost/')
    const res = await routes.fetch(req)

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toMatchObject({
      status: 'ok',
      version: '0.1.0',
    })
    expect(body.timestamp).toBeDefined()

    // Verify timestamp is valid ISO string
    const timestamp = new Date(body.timestamp)
    expect(timestamp.toISOString()).toBe(body.timestamp)
  })

  it('returns different timestamps on multiple calls', async () => {
    const routes = createHealthRoutes()

    const req1 = new Request('http://localhost/')
    const res1 = await routes.fetch(req1)
    const body1 = await res1.json()

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10))

    const req2 = new Request('http://localhost/')
    const res2 = await routes.fetch(req2)
    const body2 = await res2.json()

    expect(body1.timestamp).not.toBe(body2.timestamp)
  })

  it('returns JSON content type', async () => {
    const routes = createHealthRoutes()

    const req = new Request('http://localhost/')
    const res = await routes.fetch(req)

    expect(res.headers.get('content-type')).toContain('application/json')
  })
})
