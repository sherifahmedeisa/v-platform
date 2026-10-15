export type TabType = 'topics' | 'compare' | 'outline' | 'questions' | 'audit'

export interface SemanticTopic {
  term: string
  category: 'seo' | 'geo' | 'aio'
  targetMin: number
  targetMax: number
  currentCount: number
  importance: number // 1 to 5
}

export interface QuestionItem {
  id: string
  question: string
  intent: 'definitional' | 'comparative' | 'procedural' | 'evaluative'
  answered: boolean
  suggestedAnswer?: string
}

export interface OutlineItem {
  id: string
  level: 'h2' | 'h3'
  title: string
  keyTopics: string[]
}

export interface CompetitorHeading {
  level: 'h2' | 'h3'
  text: string
}

export interface SerpCompetitor {
  rank: number
  title: string
  url: string
  domain?: string
  words: number
  headings: number
  geoScore: number
  score?: number
  seoScore?: number
  aioScore?: number
  sections?: number
  headingsList?: CompetitorHeading[]
  topicMentions?: Record<string, number>
}

export type CompareSubTab = 'heatmap' | 'outlines' | 'gaps' | 'benchmarks'

export interface TopicComparisonRow {
  term: string
  category: 'seo' | 'geo' | 'aio'
  userCount: number
  targetMin: number
  targetMax: number
  serpAvgCount: number
  serpMaxCount: number
  competitorCounts: Record<number, number> // rank -> count
  isGap: boolean
  status: 'missing' | 'under' | 'optimal' | 'over'
  competitorInclusionRate: number // 0 to 1
  importance: number
}

export interface HeadingGapItem {
  text: string
  level: 'h2' | 'h3'
  competitorRanks: number[]
  frequency: number
  inDraft: boolean
  similarityMatch?: string
}

export interface CompareOverviewMetrics {
  userScore: number
  avgCompetitorScore: number
  topCompetitorScore: number
  userWords: number
  avgCompetitorWords: number
  targetWords: number
  userHeadings: number
  avgCompetitorHeadings: number
  targetHeadings: number
  userGeoScore: number
  avgCompetitorGeo: number
  contentGapCount: number
  coveredTopicsRatio: number
  activeCompetitorsCount?: number
  totalCompetitorsCount?: number
}

export interface CompareAnalysisResult {
  overview: CompareOverviewMetrics
  topicRows: TopicComparisonRow[]
  headingGaps: HeadingGapItem[]
  gaps: TopicComparisonRow[]
}

export interface ProjectBrief {
  query: string
  targetWordCount: number
  targetReadability: string
  targetScore: number
  topics: SemanticTopic[]
  questions: QuestionItem[]
  outline: OutlineItem[]
  competitors: SerpCompetitor[]
}

export interface ScoreMetrics {
  overall: number
  seo: number
  geo: number
  aio: number
  wordCount: number
  targetWordCount: number
  headingCount: number
  topicsCovered: number
  totalTopics: number
  geoCitationsCount: number
  definitionalBlocks: number
  structuredListsCount: number
}

export interface AuditIssue {
  type: 'seo' | 'geo' | 'aio'
  title: string
  detail: string
  impact: 'high' | 'medium' | 'low'
  fixProposal: string
}

export interface ContentCompetitorMatch {
  name: string
  domain: string
  matchPercentage: number
  keywordOverlap: number
  semanticEntityScore: number
  searchIntentScore: number
  topKeywords: string[]
  strengths: string[]
  gaps: string[]
}

export interface HowToFixItem {
  id: string
  category: 'seo' | 'geo' | 'aio'
  impact: 'high' | 'medium' | 'low'
  title: string
  detail: string
  fixProposal: string
  snippet?: string
}

export interface Workspace {
  id: string
  userId: string
  name: string
  domain: string
  targetScore: number
  overallScore: number
  seoScore: number
  geoScore: number
  aioScore: number
  howToFix: HowToFixItem[]
  competitors: ContentCompetitorMatch[]
  createdAt: string
  updatedAt: string
}

export interface DomainAuditResult {
  domain: string
  name: string
  overallScore: number
  seoScore: number
  geoScore: number
  aioScore: number
  targetScore: number
  howToFix: HowToFixItem[]
  competitors: ContentCompetitorMatch[]
}

