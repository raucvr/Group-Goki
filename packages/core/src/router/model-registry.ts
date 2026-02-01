import type { ModelRegistryEntry, ModelCapability, ModelTier } from '@group-goki/shared'

export interface ModelRegistry {
  readonly getAll: () => readonly ModelRegistryEntry[]
  readonly getById: (id: string) => ModelRegistryEntry | undefined
  readonly getByCapability: (capability: ModelCapability) => readonly ModelRegistryEntry[]
  readonly getByTier: (tier: ModelTier) => readonly ModelRegistryEntry[]
  readonly getActive: () => readonly ModelRegistryEntry[]
  readonly register: (entry: ModelRegistryEntry) => ModelRegistry
  readonly deactivate: (id: string) => ModelRegistry
  readonly activate: (id: string) => ModelRegistry
  readonly updateCapabilities: (id: string, capabilities: readonly ModelCapability[]) => ModelRegistry
  readonly size: () => number
}

export function createModelRegistry(
  initialEntries: readonly ModelRegistryEntry[] = [],
): ModelRegistry {
  const entriesMap: ReadonlyMap<string, ModelRegistryEntry> = new Map(
    initialEntries.map((e) => [e.id, e]),
  )

  const allEntries = (): readonly ModelRegistryEntry[] => [...entriesMap.values()]

  const withUpdatedEntry = (
    id: string,
    updater: (entry: ModelRegistryEntry) => ModelRegistryEntry,
  ): ModelRegistry => {
    const existing = entriesMap.get(id)
    if (!existing) return createModelRegistry(allEntries())
    return createModelRegistry(
      allEntries().map((e) => (e.id === id ? updater(e) : e)),
    )
  }

  return {
    getAll: allEntries,

    getById: (id) => entriesMap.get(id),

    getByCapability: (capability) =>
      allEntries().filter(
        (e) => e.active && e.capabilities.includes(capability),
      ),

    getByTier: (tier) =>
      allEntries().filter((e) => e.active && e.tier === tier),

    getActive: () => allEntries().filter((e) => e.active),

    register: (entry) =>
      createModelRegistry([
        ...allEntries().filter((e) => e.id !== entry.id),
        entry,
      ]),

    deactivate: (id) =>
      withUpdatedEntry(id, (e) => ({ ...e, active: false })),

    activate: (id) =>
      withUpdatedEntry(id, (e) => ({ ...e, active: true })),

    updateCapabilities: (id, capabilities) =>
      withUpdatedEntry(id, (e) => ({ ...e, capabilities: [...capabilities] })),

    size: () => entriesMap.size,
  }
}
