import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { createWsServer } from './ws/server.js'
import { createMessageHandler } from './ws/message-handler.js'
import type { Hono } from 'hono'

// Export for external use
let appInstance: Hono | undefined

async function main() {
  const {
    app,
    discussionOrchestrator,
    closeDb,
    env,
    getConversationManager,
    setConversationManager,
  } = await createApp()

  appInstance = app
  const port = env.GATEWAY_PORT

  const server = serve({ fetch: app.fetch, port }, (info) => {
    process.stdout.write(`Gateway server running on http://localhost:${info.port}\n`)
    process.stdout.write(`WebSocket available at ws://localhost:${info.port}/ws\n`)
  })

  // WebSocket layer
  const wsServer = createWsServer(server, {
    onConnect(clientId) {
      process.stdout.write(`WS client connected: ${clientId}\n`)
    },
    onDisconnect(clientId) {
      process.stdout.write(`WS client disconnected: ${clientId}\n`)
    },
    onMessage(clientId, event) {
      handler.handle(clientId, event)
    },
  })

  const handler = createMessageHandler({
    wsServer,
    discussionOrchestrator,
    getConversationManager,
    setConversationManager,
  })

  // Graceful shutdown
  function shutdown() {
    process.stdout.write('Shutting down...\n')
    wsServer.close()
    closeDb()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})

export { appInstance as app }
export type { AppState } from './app.js'
