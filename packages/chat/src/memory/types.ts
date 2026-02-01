export interface MemoryCategory {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly parentCategoryId?: string
  readonly createdAt: string
}

export interface MemoryItem {
  readonly id: string
  readonly categoryId: string
  readonly content: string
  readonly importance: number
  readonly accessCount: number
  readonly lastAccessedAt?: string
  readonly createdAt: string
}

export interface MemoryResource {
  readonly id: string
  readonly itemId: string
  readonly resourceType: 'conversation' | 'document' | 'evaluation'
  readonly sourceId: string
  readonly content: string
  readonly createdAt: string
}

export interface MemorySearchResult {
  readonly item: MemoryItem
  readonly category: MemoryCategory
  readonly relevanceScore: number
}
