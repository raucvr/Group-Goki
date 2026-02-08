/**
 * Escape XML special characters to prevent prompt injection attacks.
 * Used to wrap user-supplied content in structured prompts.
 */
export function escapeXml(text: string | undefined): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Wrap content in XML-like tags for structured prompts.
 * Helps LLMs distinguish between system instructions and user content.
 */
export function wrapInTag(
  tagName: string,
  content: string,
  attributes?: Record<string, string>,
): string {
  const attrStr = attributes
    ? ' ' +
      Object.entries(attributes)
        .map(([k, v]) => `${k}="${escapeXml(v)}"`)
        .join(' ')
    : ''
  return `<${tagName}${attrStr}>\n${content}\n</${tagName}>`
}
