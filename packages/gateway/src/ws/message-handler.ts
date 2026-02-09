import type { WsIncomingEvent } from '@group-goki/shared'
import type { DiscussionOrchestrator, ConversationManager } from '@group-goki/chat'
import type { WsServer } from './server.js'

export interface MessageHandlerDeps {
  readonly wsServer: WsServer
  readonly discussionOrchestrator: DiscussionOrchestrator
  readonly getConversationManager: () => ConversationManager
  readonly setConversationManager: (m: ConversationManager) => void
}

export function createMessageHandler(deps: MessageHandlerDeps) {
  return {
    async handle(clientId: string, event: WsIncomingEvent): Promise<void> {
      if (event.type !== 'send_message') return

      const { conversationId, content } = event
      const manager = deps.getConversationManager()

      // Verify conversation exists
      const conversation = manager.get(conversationId)
      if (!conversation) {
        deps.wsServer.sendTo(clientId, {
          type: 'error',
          message: 'Conversation not found',
          conversationId,
        })
        return
      }

      try {
        const updatedManager = await deps.discussionOrchestrator.handleUserMessage(
          conversationId,
          content,
          (event) => {
            // Relay events to all subscribed clients
            switch (event.type) {
              case 'user_message':
              case 'model_response':
                if (event.message) {
                  deps.wsServer.broadcast(conversationId, {
                    type: 'message',
                    message: event.message,
                  })
                }
                break

              case 'debate_started':
                deps.wsServer.broadcast(conversationId, {
                  type: 'debate_started',
                  conversationId,
                  debateSessionId: event.debateSessionId,
                  participants: event.participants ? [...event.participants] : [],
                  maxRounds: event.maxRounds ?? 5,
                })
                break

              case 'goki_response':
                if (event.message) {
                  deps.wsServer.broadcast(conversationId, {
                    type: 'goki_response',
                    message: event.message,
                    debateSessionId: event.debateSessionId,
                  })
                }
                break

              case 'debate_round_complete':
                deps.wsServer.broadcast(conversationId, {
                  type: 'debate_round_complete',
                  conversationId,
                  debateRound: event.debateRound,
                  debateSessionId: event.debateSessionId,
                })
                break

              case 'consensus_reached':
                if (event.message) {
                  deps.wsServer.broadcast(conversationId, {
                    type: 'consensus_reached',
                    conversationId,
                    debateResult: event.debateResult,
                    debateSessionId: event.debateSessionId,
                    message: event.message,
                  })
                }
                break

              case 'error':
                deps.wsServer.broadcast(conversationId, {
                  type: 'error',
                  message: event.error ?? 'Unknown error',
                  conversationId,
                })
                break
            }
          },
        )

        deps.setConversationManager(updatedManager)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        deps.wsServer.sendTo(clientId, {
          type: 'error',
          message: errorMsg,
          conversationId,
        })
      }
    },
  }
}
