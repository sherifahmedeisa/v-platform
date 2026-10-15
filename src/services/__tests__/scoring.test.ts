import { describe, it, expect } from 'vitest'
import { analyzeContent } from '../scoring'
import { generateBriefForQuery } from '../presetData'

const SAMPLE_GEO_TEXT = `# Generative Engine Optimization (GEO)

Generative Engine Optimization (GEO) is the systematic methodology of structuring content to maximize citation probability across AI generative search systems such as Perplexity AI and Google AI Overviews.

While traditional search engine optimization focuses on ranking URLs through backlinks and keyword density, GEO focuses on citeability, information gain, and factual clarity.

## Core Principles of GEO

1. Authoritative Definitional Statements
2. Verified Empirical Benchmarks
3. High Semantic Entity Co-occurrence

According to recent retrieval benchmarks, content structured with direct definitions and concise entity relationships achieves a 32% higher citation rate in generative summaries.
`

describe('Scoring & Audit Engine (Frase logic for SEO, GEO, AIO)', () => {
  const brief = generateBriefForQuery('Generative Engine Optimization (GEO)')

  it('correctly calculates baseline metrics on initial sample text', () => {
    const { metrics, updatedBrief, issues } = analyzeContent(SAMPLE_GEO_TEXT, brief)

    expect(metrics.wordCount).toBeGreaterThan(40)
    expect(metrics.headingCount).toBe(1) // ## Core Principles of GEO
    expect(metrics.definitionalBlocks).toBeGreaterThanOrEqual(1)
    expect(metrics.geoCitationsCount).toBeGreaterThanOrEqual(1) // 32%
    expect(metrics.overall).toBeGreaterThan(0)
    expect(updatedBrief.topics.length).toBe(brief.topics.length)
    expect(issues.length).toBeGreaterThan(0) // Has missing topics and word count gap
  })

  it('handles empty input gracefully without NaN or negative scores', () => {
    const { metrics, issues } = analyzeContent('', brief)

    expect(metrics.wordCount).toBe(0)
    expect(metrics.overall).toBe(0)
    expect(metrics.seo).toBe(0)
    expect(metrics.geo).toBe(0)
    expect(metrics.aio).toBe(0)
    expect(Number.isNaN(metrics.overall)).toBe(false)
    expect(issues.length).toBeGreaterThan(0)
  })

  it('detects missing critical topics in audit issues', () => {
    const minimalText = 'Short paragraph without key entities.'
    const { issues, updatedBrief } = analyzeContent(minimalText, brief)

    const unmentioned = updatedBrief.topics.filter(t => t.currentCount === 0)
    expect(unmentioned.length).toBe(brief.topics.length)

    const topicIssue = issues.find(i => i.type === 'seo' && i.title.includes('critical semantic entities'))
    expect(topicIssue).toBeDefined()
  })

  it('rewards GEO citation structures: definitional anchors and numerical metrics', () => {
    const textWithoutGeo = 'This guide covers search engines and website ranking strategies.'
    const { metrics: metricsWithout } = analyzeContent(textWithoutGeo, brief)

    const textWithGeo = `
      Generative Engine Optimization is defined as the process of optimizing content for LLMs.
      Empirical studies show a 34% increase in citation frequency and 2.5x benchmark improvement.
    `
    const { metrics: metricsWith } = analyzeContent(textWithGeo, brief)

    expect(metricsWith.geo).toBeGreaterThan(metricsWithout.geo)
    expect(metricsWith.geoCitationsCount).toBeGreaterThan(metricsWithout.geoCitationsCount)
  })

  it('evaluates AIO question capture and direct answer formatting', () => {
    const textWithFaq = `
      # Guide
      ## What is Generative Engine Optimization (GEO)?
      Generative Engine Optimization is the process of optimizing content for discovery by AI answer engines.
    `
    const { updatedBrief } = analyzeContent(textWithFaq, brief)
    const targetQ = updatedBrief.questions.find(q => q.id === 'q1')
    expect(targetQ?.answered).toBe(true)
  })

  it('accurately parses markdown structure (H1, H2, H3, paragraphs, lists)', () => {
    const structuredDoc = `# Main Title
Intro text.
## Section One
Detail paragraph.
### Sub Section
- Point 1
- Point 2
## Section Two
Final thought.`
    const { metrics } = analyzeContent(structuredDoc, brief)
    expect(metrics.headingCount).toBe(3) // 2 H2 + 1 H3
    expect(metrics.structuredListsCount).toBe(2)
  })

  it('dynamically generates brief for custom query without preset', () => {
    const customBrief = generateBriefForQuery('Serverless Vector Databases')
    expect(customBrief.query).toBe('Serverless Vector Databases')
    expect(customBrief.topics.length).toBeGreaterThan(5)
    expect(customBrief.questions.length).toBeGreaterThanOrEqual(3)
    expect(customBrief.outline.length).toBeGreaterThanOrEqual(3)
    expect(customBrief.competitors.length).toBeGreaterThanOrEqual(2)
  })

  it('verifies Ollama finishDraft completes full article from plan with elevated score', async () => {
    const { ollama } = await import('../ollama')
    const customBrief = generateBriefForQuery('Generative Engine Optimization (GEO)')
    const draft = await ollama.finishDraft(
      customBrief.query,
      customBrief.outline,
      customBrief.topics.map(t => t.term),
      customBrief.questions.map(q => q.question),
      ''
    )

    expect(draft).toBeDefined()
    expect(draft.length).toBeGreaterThan(200)

    const { metrics } = analyzeContent(draft, customBrief)
    expect(metrics.overall).toBeGreaterThanOrEqual(70)
    expect(metrics.headingCount).toBeGreaterThanOrEqual(3)
    expect(metrics.geoCitationsCount).toBeGreaterThanOrEqual(1)
  })

  it('verifies Ollama boostContent resolves deficits and elevates audit score', async () => {
    const { ollama } = await import('../ollama')
    const customBrief = generateBriefForQuery('Generative Engine Optimization (GEO)')
    const initialDraft = 'A short draft lacking semantic entities and statistics.'
    const { metrics: initialMetrics, issues: initialIssues } = analyzeContent(initialDraft, customBrief)
    expect(initialIssues.length).toBeGreaterThan(0)

    const boosted = await ollama.boostContent(
      initialDraft,
      customBrief.query,
      ['large language models', 'citation frequency', 'perplexity ai'],
      ['How does GEO differ from traditional SEO?']
    )

    const { metrics: boostedMetrics } = analyzeContent(boosted, customBrief)
    expect(boostedMetrics.overall).toBeGreaterThan(initialMetrics.overall)
    expect(boostedMetrics.geo).toBeGreaterThan(initialMetrics.geo)
  })
})
