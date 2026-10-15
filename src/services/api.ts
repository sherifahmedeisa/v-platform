import type { ProjectBrief, Workspace, DomainAuditResult, HowToFixItem, ContentCompetitorMatch } from '../types'
import { computeDomainAudit, cleanDomain, deriveWorkspaceName } from './domain'

export interface UserProfile {
  id: string
  userId: string
  fullName: string
  avatarUrl?: string | null
  bio?: string | null
  role: string
  preferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface UserAccount {
  id: string
  email: string
  isActive: boolean
  createdAt: string
  profile?: UserProfile | null
}

export interface AuthSession {
  token: string
  user: UserAccount
}

export interface UserDocument {
  id: string
  userId: string
  title: string
  query: string
  content: string
  brief?: Record<string, unknown> | null
  seoScore: number
  geoScore: number
  aioScore: number
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface ResearchStreamEvent {
  step: string
  status: 'starting' | 'in_progress' | 'complete' | 'cached' | 'error'
  percent: number
  message: string
  current?: number
  total?: number
  brief?: ProjectBrief
}

// When VITE_API_URL is omitted or empty, use '' so requests hit Vite dev proxy (/api -> 127.0.0.1:8000)
const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : ''
const TOKEN_KEY = 'v_platform_auth_token'
const USER_CACHE_KEY = 'v_platform_user_cache'
const LOCAL_DOCS_KEY = 'v_platform_local_docs'
const LOCAL_WORKSPACES_KEY = 'v_platform_local_workspaces'
const ACTIVE_WORKSPACE_KEY = 'v_platform_active_workspace_id'
const LOCAL_USERS_KEY = 'v_platform_local_users'
const LOCAL_CREDENTIALS_KEY = 'v_platform_local_credentials'



export function getLocalDocs(): UserDocument[] {
  try {
    const raw = localStorage.getItem(LOCAL_DOCS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setLocalDocs(docs: UserDocument[]): void {
  try {
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(docs))
  } catch {
    // quota
  }
}

export function getLocalWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(LOCAL_WORKSPACES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setLocalWorkspaces(workspaces: Workspace[]): void {
  try {
    localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(workspaces))
  } catch {
    // quota
  }
}


export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_CACHE_KEY)
}

export function getCachedUser(): UserAccount | null {
  const cached = localStorage.getItem(USER_CACHE_KEY)
  if (!cached) return null
  try {
    return JSON.parse(cached)
  } catch {
    return null
  }
}

export function setCachedUser(user: UserAccount): void {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
}

function getLocalUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setLocalUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
  } catch {
    // quota
  }
}

function getLocalCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveLocalCredential(email: string, password: string): void {
  try {
    const creds = getLocalCredentials()
    creds[email.trim().toLowerCase()] = password
    localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(creds))
  } catch {
    // quota
  }
}

