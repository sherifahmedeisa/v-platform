import React, { useState } from 'react'
import {
  X,
  RefreshCw,
  Sparkles,
  Flame,
  Award,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import type { Workspace } from '../types'

interface WebsiteAuditModalProps {
  isOpen: boolean
  onClose: () => void
  workspace: Workspace | null
  onRefreshAudit: (domain: string, name: string) => Promise<void>
  onInjectSnippet?: (snippet: string) => void
  onBenchmarkQuery?: (query: string) => void
  isRefreshing?: boolean
}

export const WebsiteAuditModal: React.FC<WebsiteAuditModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onRefreshAudit,
  onInjectSnippet,
  onBenchmarkQuery,
  isRefreshing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'fixes' | 'competitors'>('overview')
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [filterImpact, setFilterImpact] = useState<'all' | 'high' | 'medium'>('all')

  if (!isOpen || !workspace) return null

  const handleCopySnippet = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet)
    setCopiedSnippetId(id)
    setTimeout(() => setCopiedSnippetId(null), 1800)
  }

  const filteredFixes = (workspace.howToFix || []).filter((fix) => {
    if (filterImpact === 'all') return true
    return fix.impact === filterImpact
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-neutral-900/85 border border-white/[0.12] shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col text-neutral-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        {/* Subtle Apple Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-neutral-950/40">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner border border-white/15">
              🌐
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {workspace.name}
                </h2>
                <a
                  href={`https://${workspace.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
                >
                  <span>{workspace.domain}</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </a>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  Score {workspace.overallScore}/100
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Domain Content Intelligence & Algorithmic Competitor Match Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onRefreshAudit(workspace.domain, workspace.name)}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
              title="Re-compute domain audit and competitor match"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Computing...' : 'Re-calculate'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close audit view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Apple Segmented Tab Navigation */}
        <div className="px-6 pt-3 pb-2 border-b border-white/[0.06] flex items-center justify-between bg-neutral-950/20 flex-shrink-0">
          <div className="inline-flex p-1 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white text-black shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Triple-Score Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('fixes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'fixes'
                  ? 'bg-white text-black shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Actionable Fixes</span>
              <span className="text-[10px] font-mono text-neutral-400 ml-1">
                {workspace.howToFix?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('competitors')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'competitors'
                  ? 'bg-white text-black shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Content Competitors</span>
              <span className="text-[10px] font-mono text-neutral-400 ml-1">
                {workspace.competitors?.length || 0}
              </span>
            </button>
          </div>

          {activeTab === 'fixes' && (
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-neutral-400 text-[11px]">Impact:</span>
              {(['all', 'high', 'medium'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterImpact(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer capitalize ${
                    filterImpact === lvl
                      ? 'bg-white/20 text-white font-semibold border border-white/20'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW & TRIPLE SCORE */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Hero Glass Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Overall Score Master Gauge */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.12] flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-neutral-400">Overall Website Index</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-4xl font-extrabold font-mono text-white tracking-tight">
                        {workspace.overallScore}
                      </span>
                      <span className="text-xs font-mono text-neutral-400">/{workspace.targetScore} target</span>
                    </div>
                  </div>

                  <div className="pt-3">
                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 rounded-full"
                        style={{ width: `${Math.min(100, (workspace.overallScore / workspace.targetScore) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-1.5 flex justify-between">
                      <span>Status</span>
                      <span className="text-emerald-400 font-semibold">Generative Ready</span>
                    </div>
                  </div>
                </div>

                {/* GEO Score */}
                <div className="p-5 rounded-3xl bg-neutral-950/60 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between shadow-inner">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-sky-400">GEO Score</span>
                      <span className="text-[10px] font-mono text-sky-400 font-medium">
                        40% Weight
                      </span>
                    </div>
                    <div className="text-3xl font-bold font-mono text-white">
                      {workspace.geoScore}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                      Generative Engine Optimization: direct answer clarity, entity linkages & Perplexity/ChatGPT citation rate.
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-neutral-400">
                    High LLM retrieval fidelity
                  </div>
                </div>

                {/* AIO Score */}
                <div className="p-5 rounded-3xl bg-neutral-950/60 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between shadow-inner">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-purple-400">AIO Score</span>
                      <span className="text-[10px] font-mono text-purple-400 font-medium">
                        35% Weight
                      </span>
                    </div>
                    <div className="text-3xl font-bold font-mono text-white">
                      {workspace.aioScore}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                      AI Overviews Capture: 40-word definitional lead blocks, schema Q&A, and conversational synthesis.
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-neutral-400">
                    Strong overview synthesis
                  </div>
                </div>

                {/* SEO Score */}
                <div className="p-5 rounded-3xl bg-neutral-950/60 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between shadow-inner">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-emerald-400">SEO Score</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-medium">
                        25% Weight
                      </span>
                    </div>
                    <div className="text-3xl font-bold font-mono text-white">
                      {workspace.seoScore}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                      Search On-Page Core: H1-H3 semantic hierarchy, crawl indexability, and long-tail target keywords.
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-neutral-400">
                    Robust organic search base
                  </div>
                </div>
              </div>

              {/* Competitor Benchmark Snapshot */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Top Content Competitors Snapshot
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('competitors')}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View all {workspace.competitors?.length || 0} competitors</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(workspace.competitors || []).slice(0, 3).map((comp) => (
                    <div
                      key={comp.domain}
                      className="p-3.5 rounded-2xl bg-neutral-950/70 border border-white/[0.08] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{comp.name}</span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {comp.matchPercentage}% match
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono truncate">
                        {comp.domain}
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                          style={{ width: `${comp.matchPercentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-1">
                        <span>Keyword Overlap: <strong className="text-neutral-200">{comp.keywordOverlap}%</strong></span>
                        <span>Entities: <strong className="text-neutral-200">{comp.semanticEntityScore}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable How-To-Fix Snapshot */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Priority "How to Fix" Action Items
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('fixes')}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Inspect all fixes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(workspace.howToFix || []).slice(0, 2).map((fix) => (
                    <div
                      key={fix.id}
                      className="p-3.5 rounded-2xl bg-neutral-950/70 border border-white/[0.08] flex items-start justify-between space-x-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono uppercase font-semibold ${
                            fix.impact === 'high'
                              ? 'text-rose-400'
                              : 'text-sky-400'
                          }`}>
                            {fix.impact} Impact
                          </span>
                          <span className="text-[10px] font-mono uppercase text-neutral-400 font-medium">
                            {fix.category}
                          </span>
                          <span className="text-xs font-semibold text-white">{fix.title}</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          {fix.detail}
                        </p>
                      </div>

                      {fix.snippet && onInjectSnippet && (
                        <button
                          onClick={() => onInjectSnippet(fix.snippet!)}
                          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white text-neutral-200 hover:text-black text-xs font-medium transition-all cursor-pointer"
                        >
                          Inject Fix
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIONABLE DEFICIT FIXES */}
          {activeTab === 'fixes' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Actionable Deficit Fixes & Optimization Proposals
                </h3>
                <p className="text-xs text-neutral-400">
                  Concrete algorithmic improvements to boost {workspace.domain}'s score across LLMs and search engines.
                </p>
              </div>

              <div className="space-y-3.5">
                {filteredFixes.map((fix) => (
                  <div
                    key={fix.id}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono uppercase font-semibold ${
                            fix.impact === 'high'
                              ? 'text-rose-400'
                              : 'text-sky-400'
                          }`}>
                            {fix.impact} Impact
                          </span>
                          <span className="text-[10px] font-mono uppercase text-neutral-400 font-medium">
                            {fix.category}
                          </span>
                          <span className="text-sm font-semibold text-white">{fix.title}</span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                          {fix.detail}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {fix.snippet && (
                          <button
                            onClick={() => handleCopySnippet(fix.snippet!, fix.id)}
                            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                            title="Copy snippet"
                          >
                            {copiedSnippetId === fix.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {fix.snippet && onInjectSnippet && (
                          <button
                            onClick={() => onInjectSnippet(fix.snippet!)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-all cursor-pointer"
                          >
                            Inject into Draft
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-950/80 border border-white/[0.06] text-xs">
                      <div className="text-[11px] font-semibold text-neutral-300 mb-1 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Recommended Implementation:</span>
                      </div>
                      <p className="text-neutral-400 leading-relaxed">
                        {fix.fixProposal}
                      </p>
                      {fix.snippet && (
                        <pre className="mt-2 p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-neutral-200 overflow-x-auto whitespace-pre-wrap">
                          {fix.snippet}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT COMPETITORS */}
          {activeTab === 'competitors' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Content Competitors & Similarity Match Matrix
                </h3>
                <p className="text-xs text-neutral-400">
                  Algorithmic benchmark calculating content similarity, keyword overlap, semantic entities, and search intent for {workspace.domain}.
                </p>
              </div>

              <div className="space-y-3.5">
                {(workspace.competitors || []).map((comp) => (
                  <div
                    key={comp.domain}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm text-white">
                          {comp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white flex items-center space-x-2">
                            <span>{comp.name}</span>
                            <span className="text-xs font-mono text-neutral-400">({comp.domain})</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-neutral-400 mt-0.5">
                            <span>Keyword Overlap: <strong className="text-neutral-200">{comp.keywordOverlap}%</strong></span>
                            <span>·</span>
                            <span>Entity Similarity: <strong className="text-neutral-200">{comp.semanticEntityScore}%</strong></span>
                            <span>·</span>
                            <span>Intent Alignment: <strong className="text-neutral-200">{comp.searchIntentScore}%</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-base font-extrabold font-mono text-amber-300">
                            {comp.matchPercentage}%
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">Content Match</div>
                        </div>
                        {onBenchmarkQuery && (
                          <button
                            onClick={() => onBenchmarkQuery(comp.topKeywords[0] || comp.name)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white text-neutral-200 hover:text-black text-xs font-medium transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>SERP Audit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-full"
                        style={{ width: `${comp.matchPercentage}%` }}
                      />
                    </div>

                    {/* Overlapping Entities */}
                    {comp.topKeywords?.length > 0 && (
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1 pt-1 text-[11px] font-mono">
                        <span className="text-neutral-400 mr-1">Overlapping Entities:</span>
                        <span className="text-neutral-300">
                          {comp.topKeywords.join(' · ')}
                        </span>
                      </div>
                    )}

                    {/* Strengths & Gaps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                      {comp.strengths?.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-white/[0.06] space-y-0.5">
                          <span className="text-emerald-400 font-semibold block">Competitor Advantage:</span>
                          <span className="text-neutral-400 leading-relaxed">{comp.strengths.join(' ')}</span>
                        </div>
                      )}
                      {comp.gaps?.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-white/[0.06] space-y-0.5">
                          <span className="text-amber-400 font-semibold block">Your Content Opportunity:</span>
                          <span className="text-neutral-400 leading-relaxed">{comp.gaps.join(' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between bg-neutral-950/60 flex-shrink-0">
          <div className="text-xs text-neutral-400 flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Synced across Neon PostgreSQL & Local Workspace Engine</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
