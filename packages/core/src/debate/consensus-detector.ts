import type { ModelRouter } from '../router/model-router.js'
import type { ChatMessage } from '@group-goki/shared'

export interface ConsensusResult {
  readonly hasConsensus: boolean
  readonly consensusScore: number // 0-1
  readonly reasoning: string
  readonly areasOfAgreement: readonly string[]
  readonly areasOfDisagreement: readonly string[]
}

export interface ConsensusDetector {
  readonly detect: (
    debateHistory: readonly ChatMessage[],
    currentRoundResponses: readonly ChatMessage[],
  ) => Promise<ConsensusResult>
}

export function createConsensusDetector(
  router: ModelRouter,
  judgeModelId: string,
): ConsensusDetector {
  return {
    async detect(debateHistory, currentRoundResponses) {
      const prompt = buildConsensusPrompt(debateHistory, currentRoundResponses)

      const provider = router.getProvider(judgeModelId)
      if (!provider) {
        throw new Error(`No provider found for judge model: ${judgeModelId}`)
      }
      const result = await provider.complete({
        modelId: judgeModelId,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1500,
        temperature: 0.3,
      })

      return parseConsensusResponse(result.content)
    },
  }
}

function buildConsensusPrompt(
  debateHistory: readonly ChatMessage[],
  currentRoundResponses: readonly ChatMessage[],
): string {
  const historyText = debateHistory
    .map((m) => `[${m.role}${m.modelId ? ` - ${m.modelId}` : ''}]: ${m.content}`)
    .join('\n\n')

  const currentText = currentRoundResponses
    .map((m) => `[${m.metadata?.debateRole ?? m.modelId}]: ${m.content}`)
    .join('\n\n')

  return `You are a consensus detector for an executive advisory team debate.

**Debate History:**
${historyText}

**Current Round Responses:**
${currentText}

**Your Task:**
Analyze the current round responses and determine if the gokis have reached consensus.

**Consensus Criteria:**
1. Agreement on core recommendations (not necessarily identical wording)
2. No fundamental strategic conflicts
3. Complementary rather than contradictory perspectives
4. Actionable unified direction

**Output Format (JSON):**
{
  "hasConsensus": boolean,
  "consensusScore": number (0-1, where 1 = complete agreement),
  "reasoning": "Brief explanation of why consensus was/wasn't reached",
  "areasOfAgreement": ["area1", "area2"],
  "areasOfDisagreement": ["conflict1", "conflict2"]
}

Respond ONLY with valid JSON.`
}

function parseConsensusResponse(content: string): ConsensusResult {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch =
      content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? jsonMatch[1] : content

    const parsed = JSON.parse(jsonStr!)

    return {
      hasConsensus: parsed.hasConsensus ?? false,
      consensusScore: parsed.consensusScore ?? 0,
      reasoning: parsed.reasoning ?? '',
      areasOfAgreement: parsed.areasOfAgreement ?? [],
      areasOfDisagreement: parsed.areasOfDisagreement ?? [],
    }
  } catch {
    // Fallback: no consensus if parse fails
    return {
      hasConsensus: false,
      consensusScore: 0,
      reasoning: 'Failed to parse consensus detection response',
      areasOfAgreement: [],
      areasOfDisagreement: [],
    }
  }
}
