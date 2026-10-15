import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Hash,
  HelpCircle,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Scale,
} from 'lucide-react'
import type {
  TabType,
  ProjectBrief,
  OutlineItem,
  QuestionItem,
  Workspace,
  DomainAuditResult,
} from './types'
import {
  generateBriefForQuery,
} from './services/presetData'
import { computeDomainAudit, cleanDomain } from './services/domain'
import { analyzeContent } from './services/scoring'
import { ollama } from './services/ollama'
import {
  authApi,
  profileApi,
  documentsApi,
  workspacesApi,
  researchApi,
  getCachedUser,
  getStoredToken,
  getLocalWorkspaces,
  getLocalDocs,
  type UserAccount,
  type UserDocument,
  type ResearchStreamEvent,
} from './services/api'

import { Header } from './components/Header'
import { Editor } from './components/Editor'
import { BriefPanel } from './components/BriefPanel'
import { TopicsPanel } from './components/TopicsPanel'
import { QuestionsPanel } from './components/QuestionsPanel'
import { ScoreWidget } from './components/ScoreWidget'
import { ComparePanel } from './components/ComparePanel'
import { AuditBoostModal } from './components/AuditBoostModal'
import { SegmentedControl } from './components/SegmentedControl'
import { AuthModal } from './components/AuthModal'
import { ProfileModal } from './components/ProfileModal'
import { DocumentsModal } from './components/DocumentsModal'
import { OnboardingModal } from './components/OnboardingModal'
import { WebsiteAuditModal } from './components/WebsiteAuditModal'
import { ResearchProgressHud } from './components/ResearchProgressHud'
import { LandingPage } from './components/LandingPage'

