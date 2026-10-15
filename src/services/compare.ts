import type {
  ProjectBrief,
  ScoreMetrics,
  SerpCompetitor,
  TopicComparisonRow,
  HeadingGapItem,
  CompareOverviewMetrics,
  CompareAnalysisResult,
  CompetitorHeading,
} from '../types'

/**
 * Extracts headings from a markdown string, ignoring code fences.
 */
export function extractMarkdownHeadings(
  markdown: string
): Array<{ level: 'h2' | 'h3'; text: string }> {
  const headings: Array<{ level: 'h2' | 'h3'; text: string }> = []
  const lines = markdown.split('\n')
  let inCodeBlock = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    if (trimmed.startsWith('### ')) {
      const clean = trimmed
        .replace(/^###\s+/, '')
        .replace(/\s*###$/, '')
        .replace(/[*_`]/g, '')
        .trim()
      if (clean) headings.push({ level: 'h3', text: clean })
    } else if (trimmed.startsWith('## ')) {
      const clean = trimmed
        .replace(/^##\s+/, '')
        .replace(/\s*##$/, '')
        .replace(/[*_`]/g, '')
        .trim()
      if (clean) headings.push({ level: 'h2', text: clean })
    }
  }

  return headings
}

/**
 * Common grammatical stop words to ignore during fuzzy heading tokenization,
 * while intentionally preserving domain keywords (e.g. SEO, GEO, AIO, AI, Web, FAQ, INP, LCP, etc.).
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'as', 'is', 'are', 'was', 'were', 'it', 'its', 'from', 'that', 'this', 'how', 'what',
  'why', 'when', 'where', 'who', 'which', 'do', 'does', 'did', 'be', 'been', 'being',
  'your', 'you', 'our', 'we', 'my', 'me', 'their', 'them', 'about', 'between', 'into',
  'vs', 'versus', 'some', 'any', 'all', 'more', 'most', 'such', 'than', 'then',
])

/**
 * Normalizes text for fuzzy token matching, retaining short domain keywords (length >= 2).
 */
export function tokenizeHeading(text: string): Set<string> {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const words = clean.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
  return new Set(words)
}

/**
 * Checks if a competitor heading is covered in existing user headings or text.
 */
export function isHeadingCovered(
  competitorHeading: string,
  userHeadings: Array<{ text: string }>,
  contentText: string
): { isCovered: boolean; match?: string } {
  const compClean = competitorHeading.trim()
  const compLower = compClean.toLowerCase()

  // 1. Exact string match with existing user heading (case-insensitive)
  for (const uh of userHeadings) {
    if (uh.text.trim().toLowerCase() === compLower) {
      return { isCovered: true, match: uh.text }
    }
  }

  // 2. Exact phrase in content text (if heading has meaningful length)
  const lowerContent = contentText.toLowerCase()
  if (compLower.length >= 4 && lowerContent.includes(compLower)) {
    return { isCovered: true, match: compClean }
  }

  // 3. Token-based fuzzy matching
  const compTokens = tokenizeHeading(compClean)
  if (compTokens.size === 0) {
    // If all tokens were stopwords (e.g. "What and Why"), fallback to all alphanumeric tokens
    const rawTokens = compLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0)
    for (const w of rawTokens) compTokens.add(w)
  }

  if (compTokens.size === 0) {
    return { isCovered: false }
  }

  for (const uh of userHeadings) {
    const userTokens = tokenizeHeading(uh.text)
    if (userTokens.size === 0) continue

    let overlap = 0
    for (const token of compTokens) {
      if (userTokens.has(token)) overlap++
    }

    if (overlap === 0) continue

    const jaccard = overlap / (compTokens.size + userTokens.size - overlap)
    const coverageRatio = overlap / compTokens.size

    // High bidirectional overlap (Jaccard >= 0.5) OR user heading covers >= 65% of competitor key tokens
    if (
      (compTokens.size === 1 && userTokens.size === 1 && overlap === 1) ||
      (overlap >= 2 && coverageRatio >= 0.65) ||
      jaccard >= 0.5
    ) {
      return { isCovered: true, match: uh.text }
    }
  }

  return { isCovered: false }
}

