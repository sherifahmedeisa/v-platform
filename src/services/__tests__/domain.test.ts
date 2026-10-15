import { describe, it, expect } from 'vitest'
import { cleanDomain, deriveWorkspaceName, computeDomainAudit } from '../domain'
import { workspacesApi } from '../api'

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


describe('Domain Intelligence & Workspace Utility', () => {
  it('cleans various URLs into base domain correctly', () => {
    expect(cleanDomain('https://stripe.com')).toBe('stripe.com')
    expect(cleanDomain('http://www.linear.app/issues')).toBe('linear.app')
    expect(cleanDomain('https://notion.so/docs?ref=product')).toBe('notion.so')
    expect(cleanDomain('vercel.com:3000')).toBe('vercel.com')
    expect(cleanDomain('   mybrand.io/   ')).toBe('mybrand.io')
    expect(cleanDomain('')).toBe('example.com')
  })

  it('derives elegant workspace names from domains', () => {
    expect(deriveWorkspaceName('linear.app')).toBe('Linear')
    expect(deriveWorkspaceName('stripe.com')).toBe('Stripe')
    expect(deriveWorkspaceName('https://www.notion.so')).toBe('Notion')
    expect(deriveWorkspaceName('supabase.com')).toBe('Supabase')
    expect(deriveWorkspaceName('openai.com')).toBe('OpenAI')
    expect(deriveWorkspaceName('my-cool-startup.io')).toBe('My Cool Startup')
    expect(deriveWorkspaceName('cloud_metrics.ai')).toBe('Cloud Metrics')
  })

  it('handles subdomains and multi-part international TLDs elegantly', () => {
    expect(deriveWorkspaceName('app.linear.app')).toBe('Linear')
    expect(deriveWorkspaceName('dashboard.stripe.com')).toBe('Stripe')
    expect(deriveWorkspaceName('docs.notion.so')).toBe('Notion')
    expect(deriveWorkspaceName('beta.supabase.com')).toBe('Supabase')
    expect(deriveWorkspaceName('portal.mybrand.io')).toBe('Mybrand')
    expect(deriveWorkspaceName('https://app.linear.app/team')).toBe('Linear')
    expect(deriveWorkspaceName('my-brand.co.uk')).toBe('My Brand')
    expect(deriveWorkspaceName('app.mybrand.co.uk')).toBe('Mybrand')
  })

  it('computes domain audit for expanded presets like supabase.com and vercel.com', () => {
    const supaAudit = computeDomainAudit('supabase.com')
    expect(supaAudit.domain).toBe('supabase.com')
    expect(supaAudit.name).toBe('Supabase')
    expect(supaAudit.overallScore).toBeGreaterThanOrEqual(80)
    expect(supaAudit.competitors.some((c) => c.name === 'Firebase')).toBe(true)
    expect(supaAudit.competitors.some((c) => c.name === 'Neon')).toBe(true)

    const vercelAudit = computeDomainAudit('vercel.com')
    expect(vercelAudit.domain).toBe('vercel.com')
    expect(vercelAudit.name).toBe('Vercel')
    expect(vercelAudit.competitors.some((c) => c.name === 'Netlify')).toBe(true)
  })

  it('computes domain audit with SEO, GEO, AIO scores, recommendations and competitor match percentages', () => {
    const audit = computeDomainAudit('linear.app')
    expect(audit.domain).toBe('linear.app')
    expect(audit.name).toBe('Linear')
    expect(audit.overallScore).toBeGreaterThanOrEqual(70)
    expect(audit.geoScore).toBeGreaterThanOrEqual(70)
    expect(audit.seoScore).toBeGreaterThanOrEqual(70)
    expect(audit.aioScore).toBeGreaterThanOrEqual(70)

    // Check competitor content match percentages
    expect(audit.competitors.length).toBeGreaterThan(0)
    audit.competitors.forEach((c) => {
      expect(c.matchPercentage).toBeGreaterThanOrEqual(0)
      expect(c.matchPercentage).toBeLessThanOrEqual(100)
      expect(c.keywordOverlap).toBeGreaterThanOrEqual(0)
      expect(c.semanticEntityScore).toBeGreaterThanOrEqual(0)
      expect(c.searchIntentScore).toBeGreaterThanOrEqual(0)
      expect(c.topKeywords.length).toBeGreaterThan(0)
    })

    // Check how-to-fix recommendations
    expect(audit.howToFix.length).toBeGreaterThan(0)
    audit.howToFix.forEach((f) => {
      expect(['high', 'medium', 'low']).toContain(f.impact)
      expect(['seo', 'geo', 'aio']).toContain(f.category)
      expect(f.title.length).toBeGreaterThan(5)
      expect(f.fixProposal.length).toBeGreaterThan(5)
    })
  })

  it('computes algorithmic audit for unknown arbitrary custom domains', () => {
    const customAudit = computeDomainAudit('cryptosphere.xyz')
    expect(customAudit.domain).toBe('cryptosphere.xyz')
    expect(customAudit.name).toBe('Cryptosphere')
    expect(customAudit.overallScore).toBeGreaterThan(50)
    expect(customAudit.competitors.length).toBe(3)
    expect(customAudit.competitors[0].matchPercentage).toBeGreaterThan(60)
    expect(customAudit.howToFix.length).toBe(3)
  })

  it('manages workspaces in offline local storage via workspacesApi with clean slate', async () => {
    const list = await workspacesApi.list()
    expect(list.length).toBe(0)

    const created = await workspacesApi.create({
      domain: 'mybrand.io',
      name: 'My Custom Brand',
    })
    expect(created.domain).toBe('mybrand.io')
    expect(created.name).toBe('My Custom Brand')
    expect(created.overallScore).toBeGreaterThan(0)
    expect(created.competitors.length).toBeGreaterThan(0)

    const updated = await workspacesApi.update(created.id, {
      name: 'Renamed Brand',
    })
    expect(updated.name).toBe('Renamed Brand')

    const del = await workspacesApi.delete(created.id)
    expect(del.deleted).toBe(true)
  })
})
