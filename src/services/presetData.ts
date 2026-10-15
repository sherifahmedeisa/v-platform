import type { ProjectBrief } from '../types'


export function generateBriefForQuery(query: string): ProjectBrief {
  const clean = (query || '').trim() || 'Content Architecture'
  const words = clean.split(/\s+/).filter(Boolean)
  const baseKeyword = clean.toLowerCase()

  const topics: ProjectBrief['topics'] = [
    { term: baseKeyword, category: 'seo', targetMin: 3, targetMax: 6, currentCount: 0, importance: 5 },
    { term: `${words[0]?.toLowerCase() || 'content'} architecture`, category: 'seo', targetMin: 2, targetMax: 4, currentCount: 0, importance: 4 },
    { term: 'empirical benchmarks', category: 'geo', targetMin: 1, targetMax: 3, currentCount: 0, importance: 4 },
    { term: 'citation frequency', category: 'geo', targetMin: 1, targetMax: 3, currentCount: 0, importance: 4 },
    { term: 'information gain', category: 'seo', targetMin: 2, targetMax: 4, currentCount: 0, importance: 4 },
    { term: 'large language models', category: 'geo', targetMin: 2, targetMax: 4, currentCount: 0, importance: 3 },
    { term: 'structured data', category: 'aio', targetMin: 2, targetMax: 4, currentCount: 0, importance: 3 },
    { term: 'search intent', category: 'aio', targetMin: 2, targetMax: 4, currentCount: 0, importance: 3 },
  ]

  const competitors: ProjectBrief['competitors'] = [
    {
      rank: 1,
      title: `The Authority Guide to ${clean}`,
      url: `https://example.com/${encodeURIComponent(clean)}`,
      domain: 'authorityguide.com',
      words: 1680,
      headings: 7,
      geoScore: 85,
      score: 86,
      seoScore: 88,
      aioScore: 82,
      topicMentions: {
        [baseKeyword]: 5,
        [`${words[0]?.toLowerCase() || 'content'} architecture`]: 3,
        'empirical benchmarks': 2,
        'citation frequency': 3,
        'information gain': 3,
        'large language models': 2,
        'structured data': 3,
        'search intent': 3,
      },
      headingsList: [
        { level: 'h2', text: `Definitive Overview of ${clean}` },
        { level: 'h2', text: 'Key Architecture & Semantic Requirements' },
        { level: 'h3', text: 'Algorithmic Retrieval and Entity Mapping' },
        { level: 'h2', text: 'Empirical Verification & AI Citation Impact' },
        { level: 'h2', text: 'Best Practices for Content Implementation' },
      ],
    },
    {
      rank: 2,
      title: `${clean}: Operational Playbook`,
      url: `https://example.com/playbook`,
      domain: 'playbookhub.io',
      words: 1490,
      headings: 6,
      geoScore: 81,
      score: 80,
      seoScore: 82,
      aioScore: 78,
      topicMentions: {
        [baseKeyword]: 4,
        [`${words[0]?.toLowerCase() || 'content'} architecture`]: 2,
        'empirical benchmarks': 1,
        'citation frequency': 2,
        'information gain': 2,
        'large language models': 3,
        'structured data': 2,
        'search intent': 4,
      },
      headingsList: [
        { level: 'h2', text: `Understanding ${clean} in Modern Search` },
        { level: 'h2', text: 'Strategic Implementation Framework' },
        { level: 'h2', text: 'Measuring Information Gain and Metrics' },
        { level: 'h2', text: 'Actionable Checklist' },
      ],
    },
    {
      rank: 3,
      title: `Comparative Analysis: ${clean} Strategies`,
      url: `https://example.com/strategies`,
      domain: 'analysishub.com',
      words: 1380,
      headings: 5,
      geoScore: 77,
      score: 76,
      seoScore: 78,
      aioScore: 73,
      topicMentions: {
        [baseKeyword]: 3,
        [`${words[0]?.toLowerCase() || 'content'} architecture`]: 2,
        'empirical benchmarks': 2,
        'citation frequency': 1,
        'information gain': 2,
        'large language models': 2,
        'structured data': 1,
        'search intent': 2,
      },
      headingsList: [
        { level: 'h2', text: `Core Tenets of ${clean}` },
        { level: 'h2', text: 'Data Benchmarks and Retrieval' },
        { level: 'h2', text: 'Common Mistakes and Deficits' },
      ],
    },
  ]

  return {
    query: clean,
    targetWordCount: 1500,
    targetReadability: 'Professional Technical',
    targetScore: 82,
    topics,
    questions: [
      { id: 'q1', question: `What is ${clean}?`, intent: 'definitional', answered: false },
      { id: 'q2', question: `Why is ${clean} critical for search and generative models?`, intent: 'evaluative', answered: false },
      { id: 'q3', question: `How can you implement ${clean} step-by-step?`, intent: 'procedural', answered: false },
    ],
    outline: [
      { id: 'o1', level: 'h2', title: `Definitive Overview of ${clean}`, keyTopics: [baseKeyword, 'definitional clarity'] },
      { id: 'o2', level: 'h2', title: 'Key Architecture & Semantic Requirements', keyTopics: ['structured data', 'information gain'] },
      { id: 'o3', level: 'h2', title: 'Empirical Verification & AI Citation Impact', keyTopics: ['empirical benchmarks', 'citation frequency'] },
    ],
    competitors,
  }
}
