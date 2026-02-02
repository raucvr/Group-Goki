import { z } from 'zod'
import { ModelCapabilitySchema } from './models.js'

export const TaskCategorySchema = z.enum([
  'strategy',
  'technical',
  'market-analysis',
  'financial',
  'legal',
  'creative',
  'research',
  'planning',
  'general',
])
export type TaskCategory = z.infer<typeof TaskCategorySchema>

export const TaskComplexitySchema = z.enum(['simple', 'moderate', 'complex', 'multi-domain'])
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>

export const TaskStatusSchema = z.enum(['analyzing', 'competing', 'discussing', 'complete'])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const SubtaskStatusSchema = z.enum(['pending', 'in-progress', 'complete', 'failed'])
export type SubtaskStatus = z.infer<typeof SubtaskStatusSchema>

export const SubtaskSchema = z.object({
  id: z.string(),
  parentTaskId: z.string(),
  category: TaskCategorySchema,
  description: z.string(),
  requiredCapabilities: z.array(ModelCapabilitySchema),
  priority: z.number().int().min(1).max(10),
  status: SubtaskStatusSchema,
})
export type Subtask = z.infer<typeof SubtaskSchema>

export const TaskSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  userMessage: z.string(),
  category: TaskCategorySchema,
  subtasks: z.array(SubtaskSchema).default([]),
  complexity: TaskComplexitySchema,
  status: TaskStatusSchema,
  createdAt: z.string(),
})
export type Task = z.infer<typeof TaskSchema>
