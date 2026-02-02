import { WebSocketServer, WebSocket } from 'ws'
import type { WsIncomingEvent, WsOutgoingEvent } from '@group-goki/shared'
import { WsIncomingEventSchema } from '@group-goki/shared'

export interface WsClient {
  readonly id: string
  readonly ws: WebSocket
  readonly subscriptions: ReadonlySet<string>
}

export interface WsServer {
  readonly broadcast: (conversationId: string, event: WsOutgoingEvent) => void
  readonly sendTo: (clientId: string, event: WsOutgoingEvent) => void
  readonly getClientCount: () => number
  readonly close: () => void
}

export interface WsServerOptions {
  readonly onMessage: (clientId: string, event: WsIncomingEvent) => void
  readonly onConnect: (clientId: string) => void
  readonly onDisconnect: (clientId: string) => void
}

export function createWsServer(
  httpServer: unknown,
  options: WsServerOptions,
): WsServer {
  const clients = new Map<string, WsClient>()
  let clientCounter = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wss = new WebSocketServer({ server: httpServer as any, path: '/ws' })

  wss.on('connection', (ws) => {
    clientCounter += 1
    const clientId = `client-${clientCounter}`
    const client: WsClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
    }
    clients.set(clientId, client)
    options.onConnect(clientId)

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString())
        const parsed = WsIncomingEventSchema.safeParse(data)
        if (!parsed.success) {
          sendToClient(client, {
            type: 'error',
            message: `Invalid message: ${parsed.error.message}`,
          })
          return
        }

        const event = parsed.data

        // Handle subscribe/unsubscribe locally
        if (event.type === 'subscribe') {
          const nextSubs = new Set(client.subscriptions)
          nextSubs.add(event.conversationId)
          clients.set(clientId, { ...client, subscriptions: nextSubs })
        } else if (event.type === 'unsubscribe') {
          const nextSubs = new Set(client.subscriptions)
          nextSubs.delete(event.conversationId)
          clients.set(clientId, { ...client, subscriptions: nextSubs })
        }

        options.onMessage(clientId, event)
      } catch {
        sendToClient(client, {
          type: 'error',
          message: 'Failed to parse message',
        })
      }
    })

    ws.on('close', () => {
      clients.delete(clientId)
      options.onDisconnect(clientId)
    })

    ws.on('error', () => {
      clients.delete(clientId)
    })
  })

  function sendToClient(client: WsClient, event: WsOutgoingEvent): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(event))
    }
  }

  return {
    broadcast(conversationId, event) {
      for (const client of clients.values()) {
        if (client.subscriptions.has(conversationId)) {
          sendToClient(client, event)
        }
      }
    },

    sendTo(clientId, event) {
      const client = clients.get(clientId)
      if (client) {
        sendToClient(client, event)
      }
    },

    getClientCount() {
      return clients.size
    },

    close() {
      wss.close()
    },
  }
}