/**
 * Ensures competitor has realistic topic mention counts if not pre-populated.
 */
function getCompetitorTopicCount(
  comp: SerpCompetitor,
  term: string,
  topicImportance: number,
  topicTargetMin: number
): number {
  const lowerTerm = term.toLowerCase()

  // Pre-configured topic mentions map
  if (comp.topicMentions) {
    if (typeof comp.topicMentions[lowerTerm] === 'number') {
      return comp.topicMentions[lowerTerm]
    }
    if (typeof comp.topicMentions[term] === 'number') {
      return comp.topicMentions[term]
    }
  }

  // Check if term is present in competitor headings
  if (comp.headingsList && comp.headingsList.length > 0) {
    const headingMatches = comp.headingsList.filter((h) =>
      h.text.toLowerCase().includes(lowerTerm)
    ).length
    if (headingMatches > 0) {
      return headingMatches * 2
    }
  }

  // Deterministic fallback based on competitor rank and topic importance
  const rankFactor = Math.max(0.3, 1 - (comp.rank - 1) * 0.14)
  const seed = (lowerTerm.charCodeAt(0) + comp.rank * 11 + topicImportance * 7) % 10

  // Allow ~20% of competitors to have 0 mentions for non-vital topics to create genuine gaps
  if (seed < 2 && topicImportance < 4) {
    return 0
  }

  const baseCount = Math.round(topicTargetMin * rankFactor)
  const adjusted = Math.max(0, baseCount + ((seed % 3) - 1))
  return adjusted
}

/**
 * Frase-style compare logic: evaluates the current document against SERP competitors.
 * Supports cohort selection (e.g. including/excluding individual competitors from benchmarks).
 */
