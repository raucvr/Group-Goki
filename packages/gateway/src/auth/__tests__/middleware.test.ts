import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuthMiddleware, getAuthContext } from '../middleware.js'
import { createJwtService } from '../jwt.js'
import type { Context, Next } from 'hono'

describe('AuthMiddleware', () => {
  const secret = 'test-secret-min-32-chars-for-testing-purposes'
  const jwtService = createJwtService(secret)
  const middleware = createAuthMiddleware(jwtService)

  let mockContext: Partial<Context>
  let mockNext: Next
  let authContextStore: Record<string, unknown>

  beforeEach(() => {
    authContextStore = {}
    mockNext = vi.fn()

    mockContext = {
      req: {
        header: vi.fn(),
      } as unknown as Context['req'],
      json: vi.fn((data, status) => {
        return { data, status } as unknown as Response
      }) as Context['json'],
      set: vi.fn((key: string, value: unknown) => {
        authContextStore[key] = value
      }),
      get: vi.fn((key: string) => authContextStore[key]),
    }
  })

  it('authenticates with valid Bearer token', async () => {
    const token = jwtService.generate('user-123', 'testuser')
    ;(mockContext.req!.header as ReturnType<typeof vi.fn>).mockReturnValue(`Bearer ${token}`)

    await middleware(mockContext as Context, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockContext.set).toHaveBeenCalledWith('auth', {
      userId: 'user-123',
      username: 'testuser',
    })
  })

  it('returns 401 when Authorization header is missing', async () => {
    ;(mockContext.req!.header as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    const result = await middleware(mockContext as Context, mockNext)

    expect(mockNext).not.toHaveBeenCalled()
    expect(mockContext.json).toHaveBeenCalledWith(
      { error: 'Missing or invalid authorization header' },
      401,
    )
    expect(result).toEqual({
      data: { error: 'Missing or invalid authorization header' },
      status: 401,
    })
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    ;(mockContext.req!.header as ReturnType<typeof vi.fn>).mockReturnValue('Basic abc123')

    const result = await middleware(mockContext as Context, mockNext)

    expect(mockNext).not.toHaveBeenCalled()
    expect(mockContext.json).toHaveBeenCalledWith(
      { error: 'Missing or invalid authorization header' },
      401,
    )
  })

  it('returns 401 for invalid token', async () => {
    ;(mockContext.req!.header as ReturnType<typeof vi.fn>).mockReturnValue(
      'Bearer invalid-token',
    )

    const result = await middleware(mockContext as Context, mockNext)

    expect(mockNext).not.toHaveBeenCalled()
    expect(mockContext.json).toHaveBeenCalledWith(
      { error: 'Invalid or expired token' },
      401,
    )
  })

  it('returns 401 for expired token', async () => {
    const shortLivedService = createJwtService(secret, '0s')
    const expiredToken = shortLivedService.generate('user-123', 'testuser')

    await new Promise((resolve) => setTimeout(resolve, 100))

    ;(mockContext.req!.header as ReturnType<typeof vi.fn>).mockReturnValue(
      `Bearer ${expiredToken}`,
    )

    const result = await middleware(mockContext as Context, mockNext)

    expect(mockNext).not.toHaveBeenCalled()
    expect(mockContext.json).toHaveBeenCalledWith(
      { error: 'Invalid or expired token' },
      401,
    )
  })

  it('returns 401 for token with wrong secret', async () => {
    const wrongJwtService = createJwtService('wrong-secret-min-32-chars-for-testing-abc')
    const token = wrongJwtService.generate('user-123', 'testuser')

    ;(mockContext.req!.header as ReturnType<typeof vi.fn>).mockReturnValue(`Bearer ${token}`)

    const result = await middleware(mockContext as Context, mockNext)

    expect(mockNext).not.toHaveBeenCalled()
    expect(mockContext.json).toHaveBeenCalledWith(
      { error: 'Invalid or expired token' },
      401,
    )
  })
})

describe('getAuthContext', () => {
  it('returns auth context when present', () => {
    const mockContext = {
      get: vi.fn(() => ({ userId: 'user-123', username: 'testuser' })),
    } as unknown as Context

    const auth = getAuthContext(mockContext)

    expect(auth).toEqual({ userId: 'user-123', username: 'testuser' })
  })

  it('throws error when auth context is not found', () => {
    const mockContext = {
      get: vi.fn(() => undefined),
    } as unknown as Context

    expect(() => getAuthContext(mockContext)).toThrow(
      'Auth context not found - middleware not applied',
    )
  })
})
