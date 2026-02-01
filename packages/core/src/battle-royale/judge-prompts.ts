import type { Task } from '@group-goki/shared'
import type { CompletionResponse } from '../router/provider-adapter.js'

export function buildJudgePrompt(
  task: Task,
  responses: readonly CompletionResponse[],
): string {
  const responsesSection = responses
    .map((r, i) => `### Response ${i + 1}\n${r.content}\n---`)
    .join('\n\n')

  return `You are an expert evaluator for a multi-model AI competition. Rate each response objectively.

## Task
Category: ${task.category}
Complexity: ${task.complexity}
User Request: "${task.userMessage}"

## Responses to Evaluate
${responsesSection}

## Evaluation Criteria (score each 0-100)
1. **accuracy** - Factual correctness and reliability
2. **depth** - Thoroughness and insight level
3. **actionability** - Practical, implementable recommendations
4. **clarity** - Communication quality and structure
5. **creativity** - Novel approaches and unique value
6. **relevance** - Direct addressing of the user's actual need

## Rules
- Evaluate each response independently on its merits
- Do NOT consider which model generated which response
- Be harsh on factual errors and vague generalities
- Reward specific, actionable insights

## Response Format (JSON only, no other text)
{
  "evaluations": [
    {
      "responseIndex": 0,
      "overallScore": 85,
      "criteria": [
        { "name": "accuracy", "score": 90, "reasoning": "..." },
        { "name": "depth", "score": 80, "reasoning": "..." },
        { "name": "actionability", "score": 85, "reasoning": "..." },
        { "name": "clarity", "score": 90, "reasoning": "..." },
        { "name": "creativity", "score": 75, "reasoning": "..." },
        { "name": "relevance", "score": 88, "reasoning": "..." }
      ],
      "strengthSummary": "...",
      "weaknessSummary": "..."
    }
  ],
  "consensus": "Key points all responses agreed on",
  "divergences": "Key points where responses disagreed"
}`
}
