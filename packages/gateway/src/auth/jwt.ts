import jwt from 'jsonwebtoken'

export interface TokenPayload {
  readonly userId: string
  readonly username: string
  readonly exp?: number
  readonly iat?: number
}

export interface JwtService {
  readonly generate: (userId: string, username: string) => string
  readonly verify: (token: string) => TokenPayload | null
}

export function createJwtService(secret: string, expiresIn: string = '7d'): JwtService {
  return {
    generate(userId: string, username: string): string {
      return jwt.sign(
        { userId, username },
        secret,
        { expiresIn, algorithm: 'HS256' } as jwt.SignOptions,
      )
    },

    verify(token: string): TokenPayload | null {
      try {
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] })
        if (typeof decoded === 'string') return null
        return decoded as TokenPayload
      } catch {
        return null
      }
    },
  }
}
