/**
 * Immutable array operations - never mutate the original.
 */

export function append<T>(arr: readonly T[], item: T): readonly T[] {
  return [...arr, item]
}

export function removeAt<T>(arr: readonly T[], index: number): readonly T[] {
  return [...arr.slice(0, index), ...arr.slice(index + 1)]
}

export function updateAt<T>(arr: readonly T[], index: number, updater: (item: T) => T): readonly T[] {
  return arr.map((item, i) => (i === index ? updater(item) : item))
}

export function replaceWhere<T>(
  arr: readonly T[],
  predicate: (item: T) => boolean,
  updater: (item: T) => T,
): readonly T[] {
  return arr.map((item) => (predicate(item) ? updater(item) : item))
}

/**
 * Immutable Map operations.
 */

export function mapSet<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): ReadonlyMap<K, V> {
  const next = new Map(map)
  next.set(key, value)
  return next
}

export function mapDelete<K, V>(map: ReadonlyMap<K, V>, key: K): ReadonlyMap<K, V> {
  const next = new Map(map)
  next.delete(key)
  return next
}

export function mapUpdate<K, V>(
  map: ReadonlyMap<K, V>,
  key: K,
  updater: (value: V) => V,
): ReadonlyMap<K, V> {
  const existing = map.get(key)
  if (existing === undefined) return map
  return mapSet(map, key, updater(existing))
}
