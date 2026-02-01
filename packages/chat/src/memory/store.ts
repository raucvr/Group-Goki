import { createId, now } from '@group-goki/shared'
import type { MemoryCategory, MemoryItem, MemoryResource, MemorySearchResult } from './types.js'

export interface MemoryStore {
  readonly categories: ReadonlyMap<string, MemoryCategory>
  readonly items: ReadonlyMap<string, MemoryItem>
  readonly resources: ReadonlyMap<string, MemoryResource>
}

export interface MemoryManager {
  readonly getStore: () => MemoryStore
  readonly createCategory: (name: string, description?: string, parentId?: string) => {
    readonly manager: MemoryManager
    readonly category: MemoryCategory
  }
  readonly addItem: (categoryId: string, content: string, importance?: number) => {
    readonly manager: MemoryManager
    readonly item: MemoryItem
  }
  readonly addResource: (
    itemId: string,
    resourceType: 'conversation' | 'document' | 'evaluation',
    sourceId: string,
    content: string,
  ) => { readonly manager: MemoryManager; readonly resource: MemoryResource }
  readonly search: (query: string, limit?: number) => readonly MemorySearchResult[]
  readonly recordAccess: (itemId: string) => MemoryManager
  readonly getCategory: (id: string) => MemoryCategory | undefined
  readonly getCategoryItems: (categoryId: string) => readonly MemoryItem[]
  readonly getItemResources: (itemId: string) => readonly MemoryResource[]
  readonly pruneByImportance: (threshold: number) => MemoryManager
}

export function createMemoryManager(initialStore?: MemoryStore): MemoryManager {
  const store: MemoryStore = initialStore ?? {
    categories: new Map(),
    items: new Map(),
    resources: new Map(),
  }

  function withStore(nextStore: MemoryStore): MemoryManager {
    return createMemoryManager(nextStore)
  }

  return {
    getStore() {
      return store
    },

    createCategory(name, description, parentId) {
      const category: MemoryCategory = {
        id: createId(),
        name,
        description,
        parentCategoryId: parentId,
        createdAt: now(),
      }

      const next = new Map(store.categories)
      next.set(category.id, category)

      const manager = withStore({ ...store, categories: next })
      return { manager, category }
    },

    addItem(categoryId, content, importance = 0.5) {
      const item: MemoryItem = {
        id: createId(),
        categoryId,
        content,
        importance,
        accessCount: 0,
        createdAt: now(),
      }

      const next = new Map(store.items)
      next.set(item.id, item)

      const manager = withStore({ ...store, items: next })
      return { manager, item }
    },

    addResource(itemId, resourceType, sourceId, content) {
      const resource: MemoryResource = {
        id: createId(),
        itemId,
        resourceType,
        sourceId,
        content,
        createdAt: now(),
      }

      const next = new Map(store.resources)
      next.set(resource.id, resource)

      const manager = withStore({ ...store, resources: next })
      return { manager, resource }
    },

    search(query, limit = 10) {
      const queryLower = query.toLowerCase()
      const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2)

      const results: MemorySearchResult[] = []

      for (const item of store.items.values()) {
        const contentLower = item.content.toLowerCase()
        let relevanceScore = 0

        // Term matching
        for (const term of queryTerms) {
          if (contentLower.includes(term)) {
            relevanceScore += 1
          }
        }

        // Boost by importance
        relevanceScore += item.importance * 0.5

        // Boost by recency of access
        if (item.lastAccessedAt) {
          const age = Date.now() - new Date(item.lastAccessedAt).getTime()
          const hoursOld = age / (1000 * 60 * 60)
          if (hoursOld < 24) relevanceScore += 0.5
          else if (hoursOld < 168) relevanceScore += 0.2
        }

        // Boost by access frequency
        relevanceScore += Math.min(item.accessCount * 0.1, 1)

        if (relevanceScore > 0) {
          const category = store.categories.get(item.categoryId)
          if (category) {
            results.push({ item, category, relevanceScore })
          }
        }
      }

      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
    },

    recordAccess(itemId) {
      const item = store.items.get(itemId)
      if (!item) return withStore(store)

      const updated: MemoryItem = {
        ...item,
        accessCount: item.accessCount + 1,
        lastAccessedAt: now(),
      }

      const next = new Map(store.items)
      next.set(itemId, updated)

      return withStore({ ...store, items: next })
    },

    getCategory(id) {
      return store.categories.get(id)
    },

    getCategoryItems(categoryId) {
      return [...store.items.values()].filter((i) => i.categoryId === categoryId)
    },

    getItemResources(itemId) {
      return [...store.resources.values()].filter((r) => r.itemId === itemId)
    },

    pruneByImportance(threshold) {
      const nextItems = new Map(store.items)
      const removedItemIds = new Set<string>()

      for (const [id, item] of nextItems) {
        if (item.importance < threshold) {
          nextItems.delete(id)
          removedItemIds.add(id)
        }
      }

      // Also remove resources for pruned items
      const nextResources = new Map(store.resources)
      for (const [id, resource] of nextResources) {
        if (removedItemIds.has(resource.itemId)) {
          nextResources.delete(id)
        }
      }

      return withStore({ ...store, items: nextItems, resources: nextResources })
    },
  }
}
