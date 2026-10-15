import { describe, it, expect } from 'vitest'
import {
  computeCompareAnalysis,
  extractMarkdownHeadings,
  isHeadingCovered,
  tokenizeHeading,
} from '../compare'
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

describe('Compare Analysis Engine (Frase logic vs SERP competitors)', () => {
  const brief = generateBriefForQuery('generative engine optimization')
  const { metrics } = analyzeContent(SAMPLE_GEO_TEXT, brief)

  it('extracts H2 and H3 markdown headings cleanly and ignores code blocks', () => {
    const md = `
# Title
## First H2 Section ##
Some content
\`\`\`markdown
## Code block heading should be ignored
### Another fake heading
\`\`\`
### Nested **H3** Subsection
More content
## Second H2 Section
    `
    const headings = extractMarkdownHeadings(md)
    expect(headings).toHaveLength(3)
    expect(headings[0]).toEqual({ level: 'h2', text: 'First H2 Section' })
    expect(headings[1]).toEqual({ level: 'h3', text: 'Nested H3 Subsection' })
    expect(headings[2]).toEqual({ level: 'h2', text: 'Second H2 Section' })
  })

  it('preserves short domain keywords in tokenization', () => {
    const tokens = tokenizeHeading('SEO and AI in GEO Systems')
    expect(tokens.has('seo')).toBe(true)
    expect(tokens.has('ai')).toBe(true)
    expect(tokens.has('geo')).toBe(true)
    expect(tokens.has('and')).toBe(false) // stopword filtered
    expect(tokens.has('in')).toBe(false) // stopword filtered
  })

  it('evaluates heading coverage with token overlap and content matches', () => {
    const userHeadings = [
      { text: 'Core Differences Between SEO and GEO' },
      { text: 'Core Principles of GEO' },
    ]
    const content = 'This section details generative engine optimization methods.'

    // High overlap
    const test1 = isHeadingCovered('GEO vs Traditional SEO: Core Differences', userHeadings, content)
    expect(test1.isCovered).toBe(true)

    // Unrelated
    const test2 = isHeadingCovered('Deep Technical Backlink Architecture Analysis', userHeadings, content)
    expect(test2.isCovered).toBe(false)
  })

  it('prevents false positives on single stop words (e.g. What is X vs What is Y)', () => {
    const userHeadings = [{ text: 'What is Python?' }]
    const content = ''

    const test = isHeadingCovered('What is SEO?', userHeadings, content)
    expect(test.isCovered).toBe(false)
  })

  it('correctly matches short acronym headings like "SEO and AI"', () => {
    const userHeadings = [{ text: 'SEO and AI' }]
    const content = 'Some text about SEO and AI.'

    const test = isHeadingCovered('SEO and AI', userHeadings, content)
    expect(test.isCovered).toBe(true)
  })

  it('computes complete compare overview metrics against SERP competitors', () => {
    const result = computeCompareAnalysis(SAMPLE_GEO_TEXT, brief, metrics)

    expect(result.overview.userScore).toBe(metrics.overall)
    expect(result.overview.userWords).toBe(metrics.wordCount)
    expect(result.overview.avgCompetitorScore).toBeGreaterThanOrEqual(70)
    expect(result.overview.topCompetitorScore).toBeGreaterThanOrEqual(85)
    expect(result.overview.avgCompetitorWords).toBeGreaterThan(1000)
    expect(result.overview.avgCompetitorHeadings).toBeGreaterThanOrEqual(5)
    expect(result.overview.avgCompetitorGeo).toBeGreaterThan(70)
    expect(result.overview.contentGapCount).toBeGreaterThanOrEqual(1)
    expect(result.overview.totalCompetitorsCount).toBe(brief.competitors.length)
    expect(result.overview.activeCompetitorsCount).toBe(brief.competitors.length)
  })

  it('dynamically recalculates benchmarks when a competitor cohort is selected', () => {
    // Only select Competitor #1
    const resultCohort = computeCompareAnalysis(SAMPLE_GEO_TEXT, brief, metrics, [1])

    expect(resultCohort.overview.activeCompetitorsCount).toBe(1)
    expect(resultCohort.overview.totalCompetitorsCount).toBe(brief.competitors.length)
    const comp1 = brief.competitors.find((c) => c.rank === 1)!
    expect(resultCohort.overview.avgCompetitorScore).toBe(comp1.score)
    expect(resultCohort.overview.avgCompetitorWords).toBe(comp1.words)
    expect(resultCohort.overview.avgCompetitorHeadings).toBe(comp1.headings)
  })

  it('produces topic frequency heatmap matrix across all competitors', () => {
    const result = computeCompareAnalysis(SAMPLE_GEO_TEXT, brief, metrics)

    expect(result.topicRows.length).toBe(brief.topics.length)

    // Check row structure
    const geoTopic = result.topicRows.find((r) => r.term === 'generative engine optimization')
    expect(geoTopic).toBeDefined()
    expect(geoTopic?.competitorCounts[1]).toBe(5) // Rank 1 competitor mention count
    expect(geoTopic?.competitorCounts[2]).toBe(4) // Rank 2 competitor mention count
    expect(geoTopic?.serpAvgCount).toBeGreaterThan(0)
    expect(geoTopic?.serpMaxCount).toBeGreaterThanOrEqual(5)
    expect(geoTopic?.competitorInclusionRate).toBeGreaterThan(0.7)
  })

  it('flags over-optimized topics when user count exceeds targetMax', () => {
    const modifiedBrief = {
      ...brief,
      topics: [
        {
          term: 'keyword stuffing test',
          category: 'seo' as const,
          targetMin: 2,
          targetMax: 4,
          currentCount: 8,
          importance: 3,
        },
      ],
    }
    const result = computeCompareAnalysis('keyword stuffing test', modifiedBrief, metrics)
    expect(result.topicRows[0].status).toBe('over')
  })

  it('identifies missing topics as content gaps when competitors heavily cover them', () => {
    const result = computeCompareAnalysis(SAMPLE_GEO_TEXT, brief, metrics)

    expect(result.gaps.length).toBeGreaterThan(0)
    for (const gap of result.gaps) {
      expect(gap.userCount).toBe(0)
      expect(gap.isGap).toBe(true)
      expect(gap.competitorInclusionRate).toBeGreaterThanOrEqual(0.4)
    }
  })

  it('accurately groups competitor headings and flags missing outline opportunities', () => {
    const result = computeCompareAnalysis(SAMPLE_GEO_TEXT, brief, metrics)

    expect(result.headingGaps.length).toBeGreaterThan(0)
    const firstGap = result.headingGaps[0]
    expect(firstGap.text).toBeDefined()
    expect(firstGap.competitorRanks.length).toBeGreaterThanOrEqual(1)
    expect(typeof firstGap.inDraft).toBe('boolean')
  })

  it('handles edge case: empty brief competitors gracefully without crash', () => {
    const emptyCompBrief = {
      ...brief,
      competitors: [],
    }
    const emptyMetrics = { ...metrics, overall: 0, wordCount: 0 }
    const result = computeCompareAnalysis('', emptyCompBrief, emptyMetrics)

    expect(result.overview.avgCompetitorScore).toBe(brief.targetScore)
    expect(result.overview.avgCompetitorWords).toBe(brief.targetWordCount)
    expect(result.topicRows.length).toBe(brief.topics.length)
    expect(Number.isNaN(result.overview.userScore)).toBe(false)
  })

  it('handles edge case: dynamically generated custom search queries', () => {
    const customBrief = generateBriefForQuery('AI Code Reviewers vs Static Analyzers')
    const customMetrics = analyzeContent('Sample draft text.', customBrief)
    const result = computeCompareAnalysis('Sample draft text.', customBrief, customMetrics.metrics)

    expect(result.overview.avgCompetitorScore).toBeGreaterThan(0)
    expect(result.topicRows.length).toBe(customBrief.topics.length)
    expect(result.topicRows[0].serpAvgCount).toBeGreaterThanOrEqual(0)
  })

  it('provides detailed competitor-by-competitor mention counts for each topic row', () => {
    const result = computeCompareAnalysis(SAMPLE_GEO_TEXT, brief, metrics)
    const topic = result.topicRows[0]

    expect(topic.competitorCounts).toBeDefined()
    for (const comp of brief.competitors) {
      expect(typeof topic.competitorCounts[comp.rank]).toBe('number')
      expect(topic.competitorCounts[comp.rank]).toBeGreaterThanOrEqual(0)
    }
  })

  it('correctly handles topic spacing without corrupting preceding headings', () => {
    const insertTopic = (prev: string, term: string) => {
      if (!prev || !prev.trim()) return `${term} `
      if (prev.endsWith('\n\n')) return `${prev}${term} `
      if (prev.endsWith('\n')) return `${prev}\n${term} `
      if (prev.endsWith(' ')) return `${prev}${term} `
      return `${prev} ${term} `
    }

    // After a markdown heading ending with double newline
    const headingText = '## Core Architectural Principles\n\n'
    const res1 = insertTopic(headingText, 'knowledge graph')
    expect(res1).toBe('## Core Architectural Principles\n\nknowledge graph ')
    expect(res1.startsWith('## Core Architectural Principles\n\n')).toBe(true)

    // On empty canvas
    const res2 = insertTopic('', 'semantic entity')
    expect(res2).toBe('semantic entity ')

    // In regular paragraph with trailing space
    const res3 = insertTopic('The methodology utilizes ', 'definitional anchor')
    expect(res3).toBe('The methodology utilizes definitional anchor ')
  })
})
