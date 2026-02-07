import { describe, it, expect, beforeEach } from 'vitest'
import { createJwtService } from '../jwt.js'
import jwt from 'jsonwebtoken'

describe('JwtService', () => {
  const secret = 'test-secret-min-32-chars-for-testing-purposes'
  let jwtService: ReturnType<typeof createJwtService>

  beforeEach(() => {
    jwtService = createJwtService(secret)
  })

  describe('generate', () => {
    it('generates a valid JWT token', () => {
      const token = jwtService.generate('user-123', 'testuser')

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
    })

    it('includes userId and username in payload', () => {
      const token = jwtService.generate('user-456', 'alice')
      const decoded = jwt.decode(token) as { userId: string; username: string }

      expect(decoded.userId).toBe('user-456')
      expect(decoded.username).toBe('alice')
    })

    it('sets expiration time', () => {
      const token = jwtService.generate('user-789', 'bob')
      const decoded = jwt.decode(token) as { exp: number; iat: number }

      expect(decoded.exp).toBeTruthy()
      expect(decoded.iat).toBeTruthy()
      expect(decoded.exp).toBeGreaterThan(decoded.iat)
    })

    it('respects custom expiration time', () => {
      const customService = createJwtService(secret, '1h')
      const token = customService.generate('user-999', 'charlie')
      const decoded = jwt.decode(token) as { exp: number; iat: number }

      const expectedExpiration = decoded.iat + 60 * 60 // 1 hour in seconds
      expect(Math.abs(decoded.exp - expectedExpiration)).toBeLessThan(2)
    })
  })

  describe('verify', () => {
    it('verifies a valid token', () => {
      const token = jwtService.generate('user-123', 'testuser')
      const payload = jwtService.verify(token)

      expect(payload).toBeTruthy()
      expect(payload?.userId).toBe('user-123')
      expect(payload?.username).toBe('testuser')
    })

    it('returns null for invalid token', () => {
      const payload = jwtService.verify('invalid-token')

      expect(payload).toBeNull()
    })

    it('returns null for token with wrong secret', () => {
      const wrongService = createJwtService('wrong-secret-min-32-chars-for-testing')
      const token = jwtService.generate('user-123', 'testuser')
      const payload = wrongService.verify(token)

      expect(payload).toBeNull()
    })

    it('returns null for expired token', () => {
      const shortLivedService = createJwtService(secret, '0s')
      const token = shortLivedService.generate('user-123', 'testuser')

      // Wait a tiny bit to ensure expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          const payload = jwtService.verify(token)
          expect(payload).toBeNull()
          resolve(undefined)
        }, 100)
      })
    })

    it('returns null for malformed token', () => {
      const payload = jwtService.verify('eyJhbGc.eyJzdWI.SflKxw')

      expect(payload).toBeNull()
    })

    it('returns null when decoded token is a string', () => {
      // Create a token that decodes to a string (edge case)
      const stringToken = jwt.sign('just-a-string', secret)
      const payload = jwtService.verify(stringToken)

      expect(payload).toBeNull()
    })
  })
})
