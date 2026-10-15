import type { ProjectBrief, ScoreMetrics, AuditIssue } from '../types'

export function analyzeContent(text: string, brief: ProjectBrief): {
  metrics: ScoreMetrics
  updatedBrief: ProjectBrief
  issues: AuditIssue[]
} {
  const cleanText = text.trim()
  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : []
  const wordCount = words.length

  // Count headings
  const h2Count = (text.match(/^##\s+.+$/gm) || []).length
  const h3Count = (text.match(/^###\s+.+$/gm) || []).length
  const headingCount = h2Count + h3Count

  // Count structured lists
  const bulletLists = (text.match(/^\s*[-*]\s+.+$/gm) || []).length
  const numberedLists = (text.match(/^\s*\d+\.\s+.+$/gm) || []).length
  const tableRows = (text.match(/^\|.+\|$/gm) || []).length
  const structuredListsCount = bulletLists + numberedLists + tableRows

  // Check definitional statements (Crucial for GEO: e.g. "is a", "is the", "refers to", "defined as")
  const defRegex = /\b(is\s+a|is\s+an|is\s+the|refers\s+to|defined\s+as|stands\s+for|describes)\b/gi
  const definitionalBlocks = (cleanText.match(defRegex) || []).length

  // Check data benchmarks & statistics (Crucial for GEO: e.g. "30%", "2.5x", "benchmark", "dataset")
  const statRegex = /(\b\d+(\.\d+)?%|\b\d+(\.\d+)?x|\b\d{4}\b|\bmetric\b|\bbenchmark\b|\bdataset\b|\brate\b)/gi
  const geoCitationsCount = (cleanText.match(statRegex) || []).length

  // Topic coverage
  const lowerText = cleanText.toLowerCase()
  let coveredTopicsCount = 0

  const updatedTopics = brief.topics.map(topic => {
    const termLower = topic.term.toLowerCase()
    // Safe word-boundary or substring match
    const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
    const matches = (lowerText.match(regex) || []).length
    if (matches > 0) coveredTopicsCount++
    return {
      ...topic,
      currentCount: matches,
    }
  })

  // Question coverage
  const updatedQuestions = brief.questions.map(q => {
    const questionLower = q.question.toLowerCase().replace(/[?]/g, '')
    const keyWords = questionLower.split(/\s+/).filter(w => w.length > 3)
    const matchedWords = keyWords.filter(w => lowerText.includes(w)).length
    const answered = keyWords.length > 0 && matchedWords / keyWords.length >= 0.6
    return {
      ...q,
      answered,
    }
  })

  // SEO Score calculation (0-100)
  const topicRatio = brief.topics.length > 0 ? (coveredTopicsCount / brief.topics.length) : 0
  const topicScore = Math.min(100, topicRatio * 100)

  const wordRatio = brief.targetWordCount > 0 ? Math.min(1.2, wordCount / brief.targetWordCount) : 0
  const wordScore = Math.min(100, (wordRatio / 1.0) * 100)

  const headingTarget = Math.max(4, Math.floor(brief.targetWordCount / 250))
  const headingScore = Math.min(100, (headingCount / headingTarget) * 100)

  const seoScore = Math.round((topicScore * 0.5) + (wordScore * 0.3) + (headingScore * 0.2))

  // GEO Score calculation (0-100)
  const geoTopics = updatedTopics.filter(t => t.category === 'geo')
  const geoTopicsCovered = geoTopics.filter(t => t.currentCount >= t.targetMin).length
  const geoTopicRatio = geoTopics.length > 0 ? (geoTopicsCovered / geoTopics.length) : 0

  const defScore = Math.min(100, (definitionalBlocks / 3) * 100)
  const statScore = Math.min(100, (geoCitationsCount / 5) * 100)
  const geoScore = Math.round((defScore * 0.35) + (statScore * 0.35) + (geoTopicRatio * 100 * 0.3))

  // AIO Score calculation (0-100)
  const listScore = Math.min(100, (structuredListsCount / 6) * 100)
  const answeredQCount = updatedQuestions.filter(q => q.answered).length
  const qRatio = brief.questions.length > 0 ? (answeredQCount / brief.questions.length) : 0
  const qScore = Math.min(100, qRatio * 100)
  const depthScore = Math.min(100, (wordCount / 500) * 100)

  const aioScore = Math.round((listScore * 0.4) + (qScore * 0.4) + (depthScore * 0.2))

  // Overall Score (Weighted)
  const overall = Math.round((seoScore * 0.4) + (geoScore * 0.35) + (aioScore * 0.25))

  const metrics: ScoreMetrics = {
    overall: Math.min(100, Math.max(0, overall)),
    seo: Math.min(100, Math.max(0, seoScore)),
    geo: Math.min(100, Math.max(0, geoScore)),
    aio: Math.min(100, Math.max(0, aioScore)),
    wordCount,
    targetWordCount: brief.targetWordCount,
    headingCount,
    topicsCovered: coveredTopicsCount,
    totalTopics: brief.topics.length,
    geoCitationsCount,
    definitionalBlocks,
    structuredListsCount,
  }

  // Audit Issues detection
  const issues: AuditIssue[] = []

  const missingImportant = updatedTopics.filter(t => t.currentCount === 0 && t.importance >= 4)
  if (missingImportant.length > 0) {
    issues.push({
      type: 'seo',
      title: `${missingImportant.length} critical semantic entities missing`,
      detail: missingImportant.slice(0, 4).map(t => t.term).join(', '),
      impact: 'high',
      fixProposal: 'Add missing entities to text',
    })
  }

  if (definitionalBlocks < 2) {
    issues.push({
      type: 'geo',
      title: 'Deficit: definitional anchor',
      detail: 'Direct definition missing',
      impact: 'high',
      fixProposal: 'Add definitional anchor in lead',
    })
  }

  if (geoCitationsCount < 3) {
    issues.push({
      type: 'geo',
      title: 'Deficit: citation benchmark',
      detail: 'Quantitative metrics missing',
      impact: 'medium',
      fixProposal: 'Add numerical metrics or percentages',
    })
  }

  if (wordCount < brief.targetWordCount * 0.6) {
    issues.push({
      type: 'seo',
      title: 'Deficit: content length',
      detail: `${wordCount} / ${brief.targetWordCount} words`,
      impact: 'high',
      fixProposal: 'Expand sections to target count',
    })
  }

  const unanswered = updatedQuestions.filter(q => !q.answered)
  if (unanswered.length > 0) {
    issues.push({
      type: 'aio',
      title: 'Deficit: unanswered queries',
      detail: unanswered.slice(0, 2).map(q => q.question).join('; '),
      impact: 'medium',
      fixProposal: 'Answer key queries',
    })
  }

  if (structuredListsCount < 3) {
    issues.push({
      type: 'aio',
      title: 'Deficit: structured format',
      detail: 'Lists or table missing',
      impact: 'low',
      fixProposal: 'Add structured list or table',
    })
  }

  return {
    metrics,
    updatedBrief: {
      ...brief,
      topics: updatedTopics,
      questions: updatedQuestions,
    },
    issues,
  }
}
