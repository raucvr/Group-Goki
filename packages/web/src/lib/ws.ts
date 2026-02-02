'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { WsOutgoingEventSchema } from '@group-goki/shared'
import type { WsOutgoingEvent } from '@group-goki/shared'

export type { WsOutgoingEvent }

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3100/ws'

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  onMessage?: (event: WsOutgoingEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<WsStatus>('disconnected')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const optionsRef = useRef(options)
  optionsRef.current = options

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      setStatus('connected')
      optionsRef.current.onConnect?.()
    }

    ws.onmessage = (event) => {
      try {
        const parsed = WsOutgoingEventSchema.safeParse(JSON.parse(event.data))
        if (parsed.success) {
          optionsRef.current.onMessage?.(parsed.data)
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      optionsRef.current.onDisconnect?.()
      wsRef.current = null

      if (optionsRef.current.autoReconnect !== false) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      setStatus('error')
    }

    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    wsRef.current = null
    setStatus('disconnected')
  }, [])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const subscribe = useCallback((conversationId: string) => {
    send({ type: 'subscribe', conversationId })
  }, [send])

  const unsubscribe = useCallback((conversationId: string) => {
    send({ type: 'unsubscribe', conversationId })
  }, [send])

  const sendMessage = useCallback((conversationId: string, content: string) => {
    send({ type: 'send_message', conversationId, content })
  }, [send])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    status,
    send,
    subscribe,
    unsubscribe,
    sendMessage,
    connect,
    disconnect,
  }
}
