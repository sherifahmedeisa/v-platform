import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Globe,
  ArrowRight,
  Sparkles,
  Cpu,
  Activity,
  CheckCircle2,
  Layers,
  ChevronRight,
  Clock,
} from 'lucide-react'
import type { Workspace, DomainAuditResult } from '../types'
import type { UserAccount, UserDocument } from '../services/api'
import { computeDomainAudit, cleanDomain, deriveWorkspaceName } from '../services/domain'
import { UserProfileMenu } from './UserProfileMenu'

interface LandingPageProps {
  onLaunchWorkspace: () => void
  onLaunchWithDomain: (domain: string) => void
  user: UserAccount | null
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  documents: UserDocument[]
  onOpenDocument: (doc: UserDocument) => void
  onOpenAuth: () => void
  onOpenProfile: () => void
  onLogout: () => void
}



const DEMO_PROMPTS = [
  {
    id: 'lead',
    label: 'Definitional Lead',
    output:
      'Generative Engine Optimization (GEO) is the systematic engineering of digital content to maximize citations and authoritative inclusion within Large Language Model search outputs and conversational answer engines.',
  },
  {
    id: 'table',
    label: 'Comparison Table',
    output:
      '| Architecture | Latency (TTFB) | Cold Start | LLM Discovery |\n|---|---|---|---|\n| Edge Isolates | <35ms | 0ms | Instant Citations |\n| Origin Containers | 320ms | 1.8s | Batch Indexed |',
  },
  {
    id: 'gaps',
    label: 'Competitor Gaps',
    output:
      'Synthesized 3 high-impact content gaps against top competitors: missing quantitative benchmark tables, absent JSON-LD schema definitions, and under-represented entity relationships.',
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchWorkspace,
  onLaunchWithDomain,
  user,
  currentWorkspace,
  workspaces,
  documents,
  onOpenDocument,
  onOpenAuth,
  onOpenProfile,
  onLogout,
}) => {
  const [domainInput, setDomainInput] = useState('')
  const [activeCompetitorIdx, setActiveCompetitorIdx] = useState(0)

  // Pillar 2 (Ollama) Interactive State
  const [selectedModel, setSelectedModel] = useState<'gemma4:12b' | 'qwen3.6:latest' | 'gemma4:26b'>('gemma4:12b')
  const [activePromptId, setActivePromptId] = useState<'lead' | 'table' | 'gaps'>('lead')
  const [isStreamingDemo, setIsStreamingDemo] = useState(false)
  const [demoText, setDemoText] = useState(DEMO_PROMPTS[0].output)
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup stream interval on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current)
      }
    }
  }, [])

  // Pillar 3 (Audit/Boost) Interactive State
  const [boostMode, setBoostMode] = useState<'before' | 'after'>('after')

  // Real-time dynamic domain audit computation
  const audit: DomainAuditResult = useMemo(() => {
    const target = domainInput.trim() || currentWorkspace?.domain || 'example.com'
    return computeDomainAudit(target)
  }, [domainInput, currentWorkspace?.domain])

  // Dynamic scores for Pillar 3 derived from the entered domain's audit
  const dynamicScores = useMemo(() => {
    const rawOverall = Math.max(52, audit.overallScore - 18)
    const rawGeo = Math.max(48, audit.geoScore - 22)
    const rawAio = Math.max(50, audit.aioScore - 17)

    const boostedOverall = Math.min(99, audit.overallScore + 6)
    const boostedGeo = Math.min(99, audit.geoScore + 7)
    const boostedAio = Math.min(99, audit.aioScore + 8)

    return {
      before: { overall: rawOverall, geo: rawGeo, aio: rawAio },
      after: { overall: boostedOverall, geo: boostedGeo, aio: boostedAio },
    }
  }, [audit])

  const safeCompIdx = activeCompetitorIdx < audit.competitors.length ? activeCompetitorIdx : 0
  const activeComp = audit.competitors[safeCompIdx] || audit.competitors[0]

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = domainInput.trim()
    if (!trimmed) {
      onLaunchWorkspace()
      return
    }
    const cleaned = cleanDomain(trimmed)
    onLaunchWithDomain(cleaned)
  }

  const handleTriggerDemoStream = (
    promptId: 'lead' | 'table' | 'gaps',
    modelOverride?: 'gemma4:12b' | 'qwen3.6:latest' | 'gemma4:26b'
  ) => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current)
      streamTimerRef.current = null
    }

    setActivePromptId(promptId)
    const activeModel = modelOverride || selectedModel
    const target = DEMO_PROMPTS.find((p) => p.id === promptId)?.output || ''
    setIsStreamingDemo(true)
    setDemoText('')

    const stepSize = activeModel === 'qwen3.6:latest' ? 5 : activeModel === 'gemma4:26b' ? 2 : 4
    const intervalMs = activeModel === 'gemma4:26b' ? 32 : 22

    let currIdx = 0
    streamTimerRef.current = setInterval(() => {
      currIdx += stepSize
      if (currIdx >= target.length) {
        setDemoText(target)
        setIsStreamingDemo(false)
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current)
          streamTimerRef.current = null
        }
      } else {
        setDemoText(target.slice(0, currIdx))
      }
    }, intervalMs)
  }

  const handleSelectModel = (m: 'gemma4:12b' | 'qwen3.6:latest' | 'gemma4:26b') => {
    setSelectedModel(m)
    handleTriggerDemoStream(activePromptId, m)
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-neutral-200 font-sans selection:bg-white/20 selection:text-white flex flex-col relative overflow-x-hidden">
      {/* Ambient Apple Specular Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-b from-sky-500/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-3xl pointer-events-none -z-10" />

      {/* Top Glass Navigation */}
      <header className="sticky top-0 z-40 h-16 border-b border-white/[0.08] bg-neutral-950/75 backdrop-blur-2xl px-6 flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-base tracking-tight border border-white/15 shadow-inner font-mono">
            V
          </div>
          <span className="font-semibold text-base tracking-tight text-white">V Platform</span>
        </div>

        {/* Right CTA */}
        <div className="flex items-center space-x-3">
          <UserProfileMenu
            user={user}
            documentsCount={documents.length}
            onOpenAuth={onOpenAuth}
            onOpenProfile={onOpenProfile}
            onOpenDocuments={onLaunchWorkspace}
            onLogout={onLogout}
          />

          <button
            onClick={onLaunchWorkspace}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm active:scale-98"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 max-w-6xl mx-auto w-full pt-14 pb-20 space-y-16">
        {/* Minimal Hero Section */}
        <section className="flex flex-col items-center text-center space-y-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            Search is now generative.
            <br />
            <span className="bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-500 bg-clip-text text-transparent">
              Engineered for AI discovery.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 max-w-xl font-normal leading-relaxed">
            Real-time competitor benchmarking, local LLM drafting, and algorithmic SEO/GEO scoring.
          </p>

          {/* Interactive Hero Domain Bar */}
          <form
            onSubmit={handleDomainSubmit}
            className="w-full max-w-xl mt-4 relative group"
          >
            <div className="relative flex items-center rounded-2xl bg-neutral-900/80 border border-white/[0.12] focus-within:border-white/30 shadow-2xl backdrop-blur-2xl transition-all p-1.5">
              <div className="pl-3.5 pr-2 text-neutral-400 flex items-center">
                <Globe className="w-5 h-5 text-neutral-400 group-focus-within:text-white transition-colors" />
              </div>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="Enter domain to benchmark (e.g. yourbrand.io, acme.com)"
                className="flex-1 bg-transparent border-none text-white text-sm sm:text-base px-2 py-2.5 focus:outline-none placeholder:text-neutral-500 font-mono tracking-tight"
                spellCheck={false}
              />
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 font-semibold text-xs sm:text-sm tracking-tight transition-all cursor-pointer shadow-md flex-shrink-0 active:scale-98"
              >
                <span>Analyze & Launch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Direct Launch CTA & Shortcut */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onLaunchWorkspace}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs sm:text-sm tracking-tight transition-all cursor-pointer shadow-inner active:scale-98"
            >
              <span>{user && currentWorkspace && currentWorkspace.domain !== 'example.com' ? 'Open Active Workspace' : 'Launch Workspace'}</span>
              {user && currentWorkspace && currentWorkspace.domain !== 'example.com' && (
                <span className="text-[11px] font-mono text-neutral-400">
                  {currentWorkspace.name}
                </span>
              )}
            </button>

            {user && workspaces && workspaces.length > 1 && (
              <div className="hidden sm:flex items-center space-x-1.5 pl-1">
                <span className="text-[11px] font-mono text-neutral-500">Other:</span>
                {workspaces
                  .filter((w) => w.id !== currentWorkspace?.id)
                  .slice(0, 3)
                  .map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => onLaunchWithDomain(ws.domain)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 text-xs font-mono transition-colors cursor-pointer"
                      title={`Open ${ws.name} (${ws.domain})`}
                    >
                      {ws.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Drafts Shortcut (If user has saved drafts) */}
        {user && documents.length > 0 && (
          <section className="w-full max-w-4xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Recent Drafts</span>
              </span>
              <button
                onClick={onLaunchWorkspace}
                className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>View all in Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {documents.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument(doc)}
                  className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group shadow-sm backdrop-blur-xl flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white truncate group-hover:text-sky-300 transition-colors">
                        {doc.title || doc.query}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        GEO {doc.geoScore}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate font-mono">
                      {doc.query}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-1 border-t border-white/[0.04]">
                    <span>{doc.wordCount} words</span>
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3 Dynamic Pillars Section */}
        <section className="w-full space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Three Pillars of Generative Optimization
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              Interactive preview driven dynamically by real models and algorithmic benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pillar 1: Domain Intelligence & Competitor Content Match */}
            <div className="rounded-3xl bg-neutral-900/60 border border-white/[0.08] p-5 backdrop-blur-2xl flex flex-col justify-between space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-neutral-500 uppercase tracking-wider">
                    Pillar 1
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Domain Intelligence & Competitor Match
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Live benchmark scores for <span className="font-mono text-white">{audit.domain}</span>
                  </p>
                </div>

                {/* Live Scores Gauge */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-neutral-950/70 border border-white/[0.06] font-mono">
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-neutral-500">SEO</div>
                    <div className="text-base font-bold text-white">{audit.seoScore}</div>
                  </div>
                  <div className="text-center border-x border-white/[0.06]">
                    <div className="text-[10px] uppercase text-emerald-400 font-semibold">GEO</div>
                    <div className="text-base font-bold text-emerald-400">{audit.geoScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-sky-400 font-semibold">AIO</div>
                    <div className="text-base font-bold text-sky-400">{audit.aioScore}</div>
                  </div>
                </div>

                {/* Competitors Overlap Selector */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-neutral-500 font-semibold">
                    Competitor Cohort Matches:
                  </div>
                  <div className="space-y-1">
                    {audit.competitors.slice(0, 3).map((comp, idx) => (
                      <button
                        key={comp.domain}
                        onClick={() => setActiveCompetitorIdx(idx)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          activeCompetitorIdx === idx
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-white/[0.02] border-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className="font-medium truncate">{comp.name}</span>
                        <div className="flex items-center space-x-2 font-mono text-[10px]">
                          <span className="text-neutral-500">{comp.keywordOverlap}% kw</span>
                          <span className="font-bold text-emerald-400">{comp.matchPercentage}% match</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Competitor Detail */}
                {activeComp && (
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-neutral-400 space-y-1">
                    <div className="font-semibold text-neutral-300 flex items-center justify-between">
                      <span>{activeComp.name} Semantic Gap</span>
                      <span className="text-[10px] font-mono text-neutral-500">Deficit</span>
                    </div>
                    <p className="line-clamp-2 leading-relaxed text-neutral-400">
                      {activeComp.gaps[0] || 'Lacks structured comparative tables and local AI citation depth.'}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => onLaunchWithDomain(audit.domain)}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white font-medium text-xs tracking-tight transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Audit {deriveWorkspaceName(audit.domain)} in Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pillar 2: Plan & Finish Draft with local Ollama */}
            <div className="rounded-3xl bg-neutral-900/60 border border-white/[0.08] p-5 backdrop-blur-2xl flex flex-col justify-between space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-neutral-500 uppercase tracking-wider">
                    Pillar 2
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Plan & Finish Draft with Local Ollama
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Zero latency, private local inference on your GPU.
                  </p>
                </div>

                {/* Model Selector Pills */}
                <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-neutral-950/70 border border-white/[0.06] text-xs font-mono">
                  {(['gemma4:12b', 'qwen3.6:latest', 'gemma4:26b'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSelectModel(m)}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] transition-all cursor-pointer truncate ${
                        selectedModel === m
                          ? 'bg-white/15 text-white font-bold shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {m.split(':')[0]}
                    </button>
                  ))}
                </div>

                {/* Interactive Prompt Tabs */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-500">Inference Demo:</span>
                  <div className="flex items-center space-x-1">
                    {DEMO_PROMPTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleTriggerDemoStream(p.id as 'lead' | 'table' | 'gaps')}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                          activePromptId === p.id
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Stream Terminal Box */}
                <div className="p-3 rounded-2xl bg-neutral-950/90 border border-white/[0.06] font-mono text-xs min-h-[110px] flex flex-col justify-between relative shadow-inner">
                  <div className="text-neutral-300 leading-relaxed text-[11px] whitespace-pre-wrap">
                    {demoText}
                    {isStreamingDemo && (
                      <span className="inline-block w-1.5 h-3.5 bg-violet-400 ml-1 animate-pulse align-middle" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-neutral-500 pt-2 border-t border-white/[0.04]">
                    <span>
                      {selectedModel === 'qwen3.6:latest' ? '~102 tok/s' : selectedModel === 'gemma4:26b' ? '~46 tok/s' : '~84 tok/s'} · {selectedModel}
                    </span>
                    <button
                      onClick={() => handleTriggerDemoStream(activePromptId)}
                      className="text-violet-400 hover:text-violet-300 transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Re-stream</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={onLaunchWorkspace}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white font-medium text-xs tracking-tight transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Draft with Ollama in Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pillar 3: Audit & /boost Real-time Scoring */}
            <div className="rounded-3xl bg-neutral-900/60 border border-white/[0.08] p-5 backdrop-blur-2xl flex flex-col justify-between space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-neutral-500 uppercase tracking-wider">
                    Pillar 3
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Audit & /boost Engine
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Live content audit and 1-click citation boost.
                  </p>
                </div>

                {/* Before vs After Boost Switch */}
                <div className="flex items-center space-x-1 p-1 rounded-xl bg-neutral-950/70 border border-white/[0.06] text-xs font-mono">
                  <button
                    onClick={() => setBoostMode('before')}
                    className={`flex-1 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                      boostMode === 'before'
                        ? 'bg-white/15 text-white font-bold'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    Raw Draft
                  </button>
                  <button
                    onClick={() => setBoostMode('after')}
                    className={`flex-1 py-1 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                      boostMode === 'after'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Boosted (/boost)</span>
                  </button>
                </div>

                {/* Score Comparison Display */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-neutral-950/70 border border-white/[0.06] font-mono">
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-neutral-500">Overall</div>
                    <div
                      className={`text-base font-bold transition-colors ${
                        boostMode === 'after' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {boostMode === 'after' ? dynamicScores.after.overall : dynamicScores.before.overall}
                    </div>
                  </div>
                  <div className="text-center border-x border-white/[0.06]">
                    <div className="text-[10px] uppercase text-neutral-500">GEO</div>
                    <div
                      className={`text-base font-bold transition-colors ${
                        boostMode === 'after' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {boostMode === 'after' ? dynamicScores.after.geo : dynamicScores.before.geo}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-neutral-500">AIO</div>
                    <div
                      className={`text-base font-bold transition-colors ${
                        boostMode === 'after' ? 'text-sky-400' : 'text-neutral-300'
                      }`}
                    >
                      {boostMode === 'after' ? dynamicScores.after.aio : dynamicScores.before.aio}
                    </div>
                  </div>
                </div>

                {/* Boost Effect Description */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] space-y-1">
                  <div className="font-semibold text-neutral-300 flex items-center space-x-1.5">
                    {boostMode === 'after' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">
                          Boost Applied: {audit.howToFix.length || 3} Deficits Resolved
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-300">
                        {audit.howToFix.length || 3} Content Gaps Detected
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-400 text-[10px] leading-relaxed">
                    {boostMode === 'after'
                      ? `Injected high-density comparison tables, bold definitional leads, and schema citation anchors tailored for ${audit.name}.`
                      : `Missing quantitative benchmark tables, absent JSON-LD schema, and weak definitional capture for ${audit.domain}.`}
                  </p>
                </div>
              </div>

              <button
                onClick={onLaunchWorkspace}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white font-medium text-xs tracking-tight transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Run /boost in Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Minimalist Feature Pillars Strip */}
        <section className="w-full py-8 border-y border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-neutral-400">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold text-white">Private & Local</div>
              <div className="text-[11px] text-neutral-500">Zero telemetry, local Ollama execution</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white flex-shrink-0">
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="font-semibold text-white">PostgreSQL Persistence</div>
              <div className="text-[11px] text-neutral-500">Auto-saves to Neon cloud with local fallback</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white flex-shrink-0">
              <Activity className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="font-semibold text-white">Real-Time Scoring</div>
              <div className="text-[11px] text-neutral-500">Live SEO, GEO & AIO citation analysis</div>
            </div>
          </div>
        </section>

        {/* Bottom Minimal Launch Bar */}
        <section className="flex flex-col sm:flex-row items-center justify-between w-full p-6 rounded-3xl bg-neutral-900/60 border border-white/[0.08] backdrop-blur-2xl shadow-xl gap-4">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="font-bold text-white text-base tracking-tight">Ready to optimize your content?</div>
            <div className="text-xs text-neutral-400">Jump directly into the distraction-free markdown editor.</div>
          </div>
          <button
            onClick={onLaunchWorkspace}
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-white text-neutral-950 hover:bg-neutral-200 font-semibold text-sm tracking-tight transition-all cursor-pointer shadow-lg active:scale-98 flex-shrink-0"
          >
            <span>Open Editor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-white/[0.06] py-6 px-6 text-center text-xs text-neutral-500 font-mono">
        <span>V Platform · Generative Search Intelligence</span>
      </footer>
    </div>
  )
}
