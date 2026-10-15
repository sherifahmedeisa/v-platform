import type { DomainAuditResult, ContentCompetitorMatch, HowToFixItem } from '../types'

export function cleanDomain(rawInput: string): string {
  let text = (rawInput || '').trim().toLowerCase()
  if (!text) return 'example.com'

  // Remove protocols
  text = text.replace(/^https?:\/\//i, '')
  // Remove www.
  text = text.replace(/^www\./i, '')
  // Remove path, query, and fragments
  text = text.split('/')[0].split('?')[0].split('#')[0]
  // Remove port
  text = text.split(':')[0]

  return text || 'example.com'
}

export function deriveWorkspaceName(domainInput: string): string {
  const cleaned = cleanDomain(domainInput)
  if (!cleaned || cleaned === 'example.com') return 'My Workspace'

  // Multi-part TLDs (e.g., .co.uk, .com.au)
  const twoPartTlds = ['co.uk', 'com.au', 'co.jp', 'co.nz', 'org.uk', 'gov.uk', 'ac.uk', 'com.br', 'com.mx', 'co.za']
  let domainCore = cleaned

  for (const tld of twoPartTlds) {
    if (domainCore.endsWith('.' + tld)) {
      domainCore = domainCore.slice(0, -(tld.length + 1))
      break
    }
  }

  const parts = domainCore.split('.')
  // If not already stripped by 2-part TLD check, remove last segment as standard TLD if multiple parts exist
  if (parts.length > 1 && !twoPartTlds.some((t) => cleaned.endsWith('.' + t))) {
    parts.pop()
  }

  // Common subdomains to ignore when finding the brand name
  const commonSubdomains = new Set([
    'app', 'www', 'api', 'dashboard', 'blog', 'docs', 'portal', 'dev',
    'staging', 'beta', 'alpha', 'test', 'admin', 'auth', 'm', 'web',
    'mail', 'support', 'help', 'status', 'cloud', 'login', 'signup', 'console'
  ])

  // Select core brand part: if first part is a known subdomain and we have more parts, use the brand part
  let brandCandidate = parts[0]
  if (parts.length > 1 && commonSubdomains.has(parts[0].toLowerCase())) {
    brandCandidate = parts[1]
  } else if (parts.length > 1 && !commonSubdomains.has(parts[parts.length - 1].toLowerCase())) {
    brandCandidate = parts[parts.length - 1]
  }

  const base = brandCandidate.toLowerCase()

  const specialMap: Record<string, string> = {
    stripe: 'Stripe',
    linear: 'Linear',
    notion: 'Notion',
    vercel: 'Vercel',
    supabase: 'Supabase',
    github: 'GitHub',
    gitlab: 'GitLab',
    openai: 'OpenAI',
    claude: 'Anthropic Claude',
    anthropic: 'Anthropic',
    postman: 'Postman',
    figma: 'Figma',
    slack: 'Slack',
    huggingface: 'Hugging Face',
    perplexity: 'Perplexity AI',
    google: 'Google',
    apple: 'Apple',
    microsoft: 'Microsoft',
    hubspot: 'HubSpot',
    datadog: 'Datadog',
    shopify: 'Shopify',
  }

  if (specialMap[base]) {
    return specialMap[base]
  }

  // Split by dashes, underscores, dots
  const words = base.split(/[-_.]+/)
  return words
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .filter(Boolean)
    .join(' ') || 'My Workspace'
}

function discoverCompetitorsByNiche(cleanedDomain: string, brandName: string): ContentCompetitorMatch[] {
  const searchCorpus = `${cleanedDomain} ${brandName}`.toLowerCase()

  if (
    searchCorpus.includes('linear') ||
    searchCorpus.includes('jira') ||
    searchCorpus.includes('issue') ||
    searchCorpus.includes('sprint') ||
    searchCorpus.includes('kanban') ||
    searchCorpus.includes('backlog')
  ) {
    return [
      {
        name: 'Jira',
        domain: 'atlassian.com/jira',
        matchPercentage: 91,
        keywordOverlap: 88,
        semanticEntityScore: 94,
        searchIntentScore: 92,
        topKeywords: ['issue tracking', 'sprint cycles', 'project backlog', 'engineering roadmap'],
        strengths: ['Massive domain authority and deep enterprise feature documentation'],
        gaps: ['Lacks high-speed keyboard-first workflows and clean minimal markdown specs'],
      },
      {
        name: 'Asana',
        domain: 'asana.com',
        matchPercentage: 82,
        keywordOverlap: 79,
        semanticEntityScore: 85,
        searchIntentScore: 84,
        topKeywords: ['work management', 'task workflows', 'team roadmaps', 'milestone tracking'],
        strengths: ['Broad cross-functional business adoption and collaborative timeline views'],
        gaps: ['Less developer-centric; weaker Git/PR bi-directional sync coverage'],
      },
      {
        name: 'Shortcut',
        domain: 'shortcut.com',
        matchPercentage: 79,
        keywordOverlap: 76,
        semanticEntityScore: 81,
        searchIntentScore: 82,
        topKeywords: ['software planning', 'story points', 'cycle time', 'developer productivity'],
        strengths: ['Focused engineering team tracking with Kanban and sprint boards'],
        gaps: ['Fewer automated AI triage and synthesis integrations'],
      },
      {
        name: 'ClickUp',
        domain: 'clickup.com',
        matchPercentage: 74,
        keywordOverlap: 71,
        semanticEntityScore: 76,
        searchIntentScore: 77,
        topKeywords: ['all-in-one workspace', 'docs and tasks', 'sprint planning', 'custom views'],
        strengths: ['Extensive feature matrix and high search query capture'],
        gaps: ['Interface clutter reduces user focus compared to minimalist modern tools'],
      },
    ]
  }

  if (
    searchCorpus.includes('stripe') ||
    searchCorpus.includes('payment') ||
    searchCorpus.includes('billing') ||
    searchCorpus.includes('checkout') ||
    searchCorpus.includes('fintech') ||
    searchCorpus.includes('adyen')
  ) {
    return [
      {
        name: 'Adyen',
        domain: 'adyen.com',
        matchPercentage: 89,
        keywordOverlap: 86,
        semanticEntityScore: 92,
        searchIntentScore: 90,
        topKeywords: ['global payments', 'unified commerce', 'payment processing', 'interchange-plus'],
        strengths: ['Dominant enterprise omnichannel acquiring and single-platform POS integration'],
        gaps: ['Developer documentation and self-serve onboarding are less frictionless than Stripe'],
      },
      {
        name: 'Paddle',
        domain: 'paddle.com',
        matchPercentage: 83,
        keywordOverlap: 81,
        semanticEntityScore: 85,
        searchIntentScore: 84,
        topKeywords: ['merchant of record', 'SaaS billing', 'global tax compliance', 'subscription management'],
        strengths: ['Full Merchant of Record (MoR) model handling sales tax and VAT liability automatically'],
        gaps: ['Higher transaction percentage fees for custom enterprise payment flows'],
      },
      {
        name: 'Square',
        domain: 'squareup.com',
        matchPercentage: 77,
        keywordOverlap: 74,
        semanticEntityScore: 79,
        searchIntentScore: 80,
        topKeywords: ['point of sale', 'merchant accounts', 'card processing', 'invoicing software'],
        strengths: ['Huge in-person brick-and-mortar retail presence with turn-key hardware'],
        gaps: ['Complex multi-currency cross-border programmatic API capabilities'],
      },
    ]
  }

  if (
    searchCorpus.includes('supabase') ||
    searchCorpus.includes('firebase') ||
    searchCorpus.includes('postgres') ||
    searchCorpus.includes('database') ||
    searchCorpus.includes('neon') ||
    searchCorpus.includes('sql')
  ) {
    return [
      {
        name: 'Firebase',
        domain: 'firebase.google.com',
        matchPercentage: 92,
        keywordOverlap: 89,
        semanticEntityScore: 94,
        searchIntentScore: 91,
        topKeywords: ['backend as a service', 'realtime database', 'auth and storage', 'nosql document store'],
        strengths: ['Massive Google ecosystem footprint and turnkey mobile analytics'],
        gaps: ['Proprietary lock-in; lacks relational SQL power and open-source Postgres self-hosting'],
      },
      {
        name: 'Neon',
        domain: 'neon.tech',
        matchPercentage: 86,
        keywordOverlap: 83,
        semanticEntityScore: 88,
        searchIntentScore: 87,
        topKeywords: ['serverless postgres', 'database branching', 'cloud sql', 'instant autoscaling'],
        strengths: ['State-of-the-art storage/compute separation with instantaneous copy-on-write branching'],
        gaps: ['Focused strictly on database layer; does not offer native built-in Auth, Storage, or Edge UI'],
      },
      {
        name: 'AWS RDS / Aurora',
        domain: 'aws.amazon.com/rds',
        matchPercentage: 78,
        keywordOverlap: 75,
        semanticEntityScore: 80,
        searchIntentScore: 81,
        topKeywords: ['relational database', 'managed postgres', 'enterprise rds', 'cloud infrastructure'],
        strengths: ['Unrivaled enterprise compliance, multi-region failover, and VPC networking'],
        gaps: ['Complex provisioning overhead and steep operational learning curve'],
      },
    ]
  }

  if (
    searchCorpus.includes('vercel') ||
    searchCorpus.includes('netlify') ||
    searchCorpus.includes('frontend') ||
    searchCorpus.includes('edge') ||
    searchCorpus.includes('deploy') ||
    searchCorpus.includes('jamstack')
  ) {
    return [
      {
        name: 'Netlify',
        domain: 'netlify.com',
        matchPercentage: 91,
        keywordOverlap: 88,
        semanticEntityScore: 93,
        searchIntentScore: 90,
        topKeywords: ['frontend cloud', 'jamstack deployment', 'edge functions', 'automated ci/cd'],
        strengths: ['Pioneer in Jamstack architecture with rich form processing and identity plugins'],
        gaps: ['Less deeply optimized for Next.js App Router and React Server Components than Vercel'],
      },
      {
        name: 'Cloudflare Pages',
        domain: 'pages.cloudflare.com',
        matchPercentage: 84,
        keywordOverlap: 81,
        semanticEntityScore: 86,
        searchIntentScore: 85,
        topKeywords: ['edge hosting', 'global cdn', 'serverless workers', 'instant rollback'],
        strengths: ['Unmatched global Anycast network footprint with zero-egress fee pricing'],
        gaps: ['Edge runtime node compatibility requires polyfills for certain legacy npm packages'],
      },
      {
        name: 'AWS Amplify',
        domain: 'aws.amazon.com/amplify',
        matchPercentage: 77,
        keywordOverlap: 74,
        semanticEntityScore: 79,
        searchIntentScore: 78,
        topKeywords: ['fullstack deployment', 'cloud build', 'nextjs hosting', 'serverless backend'],
        strengths: ['Direct native integration into IAM, DynamoDB, Cognito, and Amazon CloudFront'],
        gaps: ['Higher deployment friction and slower build cache times compared to specialized frontend clouds'],
      },
    ]
  }

  if (
    searchCorpus.includes('notion') ||
    searchCorpus.includes('coda') ||
    searchCorpus.includes('obsidian') ||
    searchCorpus.includes('wiki') ||
    searchCorpus.includes('notes') ||
    searchCorpus.includes('workspace') ||
    searchCorpus.includes('doc')
  ) {
    return [
      {
        name: 'Coda',
        domain: 'coda.io',
        matchPercentage: 88,
        keywordOverlap: 85,
        semanticEntityScore: 91,
        searchIntentScore: 89,
        topKeywords: ['all-in-one doc', 'interactive databases', 'workflow packs', 'formula tables'],
        strengths: ['Deeper automation scripting and programmatic formula capabilities'],
        gaps: ['Steeper learning curve and smaller ecosystem of consumer design templates'],
      },
      {
        name: 'Obsidian',
        domain: 'obsidian.md',
        matchPercentage: 80,
        keywordOverlap: 76,
        semanticEntityScore: 82,
        searchIntentScore: 83,
        topKeywords: ['knowledge base', 'bidirectional linking', 'local markdown', 'graph view'],
        strengths: ['100% local-first privacy, zero vendor lock-in, and instant offline speed'],
        gaps: ['No native real-time team collaboration or enterprise database permissions'],
      },
      {
        name: 'Craft',
        domain: 'craft.do',
        matchPercentage: 75,
        keywordOverlap: 72,
        semanticEntityScore: 77,
        searchIntentScore: 78,
        topKeywords: ['visual documents', 'structured notes', 'native macOS docs', 'design writing'],
        strengths: ['Stunning Apple-native typography and card formatting'],
        gaps: ['Less relational database power than Notion databases'],
      },
    ]
  }

  // Dynamic calculation for arbitrary domains
  const seed = cleanedDomain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const comp1Match = Math.min(92, Math.max(75, 88 - (seed % 10)))
  const comp2Match = Math.min(88, Math.max(70, comp1Match - 6))
  const comp3Match = Math.min(82, Math.max(64, comp2Match - 7))

  const baseName = cleanedDomain.split('.')[0]
  const capitalizedBase = baseName.charAt(0).toUpperCase() + baseName.slice(1)

  return [
    {
      name: `${capitalizedBase} Prime`,
      domain: `get${baseName}.io`,
      matchPercentage: comp1Match,
      keywordOverlap: comp1Match - 4,
      semanticEntityScore: comp1Match + 2,
      searchIntentScore: comp1Match - 1,
      topKeywords: [`${baseName} platform`, 'enterprise automation', 'workflow intelligence', 'best tools 2026'],
      strengths: ['Established content footprint with structured JSON-LD schemas and FAQ blocks'],
      gaps: ['Lacks real-time benchmark synthesis and conversational LLM query optimization'],
    },
    {
      name: 'Apex Scale',
      domain: 'apexscale.io',
      matchPercentage: comp2Match,
      keywordOverlap: comp2Match - 5,
      semanticEntityScore: comp2Match + 1,
      searchIntentScore: comp2Match,
      topKeywords: ['workflow management', 'cloud integration', 'developer productivity', 'performance benchmarks'],
      strengths: ['High domain rating with extensive comparative review guides'],
      gaps: ['Deficits in structured heading depth (H2/H3 semantic clarity)'],
    },
    {
      name: 'Nova Cloud',
      domain: 'novacloud.ai',
      matchPercentage: comp3Match,
      keywordOverlap: comp3Match - 3,
      semanticEntityScore: comp3Match - 2,
      searchIntentScore: comp3Match + 4,
      topKeywords: ['modern cloud platform', 'AI search optimization', 'technical specs', 'architecture overview'],
      strengths: ['Clean, modern interface documentation and rapid page speed index'],
      gaps: ['Low keyword entity density in procedural how-to tutorials'],
    },
  ]
}

export function computeDomainAudit(domainInput: string, workspaceName?: string): DomainAuditResult {
  const cleaned = cleanDomain(domainInput)
  const name = workspaceName?.trim() || deriveWorkspaceName(cleaned)

  // Dynamic analysis & scores based on domain string hashing
  const seed = cleaned.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  const seo = Math.min(96, Math.max(68, 68 + (seed % 20)))
  const geo = Math.min(96, Math.max(70, 72 + ((seed * 3) % 22)))
  const aio = Math.min(95, Math.max(70, 70 + ((seed * 7) % 23)))

  const overall = Math.round(0.4 * geo + 0.35 * aio + 0.25 * seo)
  const competitors = discoverCompetitorsByNiche(cleaned, name)

  const fixes: HowToFixItem[] = [
    {
      id: `fix-${cleaned.replace(/\./g, '-')}-1`,
      category: 'geo',
      impact: 'high',
      title: 'Deploy Structured Entity Citations for Generative Retrieval',
      detail: `AI answer engines (Perplexity, SearchGPT) index ${cleaned} more effectively when authoritative data benchmarks are displayed in tabular format.`,
      fixProposal: `Add comparison tables with concrete metrics and third-party entity benchmarks comparing ${name} against industry alternatives.`,
      snippet: `| Feature | ${name} | Industry Standard |\n|---|---|---|\n| Latency | <100ms | 350ms |\n| LLM Indexing | Instant | Batch 24h |`,
    },
    {
      id: `fix-${cleaned.replace(/\./g, '-')}-2`,
      category: 'aio',
      impact: 'high',
      title: 'Implement Concise Definitional Lead Blocks (AIO Snippet Capture)',
      detail: `Google AI Overviews prioritizes content on ${cleaned} with direct 35-50 word definitional answers immediately under main questions.`,
      fixProposal: `Prepend each main section with a bold summary statement providing immediate definitional clarity about ${name}.`,
      snippet: `**${name} is an advanced web platform designed to streamline digital operations, automate workflows, and maximize content discoverability across next-generation generative search engines.**`,
    },
    {
      id: `fix-${cleaned.replace(/\./g, '-')}-3`,
      category: 'seo',
      impact: 'medium',
      title: 'Optimize Heading Semantic Structure (H1 -> H2 -> H3)',
      detail: `Crawlers on ${cleaned} detected opportunities in heading depth hierarchy to reinforce keyword relevance across search engines.`,
      fixProposal: 'Enforce strict heading hierarchy with primary semantic terms included in the initial four words of each section.',
      snippet: `## ${name} Architecture & Core Principles\n### High-Velocity Execution Engine`,
    },
  ]

  return {
    domain: cleaned,
    name,
    overallScore: overall,
    seoScore: seo,
    geoScore: geo,
    aioScore: aio,
    targetScore: 85,
    howToFix: fixes,
    competitors,
  }
}
