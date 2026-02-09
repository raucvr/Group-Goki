'use client'

import { useCallback, useEffect } from 'react'
import { useChatStore } from '@/lib/store'
import { useWebSocket, type WsOutgoingEvent } from '@/lib/ws'
import { api } from '@/lib/api'
import { ChatPanel } from '@/components/chat/chat-panel'
import { ConversationList } from '@/components/sidebar/conversation-list'

export default function Home() {
  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const setConversations = useChatStore((s) => s.setConversations)
  const addConversation = useChatStore((s) => s.addConversation)
  const addMessage = useChatStore((s) => s.addMessage)
  const setMessages = useChatStore((s) => s.setMessages)
  const setIsLoading = useChatStore((s) => s.setIsLoading)
  const sidebarOpen = useChatStore((s) => s.sidebarOpen)

  const handleWsMessage = useCallback(
    (event: WsOutgoingEvent) => {
      switch (event.type) {
        case 'message':
          addMessage(event.message)
          setIsLoading(false)
          break
        case 'goki_response':
          if (event.message) {
            addMessage(event.message)
          }
          break
        case 'consensus_reached':
          if (event.message) {
            addMessage(event.message)
          }
          setIsLoading(false)
          break
        case 'error':
          setIsLoading(false)
          break
      }
    },
    [addMessage, setIsLoading],
  )

  const { sendMessage, subscribe, status } = useWebSocket({
    onMessage: handleWsMessage,
  })

  // Load conversations on mount
  useEffect(() => {
    api.conversations.list().then(setConversations).catch(() => {})
  }, [setConversations])

  // Subscribe to active conversation
  useEffect(() => {
    if (activeId && status === 'connected') {
      subscribe(activeId)
      api.conversations
        .getMessages(activeId)
        .then((msgs) => setMessages(activeId, msgs))
        .catch(() => {})
    }
  }, [activeId, status, subscribe, setMessages])

  const handleNewConversation = useCallback(async () => {
    try {
      const conversation = await api.conversations.create('New Chat')
      addConversation(conversation)
      setActive(conversation.id)
    } catch {
      // handle error
    }
  }, [addConversation, setActive])

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeId) return
      setIsLoading(true)
      sendMessage(activeId, content)
    },
    [activeId, sendMessage, setIsLoading],
  )

  return (
    <main className="flex h-screen">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 border-r border-border flex-shrink-0 flex flex-col">
          <div className="h-14 flex items-center px-4 border-b border-border">
            <h1 className="text-sm font-bold tracking-tight">Group Goki</h1>
          </div>
          <div className="flex-1 min-h-0">
            <ConversationList onNewConversation={handleNewConversation} />
          </div>
        </aside>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {status === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </header>
        <ChatPanel onSendMessage={handleSendMessage} />
      </div>
    </main>
  )
}
