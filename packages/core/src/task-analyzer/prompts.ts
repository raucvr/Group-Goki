export function buildAnalysisPrompt(
  userMessage: string,
  conversationContext: readonly { role: string; content: string }[],
): string {
  const contextSection =
    conversationContext.length > 0
      ? `\n## Recent Conversation Context\n${conversationContext
          .slice(-5)
          .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
          .join('\n')}`
      : ''

  return `You are a task analysis system for a multi-model AI group chat. Analyze the user's request and provide a structured breakdown.

## User Message
"${userMessage}"
${contextSection}

## Instructions
1. Classify the primary task category
2. Assess overall complexity
3. Decompose into subtasks if complexity is "complex" or "multi-domain"
4. For each subtask, identify required AI capabilities

## Response Format (JSON only, no other text)
{
  "category": "strategy" | "technical" | "market-analysis" | "financial" | "legal" | "creative" | "research" | "planning" | "general",
  "complexity": "simple" | "moderate" | "complex" | "multi-domain",
  "subtasks": [
    {
      "description": "...",
      "category": "...",
      "requiredCapabilities": ["strategy", "research", ...],
      "priority": 1
    }
  ]
}`
}
