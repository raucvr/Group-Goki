import type {
  ProviderAdapter,
  CompletionRequest,
  CompletionResponse,
  CompletionStream,
  StreamChunk,
} from '../provider-adapter.js'
import { ProviderError } from '../provider-adapter.js'

interface OpenRouterChatResponse {
  readonly id: string
  readonly choices: readonly {
    readonly message: { readonly content: string }
    readonly finish_reason: string
  }[]
  readonly usage: {
    readonly prompt_tokens: number
    readonly completion_tokens: number
  }
}

export function createOpenRouterAdapter(apiKey: string): ProviderAdapter {
  const baseUrl = 'https://openrouter.ai/api/v1'

  return {
    providerId: 'openrouter',

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const startTime = Date.now()

      const messages = request.systemPrompt
        ? [
            { role: 'system' as const, content: request.systemPrompt },
            ...request.messages.map((m) => ({
              role: m.role === 'model' ? ('assistant' as const) : (m.role as 'user' | 'system'),
              content: m.content,
            })),
          ]
        : request.messages.map((m) => ({
            role: m.role === 'model' ? ('assistant' as const) : (m.role as 'user' | 'system'),
            content: m.content,
          }))

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://group-goki.dev',
          'X-Title': 'Group Goki',
        },
        body: JSON.stringify({
          model: request.modelId,
          messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new ProviderError(
          `OpenRouter API error (${response.status}): ${errorText}`,
          'openrouter',
          request.modelId,
          response.status,
        )
      }

      const data = (await response.json()) as OpenRouterChatResponse
      const choice = data.choices[0]

      if (!choice) {
        throw new ProviderError(
          'OpenRouter returned empty choices',
          'openrouter',
          request.modelId,
        )
      }

      return {
        modelId: request.modelId,
        content: choice.message.content,
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        responseTimeMs: Date.now() - startTime,
        finishReason: choice.finish_reason === 'stop' ? 'stop' : 'length',
      }
    },

    async stream(request: CompletionRequest): Promise<CompletionStream> {
      const messages = request.systemPrompt
        ? [
            { role: 'system' as const, content: request.systemPrompt },
            ...request.messages.map((m) => ({
              role: m.role === 'model' ? ('assistant' as const) : (m.role as 'user' | 'system'),
              content: m.content,
            })),
          ]
        : request.messages.map((m) => ({
            role: m.role === 'model' ? ('assistant' as const) : (m.role as 'user' | 'system'),
            content: m.content,
          }))

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://group-goki.dev',
          'X-Title': 'Group Goki',
        },
        body: JSON.stringify({
          model: request.modelId,
          messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new ProviderError(
          `OpenRouter stream error (${response.status}): ${errorText}`,
          'openrouter',
          request.modelId,
          response.status,
        )
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new ProviderError(
          'No response body for stream',
          'openrouter',
          request.modelId,
        )
      }

      const decoder = new TextDecoder()

      return {
        modelId: request.modelId,
        async *[Symbol.asyncIterator](): AsyncIterator<StreamChunk> {
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              yield { delta: '', done: true }
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith('data: ')) continue
              const jsonStr = trimmed.slice(6)
              if (jsonStr === '[DONE]') {
                yield { delta: '', done: true }
                return
              }
              try {
                const parsed = JSON.parse(jsonStr) as {
                  choices: readonly { delta: { content?: string } }[]
                }
                const delta = parsed.choices[0]?.delta?.content ?? ''
                if (delta) {
                  yield { delta, done: false }
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        },
      }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        return response.ok
      } catch {
        return false
      }
    },
  }
}
