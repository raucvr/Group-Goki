'use client'

import { create } from 'zustand'
import type { ChatMessage, Conversation } from './api'

export interface BattleProgress {
  conversationId: string
  phase: string
  detail: string
  candidateModels?: string[]
}

export interface EvaluationResult {
  conversationId: string
  evaluations: Array<{
    modelId: string
    overallScore: number
    rank: number
    totalCompetitors: number
    criteria: Array<{ name: string; score: number; reasoning: string }>
    strengthSummary?: string
    weaknessSummary?: string
  }>
  winnerModelId: string
  consensus?: string
  divergences?: string
}

interface ChatStore {
  // Conversations
  conversations: Conversation[]
  activeConversationId: string | null
  setConversations: (conversations: Conversation[]) => void
  setActiveConversation: (id: string | null) => void
  addConversation: (conversation: Conversation) => void

  // Messages
  messagesByConversation: Record<string, ChatMessage[]>
  addMessage: (message: ChatMessage) => void
  setMessages: (conversationId: string, messages: ChatMessage[]) => void

  // Battle Royale state
  battleProgress: BattleProgress | null
  setBattleProgress: (progress: BattleProgress | null) => void

  // Latest evaluation
  latestEvaluation: EvaluationResult | null
  setLatestEvaluation: (evaluation: EvaluationResult | null) => void

  // UI state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  // Conversations
  conversations: [],
  activeConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  // Messages
  messagesByConversation: {},
  addMessage: (message) =>
    set((state) => {
      const existing = state.messagesByConversation[message.conversationId] ?? []
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [message.conversationId]: [...existing, message],
        },
      }
    }),
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),

  // Battle state
  battleProgress: null,
  setBattleProgress: (progress) => set({ battleProgress: progress }),

  latestEvaluation: null,
  setLatestEvaluation: (evaluation) => set({ latestEvaluation: evaluation }),

  // UI
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
