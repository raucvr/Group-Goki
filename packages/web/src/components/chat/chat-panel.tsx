'use client'

import { useRef, useEffect } from 'react'
import { useChatStore } from '@/lib/store'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'

interface ChatPanelProps {
  onSendMessage: (content: string) => void
}

export function ChatPanel({ onSendMessage }: ChatPanelProps) {
  const activeId = useChatStore((s) => s.activeConversationId)
  const messages = useChatStore((s) =>
    activeId ? s.messagesByConversation[activeId] ?? [] : [],
  )
  const isLoading = useChatStore((s) => s.isLoading)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (!activeId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Group Goki</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Your MBB consulting team + FAANG tech team.
            Create a new conversation to start.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <MessageInput
        onSend={onSendMessage}
        disabled={isLoading}
        placeholder={isLoading ? 'Gokis are discussing...' : undefined}
      />
    </div>
  )
}
