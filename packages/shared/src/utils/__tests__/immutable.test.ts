import { describe, it, expect } from 'vitest'
import {
  append,
  removeAt,
  updateAt,
  replaceWhere,
  mapSet,
  mapDelete,
  mapUpdate,
} from '../immutable.js'

describe('append', () => {
  it('adds item to end of array', () => {
    const original = [1, 2, 3] as const
    const result = append(original, 4)
    expect(result).toEqual([1, 2, 3, 4])
  })

  it('does not mutate original array', () => {
    const original = [1, 2, 3]
    const frozen = Object.freeze([...original])
    append(frozen, 4)
    expect(frozen).toEqual([1, 2, 3])
  })

  it('works with empty array', () => {
    expect(append([], 'a')).toEqual(['a'])
  })
})

describe('removeAt', () => {
  it('removes item at given index', () => {
    expect(removeAt([1, 2, 3], 1)).toEqual([1, 3])
  })

  it('removes first item', () => {
    expect(removeAt([1, 2, 3], 0)).toEqual([2, 3])
  })

  it('removes last item', () => {
    expect(removeAt([1, 2, 3], 2)).toEqual([1, 2])
  })

  it('does not mutate original array', () => {
    const original = Object.freeze([1, 2, 3])
    removeAt(original, 1)
    expect(original).toEqual([1, 2, 3])
  })
})

describe('updateAt', () => {
  it('updates item at given index', () => {
    const result = updateAt([1, 2, 3], 1, (n) => n * 10)
    expect(result).toEqual([1, 20, 3])
  })

  it('does not modify other items', () => {
    const result = updateAt(['a', 'b', 'c'], 0, (s) => s.toUpperCase())
    expect(result).toEqual(['A', 'b', 'c'])
  })

  it('does not mutate original array', () => {
    const original = Object.freeze([1, 2, 3])
    updateAt(original, 0, (n) => n + 100)
    expect(original).toEqual([1, 2, 3])
  })
})

describe('replaceWhere', () => {
  it('replaces items matching predicate', () => {
    const result = replaceWhere([1, 2, 3, 4], (n) => n % 2 === 0, (n) => n * 10)
    expect(result).toEqual([1, 20, 3, 40])
  })

  it('returns identical array when no items match', () => {
    const original = [1, 3, 5]
    const result = replaceWhere(original, (n) => n > 10, (n) => n * 2)
    expect(result).toEqual([1, 3, 5])
  })

  it('does not mutate original array', () => {
    const original = Object.freeze([1, 2, 3])
    replaceWhere(original, () => true, (n) => n + 1)
    expect(original).toEqual([1, 2, 3])
  })
})

describe('mapSet', () => {
  it('sets a new key', () => {
    const original = new Map([['a', 1]])
    const result = mapSet(original, 'b', 2)
    expect(result.get('b')).toBe(2)
    expect(result.size).toBe(2)
  })

  it('overwrites existing key', () => {
    const original = new Map([['a', 1]])
    const result = mapSet(original, 'a', 99)
    expect(result.get('a')).toBe(99)
    expect(result.size).toBe(1)
  })

  it('does not mutate original map', () => {
    const original = new Map([['a', 1]])
    mapSet(original, 'b', 2)
    expect(original.size).toBe(1)
    expect(original.has('b')).toBe(false)
  })
})

describe('mapDelete', () => {
  it('removes an existing key', () => {
    const original = new Map([['a', 1], ['b', 2]])
    const result = mapDelete(original, 'a')
    expect(result.has('a')).toBe(false)
    expect(result.size).toBe(1)
  })

  it('returns new map even when key does not exist', () => {
    const original = new Map([['a', 1]])
    const result = mapDelete(original, 'z')
    expect(result.size).toBe(1)
    expect(result).not.toBe(original)
  })

  it('does not mutate original map', () => {
    const original = new Map([['a', 1], ['b', 2]])
    mapDelete(original, 'a')
    expect(original.size).toBe(2)
  })
})

describe('mapUpdate', () => {
  it('updates value for existing key', () => {
    const original = new Map([['count', 5]])
    const result = mapUpdate(original, 'count', (v) => v + 1)
    expect(result.get('count')).toBe(6)
  })

  it('returns original map when key does not exist', () => {
    const original = new Map([['a', 1]])
    const result = mapUpdate(original, 'z', (v) => v + 1)
    expect(result).toBe(original)
  })

  it('does not mutate original map', () => {
    const original = new Map([['count', 5]])
    mapUpdate(original, 'count', (v) => v + 100)
    expect(original.get('count')).toBe(5)
  })
})