function createLocalCreatorSession(
  email: string,
  password?: string,
  fullName?: string,
  role?: string
): AuthSession {
  const cleanEmail = email.trim().toLowerCase()
  const users = getLocalUsers()
  const namePart = cleanEmail.split('@')[0]
  const defaultName = namePart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Creator'
  const cleanName = fullName?.trim() || defaultName
  const chosenRole = role?.trim() || 'Content Architect'
  const now = new Date().toISOString()

  let user: UserAccount
  const existingIdx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail)

  if (existingIdx >= 0) {
    const existing = users[existingIdx]
    const existingProf = existing.profile || {
      id: `prof-${Date.now().toString(36)}`,
      userId: existing.id,
      fullName: cleanName,
      avatarUrl: null,
      bio: `Lead ${chosenRole} on V Platform.`,
      role: chosenRole,
      preferences: { theme: 'dark', autoSave: true, isLocalOffline: true },
      createdAt: now,
      updatedAt: now,
    }
    user = {
      ...existing,
      profile: {
        ...existingProf,
        fullName: cleanName || existingProf.fullName || 'Creator',
        role: chosenRole || existingProf.role || 'Content Architect',
        updatedAt: now,
      },
    }
    users[existingIdx] = user
  } else {
    const userId = `creator-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now().toString(36)}`
    const profile: UserProfile = {
      id: `prof-${Date.now().toString(36)}`,
      userId,
      fullName: cleanName,
      avatarUrl: null,
      bio: `Lead ${chosenRole} on V Platform.`,
      role: chosenRole,
      preferences: { theme: 'dark', autoSave: true, isLocalOffline: true },
      createdAt: now,
      updatedAt: now,
    }
    user = {
      id: userId,
      email: cleanEmail,
      isActive: true,
      createdAt: now,
      profile,
    }
    users.push(user)
  }

  setLocalUsers(users)
  if (password) {
    saveLocalCredential(cleanEmail, password)
  }

  const token = `local-creator-jwt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const session: AuthSession = { token, user }

  setStoredToken(token)
  setCachedUser(user)

  return session
}

function isOfflineOrUnreachable(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object' && err !== null) {
    if ('isOffline' in err && Boolean((err as Record<string, unknown>).isOffline)) {
      return true
    }
    if ('status' in err) {
      const status = Number((err as Record<string, unknown>).status)
      if ([0, 404, 500, 502, 503, 504].includes(status)) {
        return true
      }
    }
  }
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('econnrefused') ||
    lower.includes('connection refused') ||
    lower.includes('not found') ||
    lower.includes('404') ||
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('offline') ||
    lower.includes('unreachable') ||
    lower.includes('backend service unavailable')
  )
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers || {})
  const isGuestOrLocal = authApi.isGuestSession() || authApi.isLocalSession()

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Only pass Authorization header for real JWT accounts, not local guest/offline sessions
  if (token && !isGuestOrLocal && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (netErr: unknown) {
    const error = new Error(netErr instanceof Error ? netErr.message : 'Network request failed')
    Object.assign(error, { isOffline: true, status: 0 })
    throw error
  }

  if (!res.ok) {
    if (res.status === 401 && !isGuestOrLocal) {
      clearStoredSession()
    }
    let errorDetail = `Request failed (${res.status})`
    try {
      const errJson = await res.json()
      if (errJson.detail) {
        errorDetail = errJson.detail
      }
    } catch {
      try {
        const text = await res.text()
        if (text && text.length < 100 && !text.includes('<html')) {
          errorDetail = text
        }
      } catch {
        // use status text
      }
    }

    const error = new Error(errorDetail)
    const isOfflineCode = [404, 500, 502, 503, 504].includes(res.status)
    Object.assign(error, { isOffline: isOfflineCode, status: res.status })
    throw error
  }

  return res.json()
}

// -------------------------------------------------------------
// Authentication API
// -------------------------------------------------------------

export const authApi = {
  async register(email: string, password: string, fullName?: string, role?: string): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Invalid email address.')
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.')
    }

    try {
      const data = await request<AuthSession>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password, fullName, role }),
      })
      setStoredToken(data.token)
      setCachedUser(data.user)
      return data
    } catch (err: unknown) {
      if (!isOfflineOrUnreachable(err)) {
        throw err
      }
      // Transparent fallback to seamless local creator registration in localStorage
      return createLocalCreatorSession(cleanEmail, password, fullName, role)
    }
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Invalid email address.')
    }
    if (!password) {
      throw new Error('Password cannot be empty.')
    }

    try {
      const data = await request<AuthSession>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password }),
      })
      setStoredToken(data.token)
      setCachedUser(data.user)
      return data
    } catch (err: unknown) {
      if (!isOfflineOrUnreachable(err)) {
        throw err
      }

      // Offline Demo Account Check
      if (cleanEmail === 'creator@vplatform.ai' && password === 'Password2026!') {
        return createLocalCreatorSession('creator@vplatform.ai', 'Password2026!', 'Alex Creator', 'Lead GEO Strategist')
      }

      // Check local users
      const localUsers = getLocalUsers()
      const existing = localUsers.find((u) => u.email.toLowerCase() === cleanEmail)
      if (existing) {
        const creds = getLocalCredentials()
        const storedPw = creds[cleanEmail]
        if (storedPw && storedPw !== password) {
          throw new Error('Incorrect email or password.')
        }
        const token = `local-creator-jwt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
        const session: AuthSession = { token, user: existing }
        setStoredToken(token)
        setCachedUser(existing)
        return session
      }

      // If user hasn't registered locally yet, seamlessly register and log in so user is NEVER blocked
      return createLocalCreatorSession(cleanEmail, password)
    }
  },

  async getMe(): Promise<UserAccount> {
    if (this.isLocalSession()) {
      const cached = getCachedUser()
      if (cached) return cached
      throw new Error('Not authenticated')
    }
    try {
      const user = await request<UserAccount>('/api/auth/me')
      setCachedUser(user)
      return user
    } catch (err) {
      if (isOfflineOrUnreachable(err)) {
        const cached = getCachedUser()
        if (cached) return cached
      }
      throw err
    }
  },

  createLocalSession(email = 'creator@vplatform.ai', customName?: string, customRole?: string): AuthSession {
    return createLocalCreatorSession(email, undefined, customName, customRole)
  },

  isGuestSession(): boolean {
    const token = getStoredToken()
    if (token === 'guest-session-token-vplatform-2026') return true
    const user = getCachedUser()
    return (
      (typeof user?.id === 'string' && user.id.startsWith('guest-')) ||
      Boolean(user?.profile?.preferences?.isGuest)
    )
  },

  isLocalSession(): boolean {
    const token = getStoredToken()
    if (!token) return false
    if (token.startsWith('local-creator-jwt-') || token.startsWith('local-session-')) return true
    const user = getCachedUser()
    return Boolean(
      user?.profile?.preferences?.isLocalOffline ||
      (typeof user?.id === 'string' && user.id.startsWith('creator-'))
    )
  },

  logout(): void {
    clearStoredSession()
  },
}

