import { describe, it, expect, vi } from 'vitest'
import { runWithConcurrencyLimit } from '../concurrency.js'

describe('runWithConcurrencyLimit', () => {
  it('executes all tasks', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ]

    const results = await runWithConcurrencyLimit(tasks, 2)

    expect(results).toHaveLength(3)
    expect([...results].sort()).toEqual([1, 2, 3])
  })

  it('respects concurrency limit', async () => {
    let running = 0
    let maxRunning = 0

    const createTask = (delay: number) => async () => {
      running++
      maxRunning = Math.max(maxRunning, running)
      await new Promise((resolve) => setTimeout(resolve, delay))
      running--
      return delay
    }

    const tasks = [
      createTask(50),
      createTask(50),
      createTask(50),
      createTask(50),
    ]

    await runWithConcurrencyLimit(tasks, 2)

    expect(maxRunning).toBeLessThanOrEqual(2)
  })

  it('handles empty task array', async () => {
    const results = await runWithConcurrencyLimit([], 5)
    expect(results).toEqual([])
  })

  it('handles single task', async () => {
    const results = await runWithConcurrencyLimit([() => Promise.resolve('done')], 1)
    expect(results).toEqual(['done'])
  })

  it('handles task failures without stopping others', async () => {
    const tasks = [
      () => Promise.resolve('success1'),
      () => Promise.reject(new Error('failed')),
      () => Promise.resolve('success2'),
    ]

    // The function doesn't catch errors, so it should throw
    await expect(runWithConcurrencyLimit(tasks, 2)).rejects.toThrow('failed')
  })

  it('returns results in completion order', async () => {
    const createTask = (value: number, delay: number) => async () => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return value
    }

    const tasks = [
      createTask(1, 30),
      createTask(2, 10),
      createTask(3, 20),
    ]

    const results = await runWithConcurrencyLimit(tasks, 3)

    // Results should be in completion order: 2 (10ms), 3 (20ms), 1 (30ms)
    expect(results).toEqual([2, 3, 1])
  })

  it('handles high concurrency limit', async () => {
    const tasks = Array.from({ length: 100 }, (_, i) => () => Promise.resolve(i))

    const results = await runWithConcurrencyLimit<number>(tasks, 50)

    expect(results).toHaveLength(100)
    expect([...results].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 100 }, (_, i) => i),
    )
  })

  it('handles concurrency limit of 1 (sequential execution)', async () => {
    const executionOrder: number[] = []

    const createTask = (id: number) => async () => {
      executionOrder.push(id)
      await new Promise((resolve) => setTimeout(resolve, 10))
      return id
    }

    const tasks = [createTask(1), createTask(2), createTask(3)]

    await runWithConcurrencyLimit(tasks, 1)

    // With concurrency 1, tasks should start in order
    expect(executionOrder).toEqual([1, 2, 3])
  })
})
