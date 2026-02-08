import type { ChatMessage } from '@group-goki/shared'
import { createId, now } from '@group-goki/shared'
import type { ModelRouter } from '../router/model-router.js'
import type { GokiRosterService } from '../goki-roster/roster-service.js'
import type { GokiRole } from '../db/repositories/roster-repository.js'
import type { ConsensusDetector, ConsensusResult } from './consensus-detector.js'
import { escapeXml } from '../utils/prompt-sanitizer.js'

export interface DebateConfig {
  readonly maxRounds: number
  readonly consensusThreshold: number
  readonly enableConsensusCheck: boolean
  readonly turnOrder: readonly GokiRole[]
}

export interface DebateRound {
  readonly roundNumber: number
  readonly responses: readonly ChatMessage[]
  readonly consensusCheck?: ConsensusResult
}

export interface DebateResult {
  readonly rounds: readonly DebateRound[]
  readonly status: 'consensus_reached' | 'max_rounds_exceeded' | 'error'
  readonly finalRecommendation: string
  readonly totalRounds: number
  readonly consensusScore?: number
  readonly areasOfAgreement: readonly string[]
}

export interface DebateEngine {
  readonly initiateDebate: (
    conversationId: string,
    userMessage: string,
    userMessageId: string,
    context: readonly { role: string; content: string }[],
    onRoundComplete?: (round: DebateRound) => void,
  ) => Promise<DebateResult>
}

const DEFAULT_CONFIG: DebateConfig = {
  maxRounds: 5,
  consensusThreshold: 0.8,
  enableConsensusCheck: true,
  turnOrder: ['strategy', 'tech', 'product', 'execution'],
}

export function createDebateEngine(deps: {
  readonly router: ModelRouter
  readonly rosterService: GokiRosterService
  readonly consensusDetector: ConsensusDetector
  readonly config?: Partial<DebateConfig>
}): DebateEngine {
  const config: DebateConfig = { ...DEFAULT_CONFIG, ...deps.config }

  return {
    async initiateDebate(conversationId, userMessage, userMessageId, context, onRoundComplete) {
      const rounds: DebateRound[] = []
      const debateHistory: ChatMessage[] = []

      // Initial context: user message + conversation history
      const currentContext = [...context, { role: 'user', content: userMessage }]

      for (let roundNum = 1; roundNum <= config.maxRounds; roundNum++) {
        const roundResponses: ChatMessage[] = []

        // Each goki responds in turn order
        for (const role of config.turnOrder) {
          const modelId = await deps.rosterService.getSpecialistForRole(role)
          if (!modelId) {
            // Skip roles without assigned specialists
            continue
          }

          // Build prompt with full debate history
          const gokiPrompt = buildGokiPrompt(role, userMessage, debateHistory, roundNum)

          const fullContext = [
            ...currentContext,
            ...debateHistory.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: gokiPrompt },
          ]

          try {
            // Get goki response
            const provider = deps.router.getProvider(modelId)
            if (!provider) {
              throw new Error(`No provider found for model: ${modelId}`)
            }
            const response = await provider.complete({
              modelId,
              messages: fullContext,
              maxTokens: 2000,
              temperature: 0.7,
            })

            const gokiMessage: ChatMessage = {
              id: createId(),
              conversationId,
              role: 'model',
              modelId,
              content: response.content,
              mentions: [],
              parentMessageId: userMessageId,
              metadata: {
                debateRole: role,
                debateRound: roundNum,
              },
              createdAt: now(),
            }

            roundResponses.push(gokiMessage)
            debateHistory.push(gokiMessage)
          } catch (error) {
            // If a goki fails, continue with others
            const errorMsg = error instanceof Error ? error.message : String(error)
            const errorMessage: ChatMessage = {
              id: createId(),
              conversationId,
              role: 'system',
              content: `[${role} goki error: ${errorMsg}]`,
              mentions: [],
              parentMessageId: userMessageId,
              metadata: {
                debateRole: role,
                debateRound: roundNum,
                error: true,
              },
              createdAt: now(),
            }
            roundResponses.push(errorMessage)
          }
        }

        // Check consensus after round
        let consensusCheck: ConsensusResult | undefined
        if (config.enableConsensusCheck && roundNum > 1) {
          try {
            consensusCheck = await deps.consensusDetector.detect(
              debateHistory.slice(0, -roundResponses.length), // Previous history
              roundResponses, // Current round
            )
          } catch {
            // Consensus detection failed, continue debate
            consensusCheck = undefined
          }
        }

        const round: DebateRound = {
          roundNumber: roundNum,
          responses: roundResponses,
          consensusCheck,
        }

        rounds.push(round)
        onRoundComplete?.(round)

        // Check if consensus reached
        if (
          consensusCheck?.hasConsensus &&
          consensusCheck.consensusScore >= config.consensusThreshold
        ) {
          return {
            rounds,
            status: 'consensus_reached',
            finalRecommendation: synthesizeRecommendation(roundResponses, consensusCheck),
            totalRounds: roundNum,
            consensusScore: consensusCheck.consensusScore,
            areasOfAgreement: consensusCheck.areasOfAgreement,
          }
        }
      }

      // Max rounds exceeded
      const lastRound = rounds[rounds.length - 1]
      return {
        rounds,
        status: 'max_rounds_exceeded',
        finalRecommendation: synthesizeRecommendation(
          lastRound?.responses ?? [],
          lastRound?.consensusCheck,
        ),
        totalRounds: config.maxRounds,
        consensusScore: lastRound?.consensusCheck?.consensusScore,
        areasOfAgreement: lastRound?.consensusCheck?.areasOfAgreement ?? [],
      }
    },
  }
}

