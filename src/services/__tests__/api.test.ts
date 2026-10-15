import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  authApi,
  profileApi,
  documentsApi,
  workspacesApi,
  healthApi,
  getStoredToken,
  setStoredToken,
  clearStoredSession,
  getCachedUser,
  setCachedUser,
  type UserAccount,
} from '../api'

const storage: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => {
    storage[key] = val
  },
  removeItem: (key: string) => {
    delete storage[key]
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k])
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('Frontend API Client & Storage', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.restoreAllMocks()
  })


  it('manages auth token in localStorage correctly', () => {
    expect(getStoredToken()).toBeNull()
    setStoredToken('test-jwt-token-123')
    expect(getStoredToken()).toBe('test-jwt-token-123')
    clearStoredSession()
    expect(getStoredToken()).toBeNull()
  })

  it('manages cached user account in localStorage correctly', () => {
    const mockUser: UserAccount = {
      id: 'usr-1',
      email: 'alex@creator.io',
      isActive: true,
      createdAt: new Date().toISOString(),
      profile: {
        id: 'prof-1',
        userId: 'usr-1',
        fullName: 'Alex Creator',
        role: 'Content Architect',
        preferences: { theme: 'dark' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }

    expect(getCachedUser()).toBeNull()
    setCachedUser(mockUser)
    expect(getCachedUser()?.email).toBe('alex@creator.io')
    expect(getCachedUser()?.profile?.fullName).toBe('Alex Creator')
    clearStoredSession()
    expect(getCachedUser()).toBeNull()
  })

  it('sends register request and persists token', async () => {
    const mockResponse = {
      token: 'jwt-auth-xyz',
      tokenType: 'bearer',
      user: {
        id: 'u-100',
        email: 'test@creator.io',
        isActive: true,
        createdAt: '2026-10-09T00:00:00Z',
        profile: {
          id: 'p-100',
          userId: 'u-100',
          fullName: 'Test Creator',
          role: 'Content Architect',
          preferences: {},
          createdAt: '2026-10-09T00:00:00Z',
          updatedAt: '2026-10-09T00:00:00Z',
        },
      },
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response)

    const session = await authApi.register('test@creator.io', 'Password123!', 'Test Creator')
    expect(session.token).toBe('jwt-auth-xyz')
    expect(getStoredToken()).toBe('jwt-auth-xyz')
    expect(getCachedUser()?.email).toBe('test@creator.io')
  })

  it('sends login request and persists token', async () => {
    const mockResponse = {
      token: 'jwt-auth-abc',
      tokenType: 'bearer',
      user: {
        id: 'u-100',
        email: 'test@creator.io',
        isActive: true,
        createdAt: '2026-10-09T00:00:00Z',
      },
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response)

    const session = await authApi.login('test@creator.io', 'Password123!')
    expect(session.token).toBe('jwt-auth-abc')
    expect(getStoredToken()).toBe('jwt-auth-abc')
  })

  it('updates profile via profileApi and syncs cached user', async () => {
    setStoredToken('mock-token')
    setCachedUser({
      id: 'u-1',
      email: 'alex@creator.io',
      isActive: true,
      createdAt: '2026-10-09T00:00:00Z',
    })

    const updatedProf = {
      id: 'p-1',
      userId: 'u-1',
      fullName: 'Updated Name',
      role: 'Lead GEO Strategist',
      preferences: { autoSave: true },
      createdAt: '2026-10-09T00:00:00Z',
      updatedAt: '2026-10-09T00:00:00Z',
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedProf,
    } as unknown as Response)

    const result = await profileApi.update({ fullName: 'Updated Name', role: 'Lead GEO Strategist' })
    expect(result.fullName).toBe('Updated Name')
    expect(result.role).toBe('Lead GEO Strategist')
    expect(getCachedUser()?.profile?.fullName).toBe('Updated Name')
  })

  it('clears stored session on 401 unauthorized response', async () => {
    setStoredToken('expired-jwt-token')
    setCachedUser({
      id: 'u-1',
      email: 'alex@creator.io',
      isActive: true,
      createdAt: '2026-10-09T00:00:00Z',
    })

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Could not validate credentials' }),
    } as unknown as Response)

    await expect(authApi.getMe()).rejects.toThrow('Could not validate credentials')
    expect(getStoredToken()).toBeNull()
    expect(getCachedUser()).toBeNull()
  })

  it('manages documents CRUD via documentsApi', async () => {
    setStoredToken('mock-token')

    const mockDoc = {
      id: 'doc-1',
      userId: 'u-1',
      title: 'GEO Blueprint',
      query: 'GEO Guide',
      content: '# GEO',
      brief: null,
      seoScore: 80,
      geoScore: 85,
      aioScore: 82,
      wordCount: 1200,
      createdAt: '2026-10-09T00:00:00Z',
      updatedAt: '2026-10-09T00:00:00Z',
    }

    // Create
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDoc,
    } as unknown as Response)
    const created = await documentsApi.create({ title: 'GEO Blueprint', query: 'GEO Guide' })
    expect(created.id).toBe('doc-1')

    // List
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockDoc],
    } as unknown as Response)
    const list = await documentsApi.list()
    expect(list.length).toBe(1)
    expect(list[0].title).toBe('GEO Blueprint')

    // Delete
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: true, id: 'doc-1' }),
    } as unknown as Response)
    const delResult = await documentsApi.delete('doc-1')
    expect(delResult.deleted).toBe(true)
  })

  it('activates local creator session and supports offline document workflow', async () => {
    expect(authApi.isLocalSession()).toBe(false)

    const session = authApi.createLocalSession('alex@creator.dev', 'Alex Creator', 'Content Architect')
    expect(session.user.profile?.fullName).toBe('Alex Creator')
    expect(authApi.isLocalSession()).toBe(true)

    // getMe returns cached creator without network call
    const me = await authApi.getMe()
    expect(me.email).toBe('alex@creator.dev')

    // Document operations in creator session persist to local storage
    const created = await documentsApi.create({
      title: 'Offline GEO Notes',
      query: 'GEO Guide',
      content: '# Offline GEO',
    })
    expect(created.title).toBe('Offline GEO Notes')

    const docs = await documentsApi.list()
    expect(docs.length).toBeGreaterThanOrEqual(1)
    expect(docs.some((d) => d.id === created.id)).toBe(true)

    // Clean up
    authApi.logout()
    expect(authApi.isLocalSession()).toBe(false)
  })

  it('queries health check via healthApi', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', database: 'connected', neon: true }),
    } as unknown as Response)

    const health = await healthApi.check()
    expect(health.status).toBe('ok')
    expect(health.neon).toBe(true)
  })

  it('handles offline healthApi failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'))

    const health = await healthApi.check()
    expect(health.status).toBe('offline')
    expect(health.neon).toBe(false)
  })

  it('transparently falls back to local creator registration when remote returns 404 Not Found', async () => {
    // Simulate Vite returning 404 HTML or FastAPI 404 Not Found
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Not Found' }),
      text: async () => 'Not Found',
    } as unknown as Response)

    const session = await authApi.register(
      'sherifahed25@gmail.com',
      'Password2026!',
      'sherif',
      'Content Architect'
    )

    expect(session).toBeDefined()
    expect(session.user.email).toBe('sherifahed25@gmail.com')
    expect(session.user.profile?.fullName).toBe('sherif')
    expect(session.user.profile?.role).toBe('Content Architect')
    expect(session.token).toMatch(/^local-creator-jwt-/)
    expect(getStoredToken()).toBe(session.token)
    expect(getCachedUser()?.email).toBe('sherifahed25@gmail.com')
    expect(authApi.isLocalSession()).toBe(true)

    // Verify clean slate: documents start empty until user creates them
    const docs = await documentsApi.list()
    expect(docs.length).toBe(0)

    // Verify getMe works offline
    const me = await authApi.getMe()
    expect(me.email).toBe('sherifahed25@gmail.com')
  })

  it('transparently falls back to local creator login when backend is offline (ECONNREFUSED / network error)', async () => {
    // 1. First register locally when offline
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (ECONNREFUSED)'))

    const regSession = await authApi.register(
      'sherifahed25@gmail.com',
      'Password2026!',
      'sherif',
      'Content Architect'
    )
    expect(regSession.user.email).toBe('sherifahed25@gmail.com')

    // Logout
    authApi.logout()
    expect(getStoredToken()).toBeNull()

    // 2. Login offline with correct credentials
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (ECONNREFUSED)'))
    const loginSession = await authApi.login('sherifahed25@gmail.com', 'Password2026!')
    expect(loginSession.user.email).toBe('sherifahed25@gmail.com')
    expect(loginSession.user.profile?.fullName).toBe('sherif')
    expect(getStoredToken()).toBe(loginSession.token)

    // 3. Login offline with incorrect password fails
    await expect(authApi.login('sherifahed25@gmail.com', 'WrongPassword123!')).rejects.toThrow(
      'Incorrect email or password.'
    )
  })

  it('transparently falls back to local creator registration when gateway returns 502/503/504', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ detail: 'Backend service unavailable (offline)' }),
      text: async () => 'Service Unavailable',
    } as unknown as Response)

    const session = await authApi.register('alex@creator.dev', 'SecurePass123!', 'Alex Creator')
    expect(session.user.email).toBe('alex@creator.dev')
    expect(session.user.profile?.fullName).toBe('Alex Creator')
  })

  it('does NOT fallback on legitimate backend validation errors (status 400)', async () => {
    // When backend is online and rejects duplicate email or weak password
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Email is already registered.' }),
    } as unknown as Response)

    await expect(
      authApi.register('existing@vplatform.ai', 'Password2026!', 'Existing Creator')
    ).rejects.toThrow('Email is already registered.')
  })

  it('rejects passwords shorter than 6 characters before sending request', async () => {
    await expect(
      authApi.register('short@vplatform.ai', '123', 'Short Pass')
    ).rejects.toThrow('Password must be at least 6 characters.')
  })

  it('manages workspaces offline and computes audit fallbacks', async () => {
    // 1. Compute audit offline without network
    const audit = await workspacesApi.compute('linear.app', 'Linear')
    expect(audit.domain).toBe('linear.app')
    expect(audit.name).toBe('Linear')
    expect(audit.overallScore).toBeGreaterThanOrEqual(70)
    expect(audit.howToFix.length).toBeGreaterThan(0)

    // 2. Offline creator workspace list & create
    const session = authApi.createLocalSession('creator2@vplatform.ai', 'Creator Two')
    expect(session.user.email).toBe('creator2@vplatform.ai')

    const wsList = await workspacesApi.list()
    expect(wsList.length).toBe(0)

    const customWs = await workspacesApi.create({
      domain: 'notion.so',
      name: 'Notion',
    })
    expect(customWs.domain).toBe('notion.so')
    expect(customWs.name).toBe('Notion')

    const updatedList = await workspacesApi.list()
    expect(updatedList.some((w) => w.id === customWs.id)).toBe(true)
  })

  it('safely handles local creator re-registration and profileApi.get when profile is empty', async () => {
    // Register creator
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Backend offline (ECONNREFUSED)'))
    const session1 = await authApi.register('sherif@vplatform.ai', 'Password2026!', 'Sherif Old', 'Content Architect')
    expect(session1.user.profile?.fullName).toBe('Sherif Old')

    // Re-register with updated role & name
    const session2 = await authApi.register('sherif@vplatform.ai', 'Password2026!', 'Sherif New', 'Lead GEO Strategist')
    expect(session2.user.profile?.fullName).toBe('Sherif New')
    expect(session2.user.profile?.role).toBe('Lead GEO Strategist')

    // profileApi.get returns profile
    const prof = await profileApi.get()
    expect(prof.fullName).toBe('Sherif New')
    expect(prof.role).toBe('Lead GEO Strategist')
  })

})

