'use client'

import type { ChatMessage } from '@/lib/api'

interface MessageBubbleProps {
  message: ChatMessage
}

const MODEL_COLORS: Record<string, string> = {
  'anthropic/claude-opus-4-5': 'border-l-orange-500',
  'anthropic/claude-sonnet-4': 'border-l-orange-400',
  'anthropic/claude-3.5-haiku': 'border-l-orange-300',
  'openai/gpt-4o': 'border-l-green-500',
  'openai/gpt-4o-mini': 'border-l-green-400',
  'google/gemini-2.5-pro': 'border-l-blue-500',
  'google/gemini-2.0-flash': 'border-l-blue-400',
  'deepseek/deepseek-r1': 'border-l-purple-500',
  'deepseek/deepseek-v3': 'border-l-purple-400',
  'mistralai/mistral-large': 'border-l-red-500',
  'qwen/qwen-2.5-72b-instruct': 'border-l-cyan-500',
  'meta-llama/llama-3.3-70b-instruct': 'border-l-yellow-500',
}

function getModelColor(modelId?: string): string {
  if (!modelId) return 'border-l-gray-500'
  return MODEL_COLORS[modelId] ?? 'border-l-gray-400'
}

function getModelDisplayName(modelId?: string): string {
  if (!modelId) return 'System'
  const parts = modelId.split('/')
  return parts[parts.length - 1] ?? modelId
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary/20 px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  if (message.role === 'system') {
    const isConsensus = (message.metadata as Record<string, unknown>)?.type === 'consensus_summary'
    return (
      <div className="flex justify-center animate-fade-in">
        <div className={`max-w-[85%] rounded-lg px-4 py-3 text-xs ${
          isConsensus ? 'bg-accent/50 border border-border' : 'bg-muted/50'
        }`}>
          <p className="text-muted-foreground whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  // Model response
  const colorClass = getModelColor(message.modelId)
  const modelName = getModelDisplayName(message.modelId)

  return (
    <div className="animate-fade-in">
      <div className={`max-w-[85%] rounded-lg border-l-2 ${colorClass} bg-muted/30 px-4 py-3`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-foreground">{modelName}</span>
          {typeof (message.metadata as Record<string, unknown>)?.turnReason === 'string' && (
            <span className="text-xs text-muted-foreground">
              ({String((message.metadata as Record<string, unknown>).turnReason)})
            </span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}
