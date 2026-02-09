'use client'

import { create } from 'zustand'
import type { ChatMessage, Conversation } from './api'

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

  // UI
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