export default function App() {
  const initialQuery = 'Content Architecture'
  const [query, setQuery] = useState(initialQuery)
  const [brief, setBrief] = useState<ProjectBrief>(() => generateBriefForQuery(initialQuery))
  const [content, setContent] = useState<string>('')

  // User & Neon PostgreSQL state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCachedUser())

  // Workspace & Domain Intelligence state
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const user = getCachedUser()
    if (!user) return []
    const list = getLocalWorkspaces()
    return list.filter((w) => w.domain !== 'example.com' && (!w.userId || w.userId === user.id))
  })
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(() => {
    const user = getCachedUser()
    if (!user) return null
    const list = getLocalWorkspaces().filter((w) => w.domain !== 'example.com' && (!w.userId || w.userId === user.id))
    const storedId = workspacesApi.getActiveWorkspaceId()
    return list.find((w) => w.id === storedId) || list[0] || null
  })
  const [websiteAuditModalOpen, setWebsiteAuditModalOpen] = useState(false)
  const [isAuditRefreshing, setIsAuditRefreshing] = useState(false)

  const [documents, setDocuments] = useState<UserDocument[]>(() => {
    const user = getCachedUser()
    if (!user) return []
    return getLocalDocs().filter((d) => !d.userId || d.userId === user.id)
  })
  const [currentDocId, setCurrentDocId] = useState<string | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'offline'>(
    currentUser ? 'saved' : 'offline'
  )

  // Navigation & View State
  const [currentView, setCurrentView] = useState<'landing' | 'workspace'>('landing')
  const [onboardingInitialDomain, setOnboardingInitialDomain] = useState<string>('')
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<1 | 2 | 3>(1)
  const [pendingLaunchDomain, setPendingLaunchDomain] = useState<string | null>(null)

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false)
  const [boostModalOpen, setBoostModalOpen] = useState(false)
  const [onboardingKey, setOnboardingKey] = useState(0)
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false)

  const isUserAuthenticated = currentUser !== null && !authApi.isGuestSession()

  const handleOpenOnboarding = (initialDomain?: string, initialStep: 1 | 2 | 3 = 1) => {
    setOnboardingKey((k) => k + 1)
    if (initialDomain) {
      setOnboardingInitialDomain(initialDomain)
    }
    setOnboardingInitialStep(initialStep)
    setOnboardingModalOpen(true)
  }

  const handleLaunchWorkspace = () => {
    if (!isUserAuthenticated) {
      setAuthModalOpen(true)
      return
    }
    setCurrentView('workspace')
    const hasValidWorkspace = currentWorkspace && currentWorkspace.domain !== 'example.com'
    if (!localStorage.getItem('v_platform_onboarded') || !hasValidWorkspace) {
      handleOpenOnboarding(hasValidWorkspace ? currentWorkspace.domain : '', 1)
    }
  }

  const handleLaunchWithDomain = (targetDomain: string) => {
    if (!isUserAuthenticated) {
      setPendingLaunchDomain(targetDomain)
      setAuthModalOpen(true)
      return
    }
    const cleaned = cleanDomain(targetDomain)
    const existing = workspaces.find((w) => w.domain.toLowerCase() === cleaned.toLowerCase() && w.domain !== 'example.com')
    if (existing) {
      handleSelectWorkspace(existing)
      setCurrentView('workspace')
      setWebsiteAuditModalOpen(true)
    } else {
      setCurrentView('workspace')
      handleOpenOnboarding(cleaned, 2)
    }
  }

  const handleOpenDocumentFromLanding = (doc: UserDocument) => {
    if (!isUserAuthenticated) {
      setAuthModalOpen(true)
      return
    }
    handleOpenDocument(doc)
    setCurrentView('workspace')
  }

  // Research streaming state
  const [isResearching, setIsResearching] = useState(false)
  const [researchProgress, setResearchProgress] = useState<{ percent: number; message: string } | null>(null)

  // Sidebar controls
  const [activeTab, setActiveTab] = useState<TabType>('topics')
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  // Ollama Model state
  const [models, setModels] = useState<string[]>(['gemma4:12b', 'qwen3.6:latest', 'gemma4:26b'])
  const [selectedModel, setSelectedModel] = useState<string>('gemma4:12b')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null)
  const [generatingTopicTerm, setGeneratingTopicTerm] = useState<string | null>(null)
  const [focusedCompareTerm, setFocusedCompareTerm] = useState<string | null>(null)

  // Fetch or verify user session on mount
  useEffect(() => {
    async function initUserSession() {
      const token = getStoredToken()
      if (token) {
        try {
          const user = await authApi.getMe()
          setCurrentUser(user)
        } catch {
          // Token expired or invalid: reset session and state
          authApi.logout()
          setCurrentUser(null)
        }
      }
    }
    initUserSession()
  }, [])

  // Load user documents from Neon PostgreSQL
  const currentUserId = currentUser?.id
  useEffect(() => {
    if (!currentUserId) return
    let ignore = false
    documentsApi
      .list()
      .then((docs) => {
        if (!ignore) {
          setDocuments(docs)
          setDocsLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          setDocsLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [currentUserId])

  // Load workspaces from Neon PostgreSQL / local storage
  useEffect(() => {
    let ignore = false
    workspacesApi
      .list()
      .then((wsList) => {
        if (!ignore && wsList.length > 0) {
          setWorkspaces(wsList)
          const storedId = workspacesApi.getActiveWorkspaceId()
          const matched = wsList.find((w) => w.id === storedId) || wsList[0]
          setCurrentWorkspace(matched)
        }
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [currentUserId])



  // Discover local Ollama models on mount
  useEffect(() => {
    async function loadModels() {
      const found = await ollama.fetchAvailableModels()
      if (found.length > 0) {
        setModels(found)
        if (found.includes('gemma4:12b')) {
          setSelectedModel('gemma4:12b')
          ollama.setModel('gemma4:12b')
        } else {
          setSelectedModel(found[0])
          ollama.setModel(found[0])
        }
      }
    }
    loadModels()
  }, [])

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    ollama.setModel(model)
  }

  // Real-time analysis of the content against the brief
  const { metrics, updatedBrief, issues } = useMemo(() => {
    return analyzeContent(content, brief)
  }, [content, brief])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    if (currentUser && currentUser.profile?.preferences?.autoSave !== false) {
      setAutoSaveStatus('unsaved')
    }
  }

  // Debounced Auto-save to Neon PostgreSQL
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)

  useEffect(() => {
    if (!currentUser || currentUser.profile?.preferences?.autoSave === false) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!content || content.length < 20 || isSavingRef.current) return
      try {
        isSavingRef.current = true
        setAutoSaveStatus('saving')
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const docTitle = titleMatch ? titleMatch[1] : `${query} Draft`

        if (currentDocId) {
          const updated = await documentsApi.update(currentDocId, {
            title: docTitle,
            query,
            content,
            brief: brief as unknown as Record<string, unknown>,
            seoScore: metrics.seo,
            geoScore: metrics.geo,
            aioScore: metrics.aio,
            wordCount: metrics.wordCount,
          })
          setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        } else {
          // If draft is new, automatically persist to Neon PostgreSQL
          const created = await documentsApi.create({
            title: docTitle,
            query,
            content,
            brief: brief as unknown as Record<string, unknown>,
            seoScore: metrics.seo,
            geoScore: metrics.geo,
            aioScore: metrics.aio,
            wordCount: metrics.wordCount,
          })
          setCurrentDocId(created.id)
          setDocuments((prev) => [created, ...prev])
        }
        setAutoSaveStatus('saved')
      } catch {
        // Silently tolerate auto-save network flickers
        setAutoSaveStatus('unsaved')
      } finally {
        isSavingRef.current = false
      }
    }, 4000)

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [content, query, brief, metrics, currentUser, currentDocId])

  // Research trigger with SSE streaming from Python FastAPI backend
  const handleNewResearch = () => {
    if (!query.trim() || isResearching || isGenerating) return

    setIsResearching(true)
    setResearchProgress({ percent: 10, message: 'Initiating SERP intelligence search...' })

    const cleanup = researchApi.streamResearch(
      query,
      (ev: ResearchStreamEvent) => {
        setResearchProgress({ percent: ev.percent, message: ev.message })
      },
      (newBrief: ProjectBrief) => {
        setBrief(newBrief)
        setIsResearching(false)
        setResearchProgress(null)
      },
      () => {
        // Fallback to client-side preset/heuristic generator if backend SSE offline
        const fallbackBrief = generateBriefForQuery(query)
        setBrief(fallbackBrief)
        setIsResearching(false)
        setResearchProgress(null)
      }
    )

    return cleanup
  }

  // Document management actions
  const handleSaveCurrentDraft = async () => {
    if (!currentUser) {
      setAuthModalOpen(true)
      return
    }

    const titleMatch = content.match(/^#\s+(.+)$/m)
    const docTitle = titleMatch ? titleMatch[1] : `${query} Draft`

    if (currentDocId) {
      const updated = await documentsApi.update(currentDocId, {
        title: docTitle,
        query,
        content,
        brief: brief as unknown as Record<string, unknown>,
        seoScore: metrics.seo,
        geoScore: metrics.geo,
        aioScore: metrics.aio,
        wordCount: metrics.wordCount,
      })
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    } else {
      const created = await documentsApi.create({
        title: docTitle,
        query,
        content,
        brief: brief as unknown as Record<string, unknown>,
        seoScore: metrics.seo,
        geoScore: metrics.geo,
        aioScore: metrics.aio,
        wordCount: metrics.wordCount,
      })
      setCurrentDocId(created.id)
      setDocuments((prev) => [created, ...prev])
    }
  }

  const handleOpenDocument = (doc: UserDocument) => {
    setCurrentDocId(doc.id)
    setQuery(doc.query)
    setContent(doc.content)
    if (doc.brief) {
      setBrief(doc.brief as unknown as ProjectBrief)
    } else {
      setBrief(generateBriefForQuery(doc.query))
    }
  }

  const handleNewBlankDocument = () => {
    setCurrentDocId(null)
    const baseName = currentWorkspace?.name || 'Content Architecture'
    const docQuery = `${baseName} Overview`
    setQuery(docQuery)
    setContent(`# ${docQuery}\n\nStart writing your GEO-optimized article...`)
    setBrief(generateBriefForQuery(docQuery))
  }

  const handleDeleteDocument = async (id: string) => {
    await documentsApi.delete(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    if (currentDocId === id) {
      setCurrentDocId(null)
    }
  }

  const handleLogout = () => {
    authApi.logout()
    setCurrentUser(null)
    setDocuments([])
    setWorkspaces([])
    setCurrentWorkspace(null)
    setCurrentDocId(null)
    setContent('')
    setCurrentView('landing')
  }

  const handleOnboardingComplete = async (data: {
    fullName: string
    role: string
    domain: string
    workspaceName: string
    initialTopic: string
    auditResult?: DomainAuditResult
  }) => {
    localStorage.setItem('v_platform_onboarded', 'true')
    setOnboardingModalOpen(false)

    let activeUser = currentUser
    if (!activeUser) {
      setAuthModalOpen(true)
      return
    } else {
      try {
        const updated = await profileApi.update({
          fullName: data.fullName,
          role: data.role,
        })
        activeUser = { ...activeUser, profile: updated }
        setCurrentUser(activeUser)
      } catch {
        // tolerate offline
      }
    }

    // Persist and activate the workspace built around the domain
    try {
      const existingWs = workspaces.find((w) => w.domain.toLowerCase() === data.domain.toLowerCase())
      let targetWs: Workspace
      if (existingWs) {
        targetWs = await workspacesApi.update(existingWs.id, {
          name: data.workspaceName,
          overallScore: data.auditResult?.overallScore,
          seoScore: data.auditResult?.seoScore,
          geoScore: data.auditResult?.geoScore,
          aioScore: data.auditResult?.aioScore,
          howToFix: data.auditResult?.howToFix,
          competitors: data.auditResult?.competitors,
        })
      } else {
        targetWs = await workspacesApi.create({
          domain: data.domain,
          name: data.workspaceName,
          overallScore: data.auditResult?.overallScore,
          seoScore: data.auditResult?.seoScore,
          geoScore: data.auditResult?.geoScore,
          aioScore: data.auditResult?.aioScore,
          howToFix: data.auditResult?.howToFix,
          competitors: data.auditResult?.competitors,
        })
      }
      setCurrentWorkspace(targetWs)
      workspacesApi.setActiveWorkspaceId(targetWs.id)
      setWorkspaces((prev) => [targetWs, ...prev.filter((w) => w.id !== targetWs.id && w.domain.toLowerCase() !== targetWs.domain.toLowerCase())])
    } catch {
      // offline handled
    }

    const topic = data.initialTopic.trim() || `${data.workspaceName} Overview & Benchmarks`
    setQuery(topic)
    const newBrief = generateBriefForQuery(topic)
    setBrief(newBrief)

    const starterContent = `# ${topic}\n\nOptimized for ${data.workspaceName} (${data.domain}). Tailored for Generative Engine Optimization (GEO), AI Overviews (AIO), and modern Search discovery.\n\n## Core Principles\n\n- Precise definitions and authoritative benchmarks\n- Comparative tabular analysis\n- Structured heading hierarchy\n`
    setContent(starterContent)

    try {
      // If user already has an initial welcome document from signup, update it instead of duplicating
      const existingDoc = documents.length > 0 ? documents[0] : null
      if (existingDoc && (existingDoc.query === 'Generative Engine Optimization (GEO)' || existingDoc.id === currentDocId)) {
        const updated = await documentsApi.update(existingDoc.id, {
          title: topic,
          query: topic,
          content: starterContent,
          brief: newBrief as unknown as Record<string, unknown>,
          seoScore: data.auditResult?.seoScore || 75,
          geoScore: data.auditResult?.geoScore || 82,
          aioScore: data.auditResult?.aioScore || 80,
          wordCount: 45,
        })
        setCurrentDocId(updated.id)
        setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      } else {
        const created = await documentsApi.create({
          title: topic,
          query: topic,
          content: starterContent,
          brief: newBrief as unknown as Record<string, unknown>,
          seoScore: data.auditResult?.seoScore || 75,
          geoScore: data.auditResult?.geoScore || 82,
          aioScore: data.auditResult?.aioScore || 80,
          wordCount: 45,
        })
        setCurrentDocId(created.id)
        setDocuments((prev) => [created, ...prev.filter((d) => d.id !== created.id)])
      }
    } catch {
      // offline handled
    }
  }

  // Workspace management handlers
  const handleSelectWorkspace = (ws: Workspace) => {
    setCurrentWorkspace(ws)
    workspacesApi.setActiveWorkspaceId(ws.id)

    // Adapt workspace topic focus if user switches active website workspace
    const primaryFix = ws.howToFix?.[0]
    const topic = primaryFix?.title || `${ws.name} Architecture & Core Principles`
    setQuery(topic)
    const newBrief = generateBriefForQuery(topic)
    setBrief(newBrief)
  }

  const handleDeleteWorkspace = async (id: string) => {
    await workspacesApi.delete(id)
    const remaining = workspaces.filter((w) => w.id !== id)
    setWorkspaces(remaining)
    if (currentWorkspace?.id === id && remaining.length > 0) {
      handleSelectWorkspace(remaining[0])
    }
  }

  const handleRefreshWebsiteAudit = async (domain: string, name: string) => {
    setIsAuditRefreshing(true)
    try {
      const computed = await workspacesApi.compute(domain, name)
      if (currentWorkspace) {
        const updated = await workspacesApi.update(currentWorkspace.id, {
          overallScore: computed.overallScore,
          seoScore: computed.seoScore,
          geoScore: computed.geoScore,
          aioScore: computed.aioScore,
          howToFix: computed.howToFix,
          competitors: computed.competitors,
        })
        setCurrentWorkspace(updated)
        setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
      }
    } catch {
      const fallback = computeDomainAudit(domain, name)
      if (currentWorkspace) {
        const updated = await workspacesApi.update(currentWorkspace.id, {
          overallScore: fallback.overallScore,
          seoScore: fallback.seoScore,
          geoScore: fallback.geoScore,
          aioScore: fallback.aioScore,
          howToFix: fallback.howToFix,
          competitors: fallback.competitors,
        })
        setCurrentWorkspace(updated)
        setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
      }
    } finally {
      setIsAuditRefreshing(false)
    }
  }

  const handleInjectAuditSnippet = (snippet: string) => {
    setContent((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed}\n\n${snippet}\n\n` : `${snippet}\n\n`
    })
    setWebsiteAuditModalOpen(false)
  }


  // Insert heading from outline (avoids leading newlines on empty canvas)
  const handleInsertHeading = (heading: string, level: 'h2' | 'h3') => {
    const prefix = level === 'h2' ? '## ' : '### '
    setContent((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed}\n\n${prefix}${heading}\n\n` : `${prefix}${heading}\n\n`
    })
  }

  // Insert full outline (all H2/H3 headers at once, clean whitespace)
  const handleInsertFullOutline = () => {
    const outlineMarkdown = (brief.outline || [])
      .map((item) => `${item.level === 'h2' ? '## ' : '### '}${item.title}`)
      .join('\n\n')
    setContent((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed}\n\n${outlineMarkdown}\n\n` : `${outlineMarkdown}\n\n`
    })
  }

  // Generate section with local Ollama
  const handleGenerateSection = async (item: OutlineItem) => {
    if (isGenerating) return
    setIsGenerating(true)
    setGeneratingSectionId(item.id)
    try {
      const draft = await ollama.generateSectionDraft(item.title, brief.query, item.keyTopics)
      setContent((prev) => {
        const trimmed = prev.trim()
        return trimmed ? `${trimmed}\n\n${draft}\n\n` : `${draft}\n\n`
      })
    } catch {
      // Fallback
    } finally {
      setIsGenerating(false)
      setGeneratingSectionId(null)
    }
  }

  // Finish full draft following plan with local Ollama
  const handleFinishDraft = async () => {
    if (isGenerating || isResearching) return
    setIsGenerating(true)
    let accumulated = ''
    try {
      const topicTerms = brief.topics.map((t) => t.term)
      const questionTexts = brief.questions.map((q) => q.question)

      const finished = await ollama.finishDraft(
        brief.query,
        brief.outline,
        topicTerms,
        questionTexts,
        content,
        (token) => {
          accumulated += token
          setContent(accumulated)
        }
      )
      if (finished) {
        setContent(finished)
      }
    } catch {
      // Fallback
    } finally {
      setIsGenerating(false)
    }
  }

  // Insert topic from matrix without corrupting preceding headings/blank lines
  const handleInsertTopic = (term: string) => {
    setContent((prev) => {
      if (!prev || !prev.trim()) return `${term} `
      if (prev.endsWith('\n\n')) return `${prev}${term} `
      if (prev.endsWith('\n')) return `${prev}\n${term} `
      if (prev.endsWith(' ')) return `${prev}${term} `
      return `${prev} ${term} `
    })
  }

  // Draft paragraph for a specific topic with Ollama
  const handleDraftTopicParagraph = async (term: string) => {
    if (isGenerating) return
    setIsGenerating(true)
    setGeneratingTopicTerm(term)
    try {
      const paragraph = await ollama.draftParagraphForTopic(term, brief.query)
      setContent((prev) => {
        const trimmed = prev.trim()
        return trimmed ? `${trimmed}\n\n${paragraph}\n\n` : `${paragraph}\n\n`
      })
    } catch {
      // Fallback
    } finally {
      setIsGenerating(false)
      setGeneratingTopicTerm(null)
    }
  }

  // View competitor usage: track term and switch to compare tab
  const handleViewCompetitorUsage = (term: string) => {
    setFocusedCompareTerm(term)
    setActiveTab('compare')
    setRightOpen(true)
  }

  // Insert question as heading
  const handleInsertQuestion = (q: string) => {
    setContent((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed}\n\n## ${q}\n\n` : `## ${q}\n\n`
    })
  }

  // Generate GEO answer with Ollama
  const handleGenerateAnswer = async (q: QuestionItem) => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const answer = await ollama.generateGeoAnswer(q.question, brief.query)
      setContent((prev) => {
        const trimmed = prev.trim()
        return trimmed ? `${trimmed}\n\n## ${q.question}\n\n${answer}\n\n` : `## ${q.question}\n\n${answer}\n\n`
      })
    } catch {
      // Fallback
    } finally {
      setIsGenerating(false)
    }
  }

  // Apply boosted text from modal
  const handleApplyBoost = (newContent: string) => {
    setContent(newContent)
  }

  // Export handlers with support for boosted content download
  const handleCopyMarkdown = useCallback(
    (textToCopy?: string) => {
      navigator.clipboard.writeText(textToCopy ?? content)
    },
    [content]
  )

  const handleExport = useCallback(
    (format: 'markdown' | 'text' | 'html', contentToExport?: string) => {
      const targetContent = contentToExport ?? content
      const suffix = contentToExport ? '-boosted' : ''

      let fileContent = targetContent
      let mimeType = 'text/plain'
      let extension = 'txt'

      if (format === 'markdown') {
        fileContent = targetContent
        mimeType = 'text/markdown'
        extension = 'md'
      } else if (format === 'html') {
        fileContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${brief.query}</title></head><body><pre>${targetContent}</pre></body></html>`
        mimeType = 'text/html'
        extension = 'html'
      }

      const blob = new Blob([fileContent], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${brief.query.toLowerCase().replace(/\s+/g, '-')}${suffix}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [content, brief.query]
  )

  const isAnyModalOpen =
    authModalOpen ||
    profileModalOpen ||
    documentsModalOpen ||
    boostModalOpen ||
    onboardingModalOpen ||
    websiteAuditModalOpen

  // Global hotkeys (Cmd+Enter or Ctrl+Enter for /boost, suppressed if modal open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen || !isUserAuthenticated || currentView === 'landing') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        setBoostModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAnyModalOpen, isUserAuthenticated, currentView])

  const effectiveAutoSaveStatus = currentUser && currentUser.profile?.preferences?.autoSave !== false ? autoSaveStatus : 'offline'

  return (
    <>
      {currentView === 'landing' || !isUserAuthenticated ? (
        <LandingPage
          onLaunchWorkspace={handleLaunchWorkspace}
          onLaunchWithDomain={handleLaunchWithDomain}
          user={currentUser}
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          documents={documents}
          onOpenDocument={handleOpenDocumentFromLanding}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onLogout={handleLogout}
        />
      ) : (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#08080a] text-neutral-100 font-sans">
          {/* Cupertino Platform Header with Neon User Profile & Glass Workspace Capsule Integration */}
          <Header
            query={query}
            onQueryChange={setQuery}
            onNewResearch={handleNewResearch}
            onFinishDraft={handleFinishDraft}
            scoreMetrics={metrics}
            targetScore={brief.targetScore}
            models={models}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            onTriggerBoost={() => setBoostModalOpen(true)}
            onExport={handleExport}
            isGenerating={isGenerating}
            isResearching={isResearching}
            researchProgress={researchProgress}
            user={currentUser}
            documentsCount={documents.length}
            currentWorkspace={currentWorkspace}
            workspaces={workspaces}
            onSelectWorkspace={handleSelectWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onOpenWebsiteAudit={() => setWebsiteAuditModalOpen(true)}
            onOpenCreateWorkspace={handleOpenOnboarding}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenProfile={() => setProfileModalOpen(true)}
            onOpenDocuments={() => setDocumentsModalOpen(true)}
            onOpenOnboarding={handleOpenOnboarding}
            onNewBlankDocument={handleNewBlankDocument}
            autoSaveStatus={effectiveAutoSaveStatus}
            onLogout={handleLogout}
            onCopyMarkdown={() => handleCopyMarkdown()}
            onNavigateLanding={() => setCurrentView('landing')}
            isModalOpen={isAnyModalOpen}
          />

      {/* Stage 2: Non-blocking Apple Glass Pill HUD beneath Header */}
      <ResearchProgressHud
        isResearching={isResearching}
        progress={researchProgress}
        competitorsCount={brief.competitors?.length || 20}
        onDismiss={() => setResearchProgress(null)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Outline & SERP Research */}
        {leftOpen && (
          <aside className="w-80 lg:w-88 border-r border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl flex flex-col flex-shrink-0">
            <div className="h-14 border-b border-white/[0.08] px-4 flex items-center justify-between text-sm text-neutral-300 font-medium">
              <span className="tracking-tight text-white font-semibold text-base">Outline & SERP</span>
              <button
                onClick={() => setLeftOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <BriefPanel
                outline={brief.outline}
                competitors={brief.competitors}
                onInsertHeading={handleInsertHeading}
                onGenerateSection={handleGenerateSection}
                onInsertFullOutline={handleInsertFullOutline}
                onFinishDraft={handleFinishDraft}
                isGenerating={isGenerating}
                generatingSectionId={generatingSectionId}
              />
            </div>
          </aside>
        )}

        {/* Collapsed Left Sidebar Toggle */}
        {!leftOpen && (
          <div className="border-r border-white/[0.08] bg-neutral-950 p-2 flex flex-col items-center">
            <button
              onClick={() => setLeftOpen(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Expand research panel"
            >
              <PanelLeftOpen className="w-4.5 h-4.5" />
            </button>
          </div>
        )}

        {/* Center: Apple Distraction-Free Editor */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <Editor
            content={content}
            onChange={handleContentChange}
            scoreMetrics={metrics}
            targetWordCount={brief.targetWordCount}
            onTriggerBoost={() => setBoostModalOpen(true)}
            isGenerating={isGenerating}
          />
        </main>

        {/* Right Sidebar: Topics / Compare / Questions / Audit */}
        {rightOpen && (
          <aside
            className={`border-l border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl flex flex-col flex-shrink-0 transition-all duration-200 ${
              activeTab === 'compare' ? 'w-[540px] lg:w-[580px]' : 'w-96 lg:w-[400px]'
            }`}
          >
            {/* Sidebar Header with Apple Segmented Control */}
            <div className="h-14 border-b border-white/[0.08] flex items-center justify-between px-3.5 bg-neutral-950/70">
              <SegmentedControl<TabType>
                items={[
                  { id: 'topics', label: 'Topics', icon: <Hash className="w-4 h-4" /> },
                  { id: 'compare', label: 'Compare', icon: <Scale className="w-4 h-4" /> },
                  { id: 'questions', label: 'Questions', icon: <HelpCircle className="w-4 h-4" /> },
                  { id: 'audit', label: 'Audit', icon: <Activity className="w-4 h-4" /> },
                ]}
                activeId={activeTab}
                onChange={setActiveTab}
                size="sm"
              />

              <button
                onClick={() => setRightOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
                title="Collapse sidebar"
              >
                <PanelRightClose className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'topics' && (
                <TopicsPanel
                  topics={updatedBrief.topics}
                  onInsertTopic={handleInsertTopic}
                  onDraftTopicParagraph={handleDraftTopicParagraph}
                  onViewCompetitorUsage={handleViewCompetitorUsage}
                  isGenerating={isGenerating}
                  generatingTopicTerm={generatingTopicTerm}
                />
              )}
              {activeTab === 'compare' && (
                <ComparePanel
                  content={content}
                  brief={updatedBrief}
                  scoreMetrics={metrics}
                  onInsertTopic={handleInsertTopic}
                  onInsertHeading={handleInsertHeading}
                  onGenerateSection={handleGenerateSection}
                  onDraftTopicParagraph={handleDraftTopicParagraph}
                  isGenerating={isGenerating}
                  generatingTopicTerm={generatingTopicTerm}
                  focusedTerm={focusedCompareTerm}
                  onClearFocusedTerm={() => setFocusedCompareTerm(null)}
                />
              )}
              {activeTab === 'questions' && (
                <QuestionsPanel
                  questions={updatedBrief.questions}
                  onInsertQuestion={handleInsertQuestion}
                  onGenerateAnswer={handleGenerateAnswer}
                  isGenerating={isGenerating}
                />
              )}
              {activeTab === 'audit' && (
                <ScoreWidget
                  metrics={metrics}
                  targetScore={brief.targetScore}
                  issues={issues}
                  onTriggerBoost={() => setBoostModalOpen(true)}
                  isGenerating={isGenerating}
                />
              )}
            </div>
          </aside>
        )}

        {/* Collapsed Right Sidebar Toggle */}
        {!rightOpen && (
          <div className="border-l border-white/[0.08] bg-neutral-950 p-2 flex flex-col items-center">
            <button
              onClick={() => setRightOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Expand optimization panel"
            >
              <PanelRightOpen className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )}

      {/* Signature /boost Audit & Optimizer Modal */}
      <AuditBoostModal
        isOpen={boostModalOpen}
        onClose={() => setBoostModalOpen(false)}
        currentContent={content}
        brief={updatedBrief}
        metrics={metrics}
        issues={issues}
        selectedModel={selectedModel}
        onApplyBoost={handleApplyBoost}
        onExport={handleExport}
      />

      {/* Apple-style Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false)
          setPendingLaunchDomain(null)
        }}
        onSuccess={(user, isNewUser) => {
          if (currentUser?.id !== user.id) {
            setCurrentDocId(null)
          }
          setCurrentUser(user)
          documentsApi
            .list()
            .then((docs) => {
              setDocuments(docs)
              if (docs.length > 0 && !isNewUser) {
                handleOpenDocument(docs[0])
              }
            })
            .catch(() => {})

          const domainToLaunch = pendingLaunchDomain
          setPendingLaunchDomain(null)

          if (domainToLaunch) {
            setCurrentView('workspace')
            handleOpenOnboarding(domainToLaunch, 2)
          } else if (isNewUser) {
            setCurrentView('workspace')
            handleOpenOnboarding()
          } else {
            setCurrentView('workspace')
          }
        }}
      />

      {/* Interactive Apple-Style Workspace Onboarding Tour */}
      <OnboardingModal
        key={onboardingKey}
        isOpen={onboardingModalOpen}
        initialDomain={onboardingInitialDomain}
        initialStep={onboardingInitialStep}
        onClose={() => {
          localStorage.setItem('v_platform_onboarded', 'true')
          setOnboardingModalOpen(false)
        }}
        user={currentUser}
        onComplete={handleOnboardingComplete}
      />

      {/* Apple-style Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={currentUser}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />

      {/* Apple-style Documents Persistence Modal */}
      <DocumentsModal
        isOpen={documentsModalOpen}
        onClose={() => setDocumentsModalOpen(false)}
        documents={documents}
        loading={docsLoading}
        currentDocId={currentDocId}
        onOpenDocument={handleOpenDocument}
        onSaveCurrentDraft={handleSaveCurrentDraft}
        onNewBlankDocument={handleNewBlankDocument}
        onDeleteDocument={handleDeleteDocument}
      />

      {/* Apple-style Website Audit & Competitor Benchmark Modal */}
      <WebsiteAuditModal
        isOpen={websiteAuditModalOpen}
        onClose={() => setWebsiteAuditModalOpen(false)}
        workspace={currentWorkspace}
        onRefreshAudit={handleRefreshWebsiteAudit}
        onInjectSnippet={handleInjectAuditSnippet}
        onBenchmarkQuery={(topic) => {
          setQuery(topic)
          setWebsiteAuditModalOpen(false)
          handleNewResearch()
        }}
        isRefreshing={isAuditRefreshing}
      />
    </>
  )
}