function buildGokiPrompt(
  role: GokiRole,
  userMessage: string,
  debateHistory: readonly ChatMessage[],
  roundNumber: number,
): string {
  const roleDescriptions: Record<GokiRole, string> = {
    strategy:
      'You are the Strategy Advisor. Focus on business direction, market positioning, competitive analysis, and long-term planning.',
    tech: 'You are the Tech Lead. Focus on architecture, scalability, infrastructure, technical feasibility, and engineering excellence.',
    product:
      'You are the Product Expert. Focus on user experience, feature prioritization, product-market fit, and roadmap planning.',
    execution:
      'You are the Execution Manager. Focus on resource allocation, timeline planning, dependency mapping, and operational efficiency.',
  }

  const debateContext =
    debateHistory.length > 0
      ? `\n\n<DEBATE_HISTORY>
${debateHistory
  .map(
    (m) =>
      `<MESSAGE role="${escapeXml(String(m.metadata?.debateRole ?? 'unknown'))}">
${escapeXml(m.content)}
</MESSAGE>`,
  )
  .join('\n')}
</DEBATE_HISTORY>`
      : ''

  return `${roleDescriptions[role]}

<USER_REQUEST>
${escapeXml(userMessage)}
</USER_REQUEST>
${debateContext}

**Round ${roundNumber} Instructions:**
${
  roundNumber === 1
    ? 'Provide your initial analysis and recommendations from your domain perspective.'
    : 'Review the previous goki responses in <DEBATE_HISTORY>. Build on their insights, address gaps, challenge assumptions if needed, and refine the collective recommendation.'
}

Be concise but thorough. Focus on actionable insights.`
}

function synthesizeRecommendation(
  responses: readonly ChatMessage[],
  consensusCheck?: ConsensusResult,
): string {
  if (consensusCheck?.hasConsensus) {
    const agreementText =
      consensusCheck.areasOfAgreement.length > 0
        ? `**Consensus Areas:**\n${consensusCheck.areasOfAgreement.map((a) => `- ${a}`).join('\n')}`
        : ''

    return `**Final Recommendation (Consensus Score: ${(consensusCheck.consensusScore * 100).toFixed(0)}%)**

${consensusCheck.reasoning}

${agreementText}

**Goki Recommendations:**
${responses
  .filter((r) => !r.metadata?.error)
  .map((r) => `- **${r.metadata?.debateRole}**: ${r.content.slice(0, 200)}...`)
  .join('\n')}`
  }

  return `**Goki Advisory Summary (No Full Consensus)**

${responses
  .filter((r) => !r.metadata?.error)
  .map((r) => `**${r.metadata?.debateRole}**:\n${r.content}\n`)
  .join('\n---\n')}`
}
