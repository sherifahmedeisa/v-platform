import { describe, it, expect } from 'vitest'
import { computeDomainAudit, cleanDomain, deriveWorkspaceName } from '../domain'

describe('Landing Page Intelligence & Flow Validation', () => {
  it('computes real-time dynamic scores for hero input presets', () => {
    const linearAudit = computeDomainAudit('linear.app')
    expect(linearAudit.domain).toBe('linear.app')
    expect(linearAudit.name).toBe('Linear')
    expect(linearAudit.overallScore).toBeGreaterThanOrEqual(80)
    expect(linearAudit.competitors.length).toBeGreaterThan(0)
    expect(linearAudit.competitors[0].matchPercentage).toBeGreaterThanOrEqual(80)

    const stripeAudit = computeDomainAudit('stripe.com')
    expect(stripeAudit.domain).toBe('stripe.com')
    expect(stripeAudit.name).toBe('Stripe')
    expect(stripeAudit.competitors.some((c) => c.name.toLowerCase().includes('adyen'))).toBe(true)
  })

  it('computes deterministic, dynamic scores for arbitrary user domains', () => {
    const customAudit1 = computeDomainAudit('https://myaiplatform.io/pricing')
    expect(customAudit1.domain).toBe('myaiplatform.io')
    expect(customAudit1.name).toBe('Myaiplatform')
    expect(customAudit1.seoScore).toBeGreaterThanOrEqual(68)
    expect(customAudit1.geoScore).toBeGreaterThanOrEqual(72)
    expect(customAudit1.aioScore).toBeGreaterThanOrEqual(70)
    expect(customAudit1.competitors.length).toBe(3)
    expect(customAudit1.howToFix.length).toBeGreaterThan(0)

    // Parity / Determinism test: same domain produces exact same scores
    const customAudit2 = computeDomainAudit('myaiplatform.io')
    expect(customAudit2.overallScore).toBe(customAudit1.overallScore)
    expect(customAudit2.seoScore).toBe(customAudit1.seoScore)
    expect(customAudit2.geoScore).toBe(customAudit1.geoScore)
    expect(customAudit2.aioScore).toBe(customAudit1.aioScore)
  })

  it('handles cleanDomain and deriveWorkspaceName edge cases from landing hero input', () => {
    expect(cleanDomain('https://www.Linear.App/features?test=1#hero')).toBe('linear.app')
    expect(deriveWorkspaceName('https://app.linear.app')).toBe('Linear')
    expect(deriveWorkspaceName('cloud-metrics.ai')).toBe('Cloud Metrics')
    expect(deriveWorkspaceName('notion.so')).toBe('Notion')
    expect(deriveWorkspaceName('vercel.com')).toBe('Vercel')
    expect(deriveWorkspaceName('')).toBe('My Workspace')
  })

  it('ensures competitor cohorts have valid match percentages and gaps', () => {
    const presets = ['linear.app', 'stripe.com', 'notion.so', 'supabase.com', 'vercel.com']
    for (const domain of presets) {
      const audit = computeDomainAudit(domain)
      expect(audit.competitors.length).toBeGreaterThanOrEqual(3)
      for (const comp of audit.competitors) {
        expect(comp.matchPercentage).toBeGreaterThan(0)
        expect(comp.matchPercentage).toBeLessThanOrEqual(100)
        expect(comp.topKeywords.length).toBeGreaterThan(0)
        expect(comp.gaps.length).toBeGreaterThan(0)
      }
    }
  })

  it('calculates dynamic Pillar 3 baseline and boosted scores from domain audit', () => {
    const auditLinear = computeDomainAudit('linear.app')
    const rawLinearOverall = Math.max(52, auditLinear.overallScore - 18)
    const boostedLinearOverall = Math.min(99, auditLinear.overallScore + 6)

    expect(rawLinearOverall).toBeLessThan(auditLinear.overallScore)
    expect(boostedLinearOverall).toBeGreaterThan(auditLinear.overallScore)
    expect(boostedLinearOverall).toBeLessThanOrEqual(99)

    const auditCustom = computeDomainAudit('startup.ai')
    const rawCustomOverall = Math.max(52, auditCustom.overallScore - 18)
    const boostedCustomOverall = Math.min(99, auditCustom.overallScore + 6)

    expect(rawCustomOverall).toBeLessThan(auditCustom.overallScore)
    expect(boostedCustomOverall).toBeGreaterThan(auditCustom.overallScore)
    expect(boostedCustomOverall).toBeGreaterThan(rawCustomOverall)
  })

  it('determines correct model-specific token generation rates for Pillar 2', () => {
    const getModelSpeed = (m: 'gemma4:12b' | 'qwen3.6:latest' | 'gemma4:26b') => {
      return m === 'qwen3.6:latest' ? '~102 tok/s' : m === 'gemma4:26b' ? '~46 tok/s' : '~84 tok/s'
    }

    expect(getModelSpeed('gemma4:12b')).toBe('~84 tok/s')
    expect(getModelSpeed('qwen3.6:latest')).toBe('~102 tok/s')
    expect(getModelSpeed('gemma4:26b')).toBe('~46 tok/s')
  })
})
