import type { Context, Next } from 'hono'
import type { JwtService } from './jwt.js'

export interface AuthContext {
  readonly userId: string
  readonly username: string
}

export function createAuthMiddleware(jwtService: JwtService) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }

    const token = authHeader.slice(7)
    const payload = jwtService.verify(token)

    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    c.set('auth', { userId: payload.userId, username: payload.username } as AuthContext)
    await next()
  }
}

export function getAuthContext(c: Context): AuthContext {
  const auth = c.get('auth') as AuthContext | undefined
  if (!auth) {
    throw new Error('Auth context not found - middleware not applied')
  }
  return auth
}
