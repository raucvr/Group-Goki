import { describe, it, expect } from 'vitest'
import { parseAnalysisResponse } from '../parser.js'

describe('parseAnalysisResponse', () => {
  it('parses valid JSON response', () => {
    const response = JSON.stringify({
      category: 'technical',
      complexity: 'complex',
      subtasks: [
        {
          description: 'Analyze code structure',
          category: 'technical',
          requiredCapabilities: ['code-generation', 'code-review'],
          priority: 8,
        },
      ],
    })

    const task = parseAnalysisResponse(response, 'Analyze this code', 'conv-1')

    expect(task.userMessage).toBe('Analyze this code')
    expect(task.conversationId).toBe('conv-1')
    expect(task.category).toBe('technical')
    expect(task.complexity).toBe('complex')
    expect(task.subtasks).toHaveLength(1)
    expect(task.subtasks[0].description).toBe('Analyze code structure')
    expect(task.subtasks[0].priority).toBe(8)
    expect(task.status).toBe('analyzing')
  })

  it('parses JSON wrapped in markdown code blocks', () => {
    const response = `
Some introductory text...

\`\`\`json
{
  "category": "strategy",
  "complexity": "moderate",
  "subtasks": []
}
\`\`\`

Some conclusion...
    `.trim()

    const task = parseAnalysisResponse(response, 'Strategic planning', 'conv-2')

    expect(task.category).toBe('strategy')
    expect(task.complexity).toBe('moderate')
  })

  it('handles empty subtasks array', () => {
    const response = JSON.stringify({
      category: 'general',
      complexity: 'simple',
      subtasks: [],
    })

    const task = parseAnalysisResponse(response, 'Simple question', 'conv-3')

    expect(task.subtasks).toEqual([])
  })

  it('handles multiple subtasks', () => {
    const response = JSON.stringify({
      category: 'market-analysis',
      complexity: 'multi-domain',
      subtasks: [
        {
          description: 'Research competitors',
          category: 'research',
          requiredCapabilities: ['research'],
          priority: 9,
        },
        {
          description: 'Analyze financial data',
          category: 'financial',
          requiredCapabilities: ['financial-modeling'],
          priority: 7,
        },
        {
          description: 'Create presentation',
          category: 'creative',
          requiredCapabilities: ['creative-writing'],
          priority: 5,
        },
      ],
    })

    const task = parseAnalysisResponse(response, 'Market analysis', 'conv-4')

    expect(task.subtasks).toHaveLength(3)
    expect(task.subtasks[0].priority).toBe(9)
    expect(task.subtasks[1].priority).toBe(7)
    expect(task.subtasks[2].priority).toBe(5)
  })

  it('falls back to general/moderate on invalid JSON', () => {
    const response = 'This is not valid JSON at all!'

    const task = parseAnalysisResponse(response, 'Some message', 'conv-5')

    expect(task.category).toBe('general')
    expect(task.complexity).toBe('moderate')
    expect(task.subtasks).toEqual([])
    expect(task.userMessage).toBe('Some message')
    expect(task.conversationId).toBe('conv-5')
    expect(task.status).toBe('analyzing')
  })

  it('falls back on missing required fields', () => {
    const response = JSON.stringify({
      category: 'invalid-category',
      // missing complexity
      subtasks: 'not-an-array',
    })

    const task = parseAnalysisResponse(response, 'Message', 'conv-6')

    expect(task.category).toBe('general')
    expect(task.complexity).toBe('moderate')
    expect(task.subtasks).toEqual([])
  })

  it('falls back on invalid category value', () => {
    const response = JSON.stringify({
      category: 'cooking',
      complexity: 'simple',
      subtasks: [],
    })

    const task = parseAnalysisResponse(response, 'Message', 'conv-7')

    expect(task.category).toBe('general')
  })

  it('falls back on invalid complexity value', () => {
    const response = JSON.stringify({
      category: 'technical',
      complexity: 'extremely-hard',
      subtasks: [],
    })

    const task = parseAnalysisResponse(response, 'Message', 'conv-8')

    expect(task.complexity).toBe('moderate')
  })

  it('validates subtask priority range', () => {
    const response = JSON.stringify({
      category: 'technical',
      complexity: 'complex',
      subtasks: [
        {
          description: 'Task with invalid priority',
          category: 'technical',
          requiredCapabilities: ['code-generation'],
          priority: 15, // Invalid: > 10
        },
      ],
    })

    const task = parseAnalysisResponse(response, 'Message', 'conv-9')

    // Should fall back due to invalid priority
    expect(task.category).toBe('general')
    expect(task.complexity).toBe('moderate')
  })

  it('validates subtask requiredCapabilities', () => {
    const response = JSON.stringify({
      category: 'technical',
      complexity: 'complex',
      subtasks: [
        {
          description: 'Task with invalid capability',
          category: 'technical',
          requiredCapabilities: ['flying', 'swimming'],
          priority: 5,
        },
      ],
    })

    const task = parseAnalysisResponse(response, 'Message', 'conv-10')

    // Should fall back due to invalid capabilities
    expect(task.category).toBe('general')
    expect(task.complexity).toBe('moderate')
  })

  it('generates unique IDs for task and subtasks', () => {
    const response = JSON.stringify({
      category: 'general',
      complexity: 'simple',
      subtasks: [
        { description: 'Subtask 1', category: 'general', requiredCapabilities: [], priority: 5 },
        { description: 'Subtask 2', category: 'general', requiredCapabilities: [], priority: 5 },
      ],
    })

    const task = parseAnalysisResponse(response, 'Message', 'conv-11')

    expect(task.id).toBeDefined()
    expect(task.id.length).toBeGreaterThan(0)
    expect(task.subtasks[0].id).toBeDefined()
    expect(task.subtasks[1].id).toBeDefined()
    expect(task.subtasks[0].id).not.toBe(task.subtasks[1].id)
    expect(task.subtasks[0].parentTaskId).toBe(task.id)
    expect(task.subtasks[1].parentTaskId).toBe(task.id)
  })

  it('sets createdAt timestamp', () => {
    const response = JSON.stringify({
      category: 'general',
      complexity: 'simple',
      subtasks: [],
    })

    const before = new Date().toISOString()
    const task = parseAnalysisResponse(response, 'Message', 'conv-12')
    const after = new Date().toISOString()

    expect(task.createdAt).toBeDefined()
    expect(task.createdAt >= before).toBe(true)
    expect(task.createdAt <= after).toBe(true)
  })

  it('sets subtask status to pending', () => {
    const response = JSON.stringify({
      category: 'technical',
      complexity: 'complex',
      subtasks: [
        { description: 'Task', category: 'technical', requiredCapabilities: ['code-generation'], priority: 5 },
      ],
    })

    const task = parseAnalysisResponse(response, 'Message', 'conv-13')

    expect(task.subtasks[0].status).toBe('pending')
  })
})
