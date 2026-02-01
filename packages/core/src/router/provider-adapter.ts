import type { ChatMessage } from '@group-goki/shared'

export interface CompletionRequest {
  readonly modelId: string
  readonly messages: readonly { readonly role: string; readonly content: string }[]
  readonly maxTokens: number
  readonly temperature: number
  readonly systemPrompt?: string
  readonly stream?: boolean
}

export interface CompletionResponse {
  readonly modelId: string
  readonly content: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly responseTimeMs: number
  readonly finishReason: 'stop' | 'length' | 'error'
}

export interface StreamChunk {
  readonly delta: string
  readonly done: boolean
}

export interface CompletionStream {
  readonly modelId: string
  [Symbol.asyncIterator](): AsyncIterator<StreamChunk>
}

export interface ProviderAdapter {
  readonly providerId: string
  complete(request: CompletionRequest): Promise<CompletionResponse>
  stream(request: CompletionRequest): Promise<CompletionStream>
  healthCheck(): Promise<boolean>
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly modelId: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export class TimeoutError extends Error {
  constructor(
    public readonly modelId: string,
    public readonly timeoutMs: number,
  ) {
    super(`Model ${modelId} timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  modelId: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TimeoutError(modelId, timeoutMs)),
      timeoutMs,
    )
    promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}
