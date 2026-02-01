'use client'

import { useChatStore } from '@/lib/store'
import type { Conversation } from '@/lib/api'

interface ConversationListProps {
  onNewConversation: () => void
}

export function ConversationList({ onNewConversation }: ConversationListProps) {
  const conversations = useChatStore((s) => s.conversations)
  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <button
          onClick={onNewConversation}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
                     hover:bg-primary/90 transition-colors"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onClick={() => setActive(conv.id)}
          />
        ))}

        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            No conversations yet
          </p>
        )}
      </div>
    </div>
  )
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors text-sm
                  ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}
    >
      <span className="block truncate font-medium">{conversation.title}</span>
      <span className="block text-[10px] text-muted-foreground mt-0.5">
        {conversation.messageCount} messages
      </span>
    </button>
  )
}