// -------------------------------------------------------------
// System Health API
// -------------------------------------------------------------

export const healthApi = {
  async check(): Promise<{ status: string; database: string; neon: boolean }> {
    try {
      return await request<{ status: string; database: string; neon: boolean }>('/api/health')
    } catch {
      return { status: 'offline', database: 'disconnected', neon: false }
    }
  },
}

// -------------------------------------------------------------
// Profile API
// -------------------------------------------------------------

export const profileApi = {
  async get(): Promise<UserProfile> {
    if (authApi.isLocalSession()) {
      const user = getCachedUser()
      if (!user) throw new Error('Not authenticated')
      if (user.profile) return user.profile
      return {
        id: `prof-${Date.now().toString(36)}`,
        userId: user.id,
        fullName: 'Creator',
        avatarUrl: null,
        bio: 'Content Architect on V Platform.',
        role: 'Content Architect',
        preferences: { theme: 'dark', autoSave: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
    try {
      return await request<UserProfile>('/api/profile')
    } catch (err) {
      if (isOfflineOrUnreachable(err)) {
        const cached = getCachedUser()
        if (cached?.profile) return cached.profile
      }
      throw err
    }
  },

  async update(data: {
    fullName?: string
    avatarUrl?: string
    bio?: string
    role?: string
    preferences?: Record<string, unknown>
  }): Promise<UserProfile> {
    const cached = getCachedUser()
    if (!cached) throw new Error('Not authenticated')
    const currentProf = cached.profile || {
      id: `prof-${Date.now().toString(36)}`,
      userId: cached.id,
      fullName: 'Creator',
      avatarUrl: null,
      bio: 'Content Architect on V Platform.',
      role: 'Content Architect',
      preferences: { theme: 'dark', autoSave: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const localUpdated: UserProfile = {
      ...currentProf,
      fullName: data.fullName ?? currentProf.fullName,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : currentProf.avatarUrl,
      bio: data.bio !== undefined ? data.bio : currentProf.bio,
      role: data.role ?? currentProf.role,
      preferences: {
        ...currentProf.preferences,
        ...(data.preferences || {}),
      },
      updatedAt: new Date().toISOString(),
    }

    if (authApi.isLocalSession()) {
      const updatedUser: UserAccount = {
        ...cached,
        profile: localUpdated,
      }
      setCachedUser(updatedUser)
      const users = getLocalUsers()
      const idx = users.findIndex((u) => u.id === cached.id || u.email === cached.email)
      if (idx >= 0) {
        users[idx] = updatedUser
        setLocalUsers(users)
      }
      return localUpdated
    }

    try {
      const updated = await request<UserProfile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      if (cached) {
        setCachedUser({
          ...cached,
          profile: updated,
        })
      }
      return updated
    } catch (err) {
      if (isOfflineOrUnreachable(err)) {
        setCachedUser({ ...cached, profile: localUpdated })
        return localUpdated
      }
      throw err
    }
  },
}

// -------------------------------------------------------------
// Documents / Projects Persistence API
// -------------------------------------------------------------

export const documentsApi = {
  async list(): Promise<UserDocument[]> {
    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      const user = getCachedUser()
      const allDocs = getLocalDocs()
      if (user?.id) {
        const userDocs = allDocs.filter((d) => d.userId === user.id)
        if (userDocs.length > 0) return userDocs
      }
      return allDocs
    }
    try {
      const docs = await request<UserDocument[]>('/api/documents')
      setLocalDocs(docs)
      return docs
    } catch {
      const user = getCachedUser()
      const allDocs = getLocalDocs()
      if (user?.id) {
        const userDocs = allDocs.filter((d) => d.userId === user.id)
        if (userDocs.length > 0) return userDocs
      }
      return allDocs
    }
  },

  async create(data: {
    title: string
    query: string
    content?: string
    brief?: Record<string, unknown> | null
    seoScore?: number
    geoScore?: number
    aioScore?: number
    wordCount?: number
  }): Promise<UserDocument> {
    const user = getCachedUser()
    const userId = user?.id || 'creator'

    if (authApi.isLocalSession()) {
      const newDoc: UserDocument = {
        id: `local-doc-${Date.now()}`,
        userId,
        title: data.title || 'Untitled Document',
        query: data.query || 'Generative Engine Optimization',
        content: data.content || '',
        brief: data.brief || null,
        seoScore: data.seoScore || 0,
        geoScore: data.geoScore || 0,
        aioScore: data.aioScore || 0,
        wordCount: data.wordCount || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const existing = getLocalDocs()
      setLocalDocs([newDoc, ...existing])
      return newDoc
    }

    try {
      const created = await request<UserDocument>('/api/documents', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      const existing = getLocalDocs()
      setLocalDocs([created, ...existing.filter((d) => d.id !== created.id)])
      return created
    } catch {
      // Offline fallback: persist locally
      const localDoc: UserDocument = {
        id: `local-doc-${Date.now()}`,
        userId,
        title: data.title || 'Untitled Document',
        query: data.query || 'Generative Engine Optimization',
        content: data.content || '',
        brief: data.brief || null,
        seoScore: data.seoScore || 0,
        geoScore: data.geoScore || 0,
        aioScore: data.aioScore || 0,
        wordCount: data.wordCount || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const existing = getLocalDocs()
      setLocalDocs([localDoc, ...existing])
      return localDoc
    }
  },

  async get(id: string): Promise<UserDocument> {
    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      const found = getLocalDocs().find((d) => d.id === id)
      if (found) return found
      throw new Error('Document not found in local or remote storage.')
    }
    try {
      return await request<UserDocument>(`/api/documents/${id}`)
    } catch {
      const found = getLocalDocs().find((d) => d.id === id)
      if (found) return found
      throw new Error('Document not found in local or remote storage.')
    }
  },

  async update(
    id: string,
    data: {
      title?: string
      query?: string
      content?: string
      brief?: Record<string, unknown> | null
      seoScore?: number
      geoScore?: number
      aioScore?: number
      wordCount?: number
    }
  ): Promise<UserDocument> {
    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      const docs = getLocalDocs()
      const idx = docs.findIndex((d) => d.id === id)
      if (idx < 0) {
        throw new Error('Document not found.')
      }
      const current = docs[idx]
      const updated: UserDocument = {
        ...current,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      if (idx >= 0) {
        docs[idx] = updated
        setLocalDocs([...docs])
      } else {
        setLocalDocs([updated, ...docs])
      }
      return updated
    }

    try {
      const updated = await request<UserDocument>(`/api/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      const docs = getLocalDocs()
      const idx = docs.findIndex((d) => d.id === id)
      if (idx >= 0) {
        docs[idx] = updated
        setLocalDocs([...docs])
      }
      return updated
    } catch {
      const docs = getLocalDocs()
      const idx = docs.findIndex((d) => d.id === id)
      if (idx < 0) {
        throw new Error('Document not found in local or remote storage.')
      }
      const current = docs[idx]
      const updated: UserDocument = {
        ...current,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      if (idx >= 0) {
        docs[idx] = updated
        setLocalDocs([...docs])
      }
      return updated
    }
  },

  async delete(id: string): Promise<{ deleted: boolean; id: string }> {
    const docs = getLocalDocs().filter((d) => d.id !== id)
    setLocalDocs(docs)

    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      return { deleted: true, id }
    }

    try {
      return await request<{ deleted: boolean; id: string }>(`/api/documents/${id}`, {
        method: 'DELETE',
      })
    } catch {
      return { deleted: true, id }
    }
  },
}

// -------------------------------------------------------------
// Workspaces & Domain Intelligence Persistence API (Neon PostgreSQL)
// -------------------------------------------------------------

export const workspacesApi = {
  getActiveWorkspaceId(): string | null {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY)
  },

  setActiveWorkspaceId(id: string): void {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
  },

  async compute(domain: string, name?: string): Promise<DomainAuditResult> {
    const cleaned = cleanDomain(domain)
    const wsName = name?.trim() || deriveWorkspaceName(cleaned)
    try {
      return await request<DomainAuditResult>('/api/workspaces/compute', {
        method: 'POST',
        body: JSON.stringify({ domain: cleaned, name: wsName }),
      })
    } catch {
      // Local algorithmic computation fallback
      return computeDomainAudit(cleaned, wsName)
    }
  },

  async list(): Promise<Workspace[]> {
    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      const user = getCachedUser()
      const allWorkspaces = getLocalWorkspaces()
      if (user?.id) {
        const userWs = allWorkspaces.filter((w) => w.userId === user.id)
        if (userWs.length > 0) return userWs
      }
      return allWorkspaces
    }
    try {
      const workspaces = await request<Workspace[]>('/api/workspaces')
      if (Array.isArray(workspaces) && workspaces.length > 0) {
        setLocalWorkspaces(workspaces)
        return workspaces
      }
      const user = getCachedUser()
      const allWorkspaces = getLocalWorkspaces()
      if (user?.id) {
        const userWs = allWorkspaces.filter((w) => w.userId === user.id)
        if (userWs.length > 0) return userWs
      }
      return allWorkspaces
    } catch {
      const user = getCachedUser()
      const allWorkspaces = getLocalWorkspaces()
      if (user?.id) {
        const userWs = allWorkspaces.filter((w) => w.userId === user.id)
        if (userWs.length > 0) return userWs
      }
      return allWorkspaces
    }
  },

  async get(id: string): Promise<Workspace> {
    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      const found = getLocalWorkspaces().find((w) => w.id === id)
      if (found) return found
      throw new Error('Workspace not found in local or remote storage.')
    }
    try {
      return await request<Workspace>(`/api/workspaces/${id}`)
    } catch {
      const found = getLocalWorkspaces().find((w) => w.id === id)
      if (found) return found
      throw new Error('Workspace not found in local or remote storage.')
    }
  },

  async create(data: {
    domain: string
    name?: string
    targetScore?: number
    overallScore?: number
    seoScore?: number
    geoScore?: number
    aioScore?: number
    howToFix?: HowToFixItem[]
    competitors?: ContentCompetitorMatch[]
  }): Promise<Workspace> {
    const user = getCachedUser()
    const userId = user?.id || 'creator'
    const cleaned = cleanDomain(data.domain)
    const name = data.name?.trim() || deriveWorkspaceName(cleaned)

    let audit: DomainAuditResult | null = null
    if (
      data.overallScore === undefined ||
      !data.howToFix ||
      !data.competitors
    ) {
      audit = computeDomainAudit(cleaned, name)
    }

    const payload = {
      domain: cleaned,
      name,
      targetScore: data.targetScore ?? 85,
      overallScore: data.overallScore ?? audit?.overallScore ?? 80,
      seoScore: data.seoScore ?? audit?.seoScore ?? 78,
      geoScore: data.geoScore ?? audit?.geoScore ?? 82,
      aioScore: data.aioScore ?? audit?.aioScore ?? 80,
      howToFix: data.howToFix ?? audit?.howToFix ?? [],
      competitors: data.competitors ?? audit?.competitors ?? [],
    }

    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      const newWs: Workspace = {
        id: `local-ws-${Date.now()}`,
        userId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const existing = getLocalWorkspaces()
      setLocalWorkspaces([newWs, ...existing.filter((w) => w.id !== newWs.id)])
      return newWs
    }

    try {
      const created = await request<Workspace>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const existing = getLocalWorkspaces()
      setLocalWorkspaces([created, ...existing.filter((w) => w.id !== created.id)])
      return created
    } catch {
      // Offline fallback
      const localWs: Workspace = {
        id: `local-ws-${Date.now()}`,
        userId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const existing = getLocalWorkspaces()
      setLocalWorkspaces([localWs, ...existing.filter((w) => w.id !== localWs.id)])
      return localWs
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      domain?: string
      targetScore?: number
      overallScore?: number
      seoScore?: number
      geoScore?: number
      aioScore?: number
      howToFix?: HowToFixItem[]
      competitors?: ContentCompetitorMatch[]
    }
  ): Promise<Workspace> {
    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      const workspaces = getLocalWorkspaces()
      const idx = workspaces.findIndex((w) => w.id === id)
      if (idx < 0) {
        throw new Error('Workspace not found.')
      }
      const current = workspaces[idx]
      const updated: Workspace = {
        ...current,
        ...data,
        name: data.name ? data.name.trim() : current.name,
        domain: data.domain ? cleanDomain(data.domain) : current.domain,
        updatedAt: new Date().toISOString(),
      }
      workspaces[idx] = updated
      setLocalWorkspaces([...workspaces])
      return updated
    }

    try {
      const updated = await request<Workspace>(`/api/workspaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      const workspaces = getLocalWorkspaces()
      const idx = workspaces.findIndex((w) => w.id === id)
      if (idx >= 0) {
        workspaces[idx] = updated
        setLocalWorkspaces([...workspaces])
      }
      return updated
    } catch {
      const workspaces = getLocalWorkspaces()
      const idx = workspaces.findIndex((w) => w.id === id)
      if (idx < 0) {
        throw new Error('Workspace not found.')
      }
      const current = workspaces[idx]
      const updated: Workspace = {
        ...current,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      workspaces[idx] = updated
      setLocalWorkspaces([...workspaces])
      return updated
    }
  },

  async delete(id: string): Promise<{ deleted: boolean; id: string }> {
    const workspaces = getLocalWorkspaces().filter((w) => w.id !== id)
    setLocalWorkspaces(workspaces)

    if (authApi.isGuestSession() || authApi.isLocalSession()) {
      return { deleted: true, id }
    }

    try {
      return await request<{ deleted: boolean; id: string }>(`/api/workspaces/${id}`, {
        method: 'DELETE',
      })
    } catch {
      return { deleted: true, id }
    }
  },
}


// -------------------------------------------------------------
// Real-time SERP Research SSE Stream API
// -------------------------------------------------------------

export const researchApi = {
  streamResearch(
    query: string,
    onProgress: (event: ResearchStreamEvent) => void,
    onComplete: (brief: ProjectBrief) => void,
    onError: (err: Error) => void
  ): () => void {
    const encodedQuery = encodeURIComponent(query.trim())
    const url = `${API_BASE_URL}/api/research/stream?query=${encodedQuery}&max_competitors=10`

    let aborted = false
    const eventSource = new EventSource(url)

    eventSource.onmessage = (e) => {
      if (aborted) return
      try {
        const data: ResearchStreamEvent = JSON.parse(e.data)
        onProgress(data)
        if (data.status === 'complete' && data.brief) {
          eventSource.close()
          onComplete(data.brief)
        } else if (data.status === 'error') {
          eventSource.close()
          onError(new Error(data.message || 'Research stream error'))
        }
      } catch (err) {
        // parsing error
        console.error('SSE JSON parse error', err)
      }
    }

    eventSource.onerror = () => {
      if (aborted) return
      eventSource.close()
      onError(new Error('Connection to research streaming server lost or failed'))
    }

    return () => {
      aborted = true
      eventSource.close()
    }
  },
}