export function computeCompareAnalysis(
  content: string,
  brief: ProjectBrief,
  metrics: ScoreMetrics,
  selectedCompetitorRanks?: number[]
): CompareAnalysisResult {
  const allCompetitors = brief.competitors || []
  const userHeadings = extractMarkdownHeadings(content)

  // Filter active cohort if selected ranks are provided and non-empty
  const activeCompetitors =
    selectedCompetitorRanks && selectedCompetitorRanks.length > 0
      ? allCompetitors.filter((c) => selectedCompetitorRanks.includes(c.rank))
      : allCompetitors

  // 1. Overview Calculations
  const competitorScores = activeCompetitors.map((c) => c.score ?? c.geoScore ?? 80)
  const avgCompetitorScore =
    activeCompetitors.length > 0
      ? Math.round(competitorScores.reduce((a, b) => a + b, 0) / activeCompetitors.length)
      : brief.targetScore

  const topCompetitorScore =
    activeCompetitors.length > 0 ? Math.max(...competitorScores) : brief.targetScore

  const competitorWords = activeCompetitors.map((c) => c.words || brief.targetWordCount)
  const avgCompetitorWords =
    activeCompetitors.length > 0
      ? Math.round(competitorWords.reduce((a, b) => a + b, 0) / activeCompetitors.length)
      : brief.targetWordCount

  const competitorHeadings = activeCompetitors.map((c) => c.headings || 6)
  const avgCompetitorHeadings =
    activeCompetitors.length > 0
      ? Math.round(competitorHeadings.reduce((a, b) => a + b, 0) / activeCompetitors.length)
      : 6

  const competitorGeos = activeCompetitors.map((c) => c.geoScore || 80)
  const avgCompetitorGeo =
    activeCompetitors.length > 0
      ? Math.round(competitorGeos.reduce((a, b) => a + b, 0) / activeCompetitors.length)
      : 80

  const targetHeadings = Math.max(4, Math.floor(brief.targetWordCount / 250))

  // 2. Topic Comparison Matrix (Frase Heatmap)
  const topicRows: TopicComparisonRow[] = brief.topics.map((topic) => {
    const userCount = topic.currentCount || 0
    const competitorCounts: Record<number, number> = {}
    let competitorSum = 0
    let competitorMax = 0
    let competitorsCovering = 0

    // Record counts for all competitors, but benchmark averages against active competitors
    for (const comp of allCompetitors) {
      const count = getCompetitorTopicCount(comp, topic.term, topic.importance, topic.targetMin)
      competitorCounts[comp.rank] = count
    }

    for (const comp of activeCompetitors) {
      const count = competitorCounts[comp.rank] ?? 0
      competitorSum += count
      if (count > competitorMax) competitorMax = count
      if (count > 0) competitorsCovering++
    }

    const serpAvgCount =
      activeCompetitors.length > 0
        ? Math.round((competitorSum / activeCompetitors.length) * 10) / 10
        : topic.targetMin
    const serpMaxCount = competitorMax
    const competitorInclusionRate =
      activeCompetitors.length > 0 ? competitorsCovering / activeCompetitors.length : 0

    // Status: missing | under | optimal | over
    let status: 'missing' | 'under' | 'optimal' | 'over'
    if (userCount === 0) {
      status = 'missing'
    } else if (userCount < topic.targetMin) {
      status = 'under'
    } else if (userCount <= topic.targetMax) {
      status = 'optimal'
    } else {
      status = 'over'
    }

    // Gap analysis: user has 0 mentions, but majority of competitors cover it or importance >= 4
    const isGap =
      userCount === 0 && (competitorInclusionRate >= 0.5 || topic.importance >= 4)

    return {
      term: topic.term,
      category: topic.category,
      userCount,
      targetMin: topic.targetMin,
      targetMax: topic.targetMax,
      serpAvgCount,
      serpMaxCount,
      competitorCounts,
      isGap,
      status,
      competitorInclusionRate,
      importance: topic.importance,
    }
  })

  // Prioritize gaps: missing topics with highest competitor inclusion & importance
  const gaps = topicRows
    .filter((r) => r.isGap)
    .sort((a, b) => {
      if (b.competitorInclusionRate !== a.competitorInclusionRate) {
        return b.competitorInclusionRate - a.competitorInclusionRate
      }
      return b.importance - a.importance
    })

  // 3. Competitor Headings & Outline Comparison
  const headingFrequencyMap = new Map<
    string,
    {
      text: string
      level: 'h2' | 'h3'
      ranks: Set<number>
    }
  >()

  for (const comp of allCompetitors) {
    const list: CompetitorHeading[] = comp.headingsList || []
    for (const h of list) {
      const normalizedKey = h.text.trim().toLowerCase()
      const existing = headingFrequencyMap.get(normalizedKey)
      if (existing) {
        existing.ranks.add(comp.rank)
      } else {
        headingFrequencyMap.set(normalizedKey, {
          text: h.text.trim(),
          level: h.level,
          ranks: new Set([comp.rank]),
        })
      }
    }
  }

  const headingGaps: HeadingGapItem[] = []
  for (const [, item] of headingFrequencyMap.entries()) {
    const coverage = isHeadingCovered(item.text, userHeadings, content)
    headingGaps.push({
      text: item.text,
      level: item.level,
      competitorRanks: Array.from(item.ranks).sort((a, b) => a - b),
      frequency: item.ranks.size,
      inDraft: coverage.isCovered,
      similarityMatch: coverage.match,
    })
  }

  // Sort headings: missing first, then by frequency across competitors descending
  headingGaps.sort((a, b) => {
    if (a.inDraft !== b.inDraft) {
      return a.inDraft ? 1 : -1
    }
    return b.frequency - a.frequency
  })

  const coveredTopicsRatio =
    brief.topics.length > 0 ? metrics.topicsCovered / brief.topics.length : 0

  const overview: CompareOverviewMetrics = {
    userScore: metrics.overall,
    avgCompetitorScore,
    topCompetitorScore,
    userWords: metrics.wordCount,
    avgCompetitorWords,
    targetWords: brief.targetWordCount,
    userHeadings: metrics.headingCount,
    avgCompetitorHeadings,
    targetHeadings,
    userGeoScore: metrics.geo,
    avgCompetitorGeo,
    contentGapCount: gaps.length,
    coveredTopicsRatio,
    activeCompetitorsCount: activeCompetitors.length,
    totalCompetitorsCount: allCompetitors.length,
  }

  return {
    overview,
    topicRows,
    headingGaps,
    gaps,
  }
}
