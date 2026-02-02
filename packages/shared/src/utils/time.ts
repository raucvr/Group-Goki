export function now(): string {
  return new Date().toISOString()
}

export function isExpired(isoDate: string, ttlMs: number): boolean {
  const then = new Date(isoDate).getTime()
  return Date.now() - then > ttlMs
}
