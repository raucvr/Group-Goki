import type { ModelRouter } from '../router/model-router.js'
import type { ChatMessage } from '@group-goki/shared'
import { escapeXml } from '../utils/prompt-sanitizer.js'

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
  const historyText =
    debateHistory.length > 0
      ? `<DEBATE_HISTORY>
${debateHistory
  .map(
    (m) =>
      `<HISTORY_ENTRY role="${escapeXml(m.role)}" model="${escapeXml(m.modelId || '')}">
${escapeXml(m.content)}
</HISTORY_ENTRY>`,
  )
  .join('\n')}
</DEBATE_HISTORY>`
      : '<DEBATE_HISTORY>None</DEBATE_HISTORY>'

  const currentText = `<CURRENT_ROUND>
${currentRoundResponses
  .map(
    (m) =>
      `<RESPONSE role="${escapeXml(String(m.metadata?.debateRole ?? m.modelId))}">
${escapeXml(m.content)}
</RESPONSE>`,
  )
  .join('\n')}
</CURRENT_ROUND>`

  return `You are a consensus detector for an executive advisory team debate.

${historyText}

${currentText}

**Your Task:**
Analyze the responses in <CURRENT_ROUND> and determine if the gokis have reached consensus.

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

    // Validate and sanitize all fields to prevent LLM output manipulation
    const hasConsensus =
      typeof parsed.hasConsensus === 'boolean' ? parsed.hasConsensus : false

    const rawScore =
      typeof parsed.consensusScore === 'number' ? parsed.consensusScore : 0
    const consensusScore = Math.max(0, Math.min(1, rawScore)) // Clamp to 0-1 range

    const reasoning =
      typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 2000) : ''

    const areasOfAgreement = Array.isArray(parsed.areasOfAgreement)
      ? parsed.areasOfAgreement
          .filter((x: unknown): x is string => typeof x === 'string')
          .slice(0, 20)
      : []

    const areasOfDisagreement = Array.isArray(parsed.areasOfDisagreement)
      ? parsed.areasOfDisagreement
          .filter((x: unknown): x is string => typeof x === 'string')
          .slice(0, 20)
      : []

    return {
      hasConsensus,
      consensusScore,
      reasoning,
      areasOfAgreement,
      areasOfDisagreement,
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
