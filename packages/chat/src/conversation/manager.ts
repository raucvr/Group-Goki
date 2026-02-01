import type { Conversation, ChatMessage } from '@group-goki/shared'
import { createId, now, append } from '@group-goki/shared'

export interface ConversationStore {
  readonly conversations: ReadonlyMap<string, Conversation>
  readonly messagesByConversation: ReadonlyMap<string, readonly ChatMessage[]>
}

export interface ConversationManager {
  readonly getStore: () => ConversationStore
  readonly create: (title: string) => { readonly manager: ConversationManager; readonly conversation: Conversation }
  readonly get: (id: string) => Conversation | undefined
  readonly getMessages: (conversationId: string, limit?: number) => readonly ChatMessage[]
  readonly addMessage: (message: ChatMessage) => ConversationManager
  readonly archive: (id: string) => ConversationManager
  readonly getRecentContext: (
    conversationId: string,
    maxMessages: number,
  ) => readonly { role: string; content: string }[]
}

export function createConversationManager(
  initialStore?: ConversationStore,
): ConversationManager {
  const store: ConversationStore = initialStore ?? {
    conversations: new Map(),
    messagesByConversation: new Map(),
  }

  function withStore(nextStore: ConversationStore): ConversationManager {
    return createConversationManager(nextStore)
  }

  return {
    getStore() {
      return store
    },

    create(title) {
      const id = createId()
      const timestamp = now()
      const conversation: Conversation = {
        id,
        title,
        status: 'active',
        messageCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      const nextConversations = new Map(store.conversations)
      nextConversations.set(id, conversation)

      const nextMessages = new Map(store.messagesByConversation)
      nextMessages.set(id, [])

      const manager = withStore({
        conversations: nextConversations,
        messagesByConversation: nextMessages,
      })

      return { manager, conversation }
    },

    get(id) {
      return store.conversations.get(id)
    },

    getMessages(conversationId, limit) {
      const messages = store.messagesByConversation.get(conversationId) ?? []
      if (limit !== undefined) {
        return messages.slice(-limit)
      }
      return messages
    },

    addMessage(message) {
      const existing = store.messagesByConversation.get(message.conversationId) ?? []
      const nextMessages = new Map(store.messagesByConversation)
      nextMessages.set(message.conversationId, append(existing, message))

      const conversation = store.conversations.get(message.conversationId)
      const nextConversations = new Map(store.conversations)
      if (conversation) {
        nextConversations.set(message.conversationId, {
          ...conversation,
          messageCount: conversation.messageCount + 1,
          updatedAt: now(),
        })
      }

      return withStore({
        conversations: nextConversations,
        messagesByConversation: nextMessages,
      })
    },

    archive(id) {
      const conversation = store.conversations.get(id)
      if (!conversation) return withStore(store)

      const nextConversations = new Map(store.conversations)
      nextConversations.set(id, {
        ...conversation,
        status: 'archived' as const,
        updatedAt: now(),
      })

      return withStore({
        ...store,
        conversations: nextConversations,
      })
    },

    getRecentContext(conversationId, maxMessages) {
      const messages = this.getMessages(conversationId, maxMessages)
      return messages.map((m) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
      }))
    },
  }
}
