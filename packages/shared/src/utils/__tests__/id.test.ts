import { describe, it, expect } from 'vitest'
import { createId } from '../id.js'

describe('createId', () => {
  it('returns a string', () => {
    const id = createId()
    expect(typeof id).toBe('string')
  })

  it('returns a valid UUID format', () => {
    const id = createId()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    expect(id).toMatch(uuidRegex)
  })

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()))
    expect(ids.size).toBe(100)
  })

  it('does not return empty string', () => {
    expect(createId().length).toBeGreaterThan(0)
  })
})
