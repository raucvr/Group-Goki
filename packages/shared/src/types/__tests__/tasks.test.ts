import { describe, it, expect } from 'vitest'
import {
  TaskCategorySchema,
  TaskComplexitySchema,
  TaskStatusSchema,
  SubtaskStatusSchema,
  SubtaskSchema,
  TaskSchema,
} from '../tasks.js'

describe('TaskCategorySchema', () => {
  const validCategories = [
    'strategy', 'technical', 'market-analysis', 'financial',
    'legal', 'creative', 'research', 'planning', 'general',
  ]

  it.each(validCategories)('accepts "%s"', (cat) => {
    expect(TaskCategorySchema.parse(cat)).toBe(cat)
  })

  it('rejects unknown category', () => {
    expect(() => TaskCategorySchema.parse('cooking')).toThrow()
  })
})

describe('TaskComplexitySchema', () => {
  it.each(['simple', 'moderate', 'complex', 'multi-domain'])('accepts "%s"', (c) => {
    expect(TaskComplexitySchema.parse(c)).toBe(c)
  })

  it('rejects unknown complexity', () => {
    expect(() => TaskComplexitySchema.parse('trivial')).toThrow()
  })
})

describe('TaskStatusSchema', () => {
  it.each(['analyzing', 'competing', 'discussing', 'complete'])('accepts "%s"', (s) => {
    expect(TaskStatusSchema.parse(s)).toBe(s)
  })
})

describe('SubtaskStatusSchema', () => {
  it.each(['pending', 'in-progress', 'complete', 'failed'])('accepts "%s"', (s) => {
    expect(SubtaskStatusSchema.parse(s)).toBe(s)
  })
})

describe('SubtaskSchema', () => {
  const validSubtask = {
    id: 'sub-1',
    parentTaskId: 'task-1',
    category: 'technical' as const,
    description: 'Analyze code quality',
    requiredCapabilities: ['code-review'] as const,
    priority: 5,
    status: 'pending' as const,
  }

  it('parses a valid subtask', () => {
    const result = SubtaskSchema.parse(validSubtask)
    expect(result.id).toBe('sub-1')
    expect(result.priority).toBe(5)
  })

  it('rejects priority below 1', () => {
    expect(() => SubtaskSchema.parse({ ...validSubtask, priority: 0 })).toThrow()
  })

  it('rejects priority above 10', () => {
    expect(() => SubtaskSchema.parse({ ...validSubtask, priority: 11 })).toThrow()
  })

  it('accepts boundary priorities 1 and 10', () => {
    expect(SubtaskSchema.parse({ ...validSubtask, priority: 1 }).priority).toBe(1)
    expect(SubtaskSchema.parse({ ...validSubtask, priority: 10 }).priority).toBe(10)
  })

  it('rejects non-integer priority', () => {
    expect(() => SubtaskSchema.parse({ ...validSubtask, priority: 5.5 })).toThrow()
  })
})

describe('TaskSchema', () => {
  const validTask = {
    id: 'task-1',
    conversationId: 'conv-1',
    userMessage: 'Analyze the market',
    category: 'market-analysis' as const,
    complexity: 'complex' as const,
    status: 'analyzing' as const,
    createdAt: '2025-01-01T00:00:00.000Z',
  }

  it('parses a valid task with default subtasks', () => {
    const result = TaskSchema.parse(validTask)
    expect(result.subtasks).toEqual([])
  })

  it('parses a task with explicit subtasks', () => {
    const withSubtasks = {
      ...validTask,
      subtasks: [
        {
          id: 'sub-1',
          parentTaskId: 'task-1',
          category: 'technical',
          description: 'Review code',
          requiredCapabilities: ['code-review'],
          priority: 3,
          status: 'pending',
        },
      ],
    }
    const result = TaskSchema.parse(withSubtasks)
    expect(result.subtasks).toHaveLength(1)
  })

  it('rejects missing required fields', () => {
    expect(() => TaskSchema.parse({})).toThrow()
    expect(() => TaskSchema.parse({ id: 'x' })).toThrow()
  })
})
