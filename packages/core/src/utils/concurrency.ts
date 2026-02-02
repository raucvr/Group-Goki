/**
 * Run async tasks with a concurrency limit.
 * Results are returned in completion order (not submission order).
 */
export async function runWithConcurrencyLimit<T>(
  tasks: readonly (() => Promise<T>)[],
  maxConcurrent: number,
): Promise<readonly T[]> {
  const results: T[] = []
  const executing = new Set<Promise<void>>()

  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result)
    })
    const tracked = promise.then(() => {
      executing.delete(tracked)
    })
    executing.add(tracked)

    if (executing.size >= maxConcurrent) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results
}
