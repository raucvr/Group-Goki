import type { CompletionRequest, CompletionResponse, ProviderAdapter } from '../router/provider-adapter.js'
import { withTimeout } from '../router/provider-adapter.js'
import { runWithConcurrencyLimit } from '../utils/concurrency.js'

export type ParallelRunSuccess = {
  readonly type: 'success'
  readonly response: CompletionResponse
}

export type ParallelRunError = {
  readonly type: 'error'
  readonly modelId: string
  readonly error: string
  readonly timedOut: boolean
}

export type ParallelRunItem = ParallelRunSuccess | ParallelRunError

export interface ParallelRunResult {
  readonly results: readonly ParallelRunItem[]
  readonly successful: readonly CompletionResponse[]
  readonly totalTimeMs: number
}

export interface ParallelRunner {
  readonly run: (
    baseRequest: Omit<CompletionRequest, 'modelId'>,
    modelIds: readonly string[],
    options?: {
      readonly timeoutMs?: number
      readonly maxConcurrent?: number
      readonly onProgress?: (modelId: string, status: 'started' | 'complete' | 'failed') => void
    },
  ) => Promise<ParallelRunResult>
}

export function createParallelRunner(
  getProvider: (modelId: string) => ProviderAdapter | undefined,
): ParallelRunner {
  return {
    async run(baseRequest, modelIds, options = {}) {
      const { timeoutMs = 60000, maxConcurrent = 5, onProgress } = options
      const startTime = Date.now()

      const tasks = modelIds.map((modelId) => async (): Promise<ParallelRunItem> => {
        onProgress?.(modelId, 'started')
        const provider = getProvider(modelId)
        if (!provider) {
          onProgress?.(modelId, 'failed')
          return {
            type: 'error',
            modelId,
            error: `No provider available for model ${modelId}`,
            timedOut: false,
          }
        }

        try {
          const response = await withTimeout(
            provider.complete({ ...baseRequest, modelId }),
            timeoutMs,
            modelId,
          )
          onProgress?.(modelId, 'complete')
          return { type: 'success', response }
        } catch (error) {
          onProgress?.(modelId, 'failed')
          const isTimeout = error instanceof Error && error.name === 'TimeoutError'
          return {
            type: 'error',
            modelId,
            error: error instanceof Error ? error.message : String(error),
            timedOut: isTimeout,
          }
        }
      })

      const results = await runWithConcurrencyLimit(tasks, maxConcurrent)
      const successful = results
        .filter((r): r is ParallelRunSuccess => r.type === 'success')
        .map((r) => r.response)

      return {
        results,
        successful,
        totalTimeMs: Date.now() - startTime,
      }
    },
  }
}
