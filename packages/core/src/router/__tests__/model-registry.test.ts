import { describe, it, expect } from 'vitest'
import { createModelRegistry } from '../model-registry.js'
import type { ModelRegistryEntry, ModelCapability, ModelTier } from '@group-goki/shared'

const createMockEntry = (id: string, overrides: Partial<ModelRegistryEntry> = {}): ModelRegistryEntry => ({
  id,
  name: `Model ${id}`,
  provider: 'openai',
  contextWindow: 128000,
  maxOutputTokens: 4096,
  costPerInputToken: 0.000005,
  costPerOutputToken: 0.000015,
  capabilities: ['code-generation', 'strategy'] as ModelCapability[],
  tier: 'frontier' as ModelTier,
  active: true,
  ...overrides,
})

describe('createModelRegistry', () => {
  it('creates empty registry when no entries provided', () => {
    const registry = createModelRegistry()

    expect(registry.size()).toBe(0)
    expect(registry.getAll()).toEqual([])
    expect(registry.getActive()).toEqual([])
  })

  it('returns all entries', () => {
    const entries = [
      createMockEntry('model-1'),
      createMockEntry('model-2'),
    ]
    const registry = createModelRegistry(entries)

    expect(registry.size()).toBe(2)
    expect(registry.getAll()).toHaveLength(2)
    expect(registry.getAll().map(e => e.id)).toContain('model-1')
    expect(registry.getAll().map(e => e.id)).toContain('model-2')
  })

  it('gets entry by id', () => {
    const entry = createMockEntry('model-test')
    const registry = createModelRegistry([entry])

    const found = registry.getById('model-test')
    expect(found).toBeDefined()
    expect(found?.id).toBe('model-test')

    const notFound = registry.getById('non-existent')
    expect(notFound).toBeUndefined()
  })

  it('returns only active entries from getActive', () => {
    const entries = [
      createMockEntry('active-1', { active: true }),
      createMockEntry('inactive-1', { active: false }),
      createMockEntry('active-2', { active: true }),
    ]
    const registry = createModelRegistry(entries)

    const active = registry.getActive()
    expect(active).toHaveLength(2)
    expect(active.every(e => e.active)).toBe(true)
    expect(active.map(e => e.id)).toContain('active-1')
    expect(active.map(e => e.id)).toContain('active-2')
    expect(active.map(e => e.id)).not.toContain('inactive-1')
  })

  it('gets entries by capability', () => {
    const entries = [
      createMockEntry('model-1', {
        capabilities: ['code-generation', 'strategy'] as ModelCapability[],
        active: true
      }),
      createMockEntry('model-2', {
        capabilities: ['strategy'] as ModelCapability[],
        active: true
      }),
      createMockEntry('model-3', {
        capabilities: ['creative-writing'] as ModelCapability[],
        active: true
      }),
      createMockEntry('model-4', {
        capabilities: ['code-generation'] as ModelCapability[],
        active: false
      }),
    ]
    const registry = createModelRegistry(entries)

    const codeModels = registry.getByCapability('code-generation')
    expect(codeModels).toHaveLength(1)
    expect(codeModels[0].id).toBe('model-1')
  })

  it('gets entries by tier', () => {
    const entries = [
      createMockEntry('frontier-1', { tier: 'frontier' as ModelTier, active: true }),
      createMockEntry('strong-1', { tier: 'strong' as ModelTier, active: true }),
      createMockEntry('frontier-2', { tier: 'frontier' as ModelTier, active: false }),
    ]
    const registry = createModelRegistry(entries)

    const frontier = registry.getByTier('frontier')
    expect(frontier).toHaveLength(1)
    expect(frontier[0].id).toBe('frontier-1')
  })

  it('registers new entry immutably', () => {
    const registry = createModelRegistry([createMockEntry('existing')])
    expect(registry.size()).toBe(1)

    const newRegistry = registry.register(createMockEntry('new'))

    expect(newRegistry.size()).toBe(2)
    expect(registry.size()).toBe(1)
    expect(newRegistry.getById('new')).toBeDefined()
    expect(registry.getById('new')).toBeUndefined()
  })

  it('deactivates entry immutably', () => {
    const registry = createModelRegistry([createMockEntry('to-deactivate', { active: true })])
    expect(registry.getById('to-deactivate')?.active).toBe(true)

    const newRegistry = registry.deactivate('to-deactivate')

    expect(newRegistry.getById('to-deactivate')?.active).toBe(false)
    expect(registry.getById('to-deactivate')?.active).toBe(true)
  })

  it('activates entry immutably', () => {
    const registry = createModelRegistry([createMockEntry('to-activate', { active: false })])
    expect(registry.getById('to-activate')?.active).toBe(false)

    const newRegistry = registry.activate('to-activate')

    expect(newRegistry.getById('to-activate')?.active).toBe(true)
    expect(registry.getById('to-activate')?.active).toBe(false)
  })

  it('updateCapabilities changes immutably', () => {
    const registry = createModelRegistry([
      createMockEntry('to-update', { capabilities: ['strategy'] as ModelCapability[] })
    ])

    const newRegistry = registry.updateCapabilities('to-update', ['code-generation', 'research'] as ModelCapability[])

    expect(newRegistry.getById('to-update')?.capabilities).toEqual(['code-generation', 'research'])
    expect(registry.getById('to-update')?.capabilities).toEqual(['strategy'])
  })

  it('handles deactivate/activate of non-existent entry gracefully', () => {
    const registry = createModelRegistry([createMockEntry('existing')])

    const deactivated = registry.deactivate('non-existent')
    expect(deactivated.size()).toBe(1)

    const activated = registry.activate('non-existent')
    expect(activated.size()).toBe(1)
  })

  it('handles updateCapabilities of non-existent entry gracefully', () => {
    const registry = createModelRegistry([createMockEntry('existing')])

    const updated = registry.updateCapabilities('non-existent', ['strategy'] as ModelCapability[])
    expect(updated.size()).toBe(1)
    expect(updated.getById('existing')).toBeDefined()
  })
})
