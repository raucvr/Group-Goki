import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { now, isExpired } from '../time.js'

describe('now', () => {
  it('returns an ISO 8601 date string', () => {
    const result = now()
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    expect(result).toMatch(isoRegex)
  })

  it('returns a valid date that can be parsed', () => {
    const result = now()
    const parsed = new Date(result)
    expect(parsed.toString()).not.toBe('Invalid Date')
  })

  it('returns current time (within 1 second)', () => {
    const before = Date.now()
    const result = now()
    const after = Date.now()
    const parsed = new Date(result).getTime()
    expect(parsed).toBeGreaterThanOrEqual(before - 1000)
    expect(parsed).toBeLessThanOrEqual(after + 1000)
  })
})

describe('isExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when time not yet expired', () => {
    const baseTime = new Date('2025-01-01T00:00:00.000Z')
    vi.setSystemTime(baseTime)

    const timestamp = new Date('2025-01-01T00:00:00.000Z').toISOString()
    vi.setSystemTime(new Date('2025-01-01T00:00:05.000Z'))

    expect(isExpired(timestamp, 10000)).toBe(false)
  })

  it('returns true when time has expired', () => {
    const baseTime = new Date('2025-01-01T00:00:00.000Z')
    vi.setSystemTime(baseTime)

    const timestamp = new Date('2025-01-01T00:00:00.000Z').toISOString()
    vi.setSystemTime(new Date('2025-01-01T00:00:15.000Z'))

    expect(isExpired(timestamp, 10000)).toBe(true)
  })

  it('returns false exactly at TTL boundary', () => {
    const baseTime = new Date('2025-01-01T00:00:00.000Z')
    vi.setSystemTime(baseTime)

    const timestamp = new Date('2025-01-01T00:00:00.000Z').toISOString()
    vi.setSystemTime(new Date('2025-01-01T00:00:10.000Z'))

    expect(isExpired(timestamp, 10000)).toBe(false)
  })

  it('returns true one millisecond after TTL', () => {
    const baseTime = new Date('2025-01-01T00:00:00.000Z')
    vi.setSystemTime(baseTime)

    const timestamp = new Date('2025-01-01T00:00:00.000Z').toISOString()
    vi.setSystemTime(new Date('2025-01-01T00:00:10.001Z'))

    expect(isExpired(timestamp, 10000)).toBe(true)
  })

  it('handles zero TTL', () => {
    const baseTime = new Date('2025-01-01T00:00:00.000Z')
    vi.setSystemTime(baseTime)

    const timestamp = new Date('2025-01-01T00:00:00.000Z').toISOString()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.001Z'))

    expect(isExpired(timestamp, 0)).toBe(true)
  })

  it('handles large TTL values', () => {
    const baseTime = new Date('2025-01-01T00:00:00.000Z')
    vi.setSystemTime(baseTime)

    const timestamp = new Date('2025-01-01T00:00:00.000Z').toISOString()
    vi.setSystemTime(new Date('2025-01-02T00:00:00.000Z'))

    const oneDayMs = 24 * 60 * 60 * 1000
    expect(isExpired(timestamp, oneDayMs * 2)).toBe(false)
    expect(isExpired(timestamp, oneDayMs / 2)).toBe(true)
  })
})
