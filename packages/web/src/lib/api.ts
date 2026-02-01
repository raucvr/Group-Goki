const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const json: ApiResponse<T> = await response.json()

  if (!json.success || !json.data) {
    throw new Error(json.error ?? 'API request failed')
  }

  return json.data
}

export interface Conversation {
  id: string
  title: string
  status: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: string
  modelId?: string
  content: string
  mentions: Array<{ modelId: string; startIndex: number; endIndex: number }>
  parentMessageId?: string
  evaluationScore?: number
  metadata: Record<string, unknown>
  createdAt: string
}

export const api = {
  conversations: {
    list: () => fetchApi<Conversation[]>('/api/conversations'),
    create: (title: string) =>
      fetchApi<Conversation>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    get: (id: string) => fetchApi<Conversation>(`/api/conversations/${id}`),
    getMessages: (id: string, limit?: number) => {
      const params = limit ? `?limit=${limit}` : ''
      return fetchApi<ChatMessage[]>(`/api/conversations/${id}/messages${params}`)
    },
    archive: (id: string) =>
      fetchApi<{ id: string; status: string }>(`/api/conversations/${id}/archive`, {
        method: 'POST',
      }),
  },
  models: {
    list: () => fetchApi<unknown[]>('/api/models'),
    active: () => fetchApi<unknown[]>('/api/models/active'),
    leaderboard: (category?: string) => {
      const params = category ? `?category=${category}` : ''
      return fetchApi<unknown[]>(`/api/models/leaderboard${params}`)
    },
  },
}
