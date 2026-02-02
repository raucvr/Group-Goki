import type { ModelCapability } from '@group-goki/shared'
import type {
  ProviderAdapter,
  CompletionRequest,
  CompletionResponse,
} from './provider-adapter.js'
import type { ModelRegistry } from './model-registry.js'
import { withTimeout, ProviderError } from './provider-adapter.js'
import { runWithConcurrencyLimit } from '../utils/concurrency.js'

export interface ModelRouter {
  readonly route: (
    request: CompletionRequest,
  ) => Promise<CompletionResponse>

  readonly routeParallel: (
    baseRequest: Omit<CompletionRequest, 'modelId'>,
    modelIds: readonly string[],
    options?: {
      readonly timeoutMs?: number
      readonly maxConcurrent?: number
      readonly onProgress?: (modelId: string, status: 'started' | 'complete' | 'failed') => void
    },
  ) => Promise<readonly ParallelResult[]>

  readonly getProvider: (modelId: string) => ProviderAdapter | undefined
}

export type ParallelResult =
  | { readonly type: 'success'; readonly response: CompletionResponse }
  | { readonly type: 'error'; readonly modelId: string; readonly error: string; readonly timedOut: boolean }

export function createModelRouter(
  registry: ModelRegistry,
  providers: ReadonlyMap<string, ProviderAdapter>,
): ModelRouter {
  function resolveProvider(modelId: string): ProviderAdapter {
    const model = registry.getById(modelId)
    if (!model) {
      throw new ProviderError(`Model not found: ${modelId}`, 'unknown', modelId)
    }

    // Try model-specific provider first, then openrouter as fallback
    const provider = providers.get(model.provider) ?? providers.get('openrouter')
    if (!provider) {
      throw new ProviderError(
        `No provider available for model ${modelId}`,
        model.provider,
        modelId,
      )
    }
    return provider
  }

  return {
    async route(request): Promise<CompletionResponse> {
      const provider = resolveProvider(request.modelId)
      return provider.complete(request)
    },

    async routeParallel(baseRequest, modelIds, options = {}): Promise<readonly ParallelResult[]> {
      const { timeoutMs = 60000, maxConcurrent = 5, onProgress } = options

      const tasks = modelIds.map((modelId) => async (): Promise<ParallelResult> => {
        onProgress?.(modelId, 'started')
        try {
          const provider = resolveProvider(modelId)
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

      return runWithConcurrencyLimit(tasks, maxConcurrent)
    },

    getProvider: (modelId) => {
      const model = registry.getById(modelId)
      if (!model) return undefined
      return providers.get(model.provider) ?? providers.get('openrouter')
    },
  }
}
