import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  ExternalLink,
  Plus,
  Edit3,
  Check,
  AlertCircle,
  BarChart2,
  ListTree,
  Grid3X3,
  Search,
  Copy,
  ArrowUpDown,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
  MoreHorizontal,
  X,
} from 'lucide-react'
import type {
  ProjectBrief,
  ScoreMetrics,
  OutlineItem,
  CompareSubTab,
  TopicComparisonRow,
} from '../types'
import { computeCompareAnalysis, isHeadingCovered } from '../services/compare'
import { SegmentedControl } from './SegmentedControl'

interface ComparePanelProps {
  content: string
  brief: ProjectBrief
  scoreMetrics: ScoreMetrics
  onInsertTopic: (term: string) => void
  onInsertHeading: (heading: string, level: 'h2' | 'h3') => void
  onGenerateSection?: (item: OutlineItem) => void
  onDraftTopicParagraph?: (term: string) => void
  isGenerating: boolean
  generatingTopicTerm?: string | null
  focusedTerm?: string | null
  onClearFocusedTerm?: () => void
}

type TopicSortOption = 'importance' | 'frequency' | 'gaps' | 'user' | 'alpha'

export const ComparePanel: React.FC<ComparePanelProps> = ({
  content,
  brief,
  scoreMetrics,
  onInsertTopic,
  onInsertHeading,
  onGenerateSection,
  onDraftTopicParagraph,
  isGenerating,
  generatingTopicTerm,
  focusedTerm,
  onClearFocusedTerm,
}) => {
  const [subTab, setSubTab] = useState<CompareSubTab>('heatmap')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'seo' | 'geo' | 'aio' | 'gaps' | 'over'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<TopicSortOption>('importance')
  const [selectedCompetitorRank, setSelectedCompetitorRank] = useState<number | 'all'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeMenuTerm, setActiveMenuTerm] = useState<string | null>(null)
  const [inspectingTopic, setInspectingTopic] = useState<TopicComparisonRow | null>(null)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  const competitors = brief.competitors || []

  // Track active competitors cohort for benchmark calculations (Frase feature)
  const [activeCompetitorRanks, setActiveCompetitorRanks] = useState<number[]>(() =>
    competitors.map((c) => c.rank)
  )

  const toggleCompetitorInclusion = (rank: number) => {
    setActiveCompetitorRanks((prev) => {
      if (prev.includes(rank)) {
        // Keep at least one competitor active
        if (prev.length <= 1) return prev
        return prev.filter((r) => r !== rank)
      }
      return [...prev, rank].sort((a, b) => a - b)
    })
  }

  const selectAllCompetitors = () => {
    setActiveCompetitorRanks(competitors.map((c) => c.rank))
  }

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Run the Frase compare engine with the active competitor cohort
  const compareData = useMemo(() => {
    return computeCompareAnalysis(content, brief, scoreMetrics, activeCompetitorRanks)
  }, [content, brief, scoreMetrics, activeCompetitorRanks])

  // Synchronize focusedTerm from TopicsPanel
  const [prevFocusedTerm, setPrevFocusedTerm] = useState<string | null | undefined>(focusedTerm)
  if (focusedTerm && focusedTerm !== prevFocusedTerm) {
    setPrevFocusedTerm(focusedTerm)
    setSearchTerm(focusedTerm)
    setSubTab('heatmap')
    const targetRow = compareData.topicRows.find(
      (r) => r.term.toLowerCase() === focusedTerm.toLowerCase()
    )
    if (targetRow) {
      setInspectingTopic(targetRow)
    }
  }

  // Dismiss menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenuTerm(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter and sort topics for heatmap
  const filteredTopics = useMemo(() => {
    const list = compareData.topicRows.filter((row) => {
      if (categoryFilter === 'gaps' && !row.isGap) return false
      if (categoryFilter === 'over' && row.status !== 'over') return false
      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'gaps' &&
        categoryFilter !== 'over' &&
        row.category !== categoryFilter
      ) {
        return false
      }
      if (searchTerm.trim()) {
        return row.term.toLowerCase().includes(searchTerm.toLowerCase().trim())
      }
      return true
    })

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'importance':
          return b.importance - a.importance || b.serpAvgCount - a.serpAvgCount
        case 'frequency':
          return b.serpAvgCount - a.serpAvgCount
        case 'gaps':
          if (a.isGap !== b.isGap) return a.isGap ? -1 : 1
          return b.competitorInclusionRate - a.competitorInclusionRate
        case 'user':
          return b.userCount - a.userCount
        case 'alpha':
          return a.term.localeCompare(b.term)
        default:
          return 0
      }
    })
  }, [compareData.topicRows, categoryFilter, searchTerm, sortBy])

  return (
    <div className="h-full flex flex-col bg-neutral-950 text-neutral-100 select-none overflow-hidden font-sans">
      {/* Cupertino Top Bar */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-neutral-900/50 backdrop-blur-md flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">SERP Compare</h2>
              <span className="text-xs sm:text-sm font-mono text-neutral-400 font-medium">
                {activeCompetitorRanks.length}/{competitors.length} active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Frase benchmark against top search leaders
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-mono text-neutral-400">
              Avg Score:{' '}
              <span className="text-white font-bold text-sm sm:text-base">{compareData.overview.avgCompetitorScore}</span>
            </span>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <SegmentedControl<CompareSubTab>
          items={[
            { id: 'heatmap', label: 'Heatmap', icon: <Grid3X3 className="w-4 h-4" /> },
            {
              id: 'gaps',
              label: 'Gaps',
              icon: <AlertCircle className="w-4 h-4" />,
              count: compareData.gaps.length,
            },
            { id: 'outlines', label: 'Headings', icon: <ListTree className="w-4 h-4" /> },
            { id: 'benchmarks', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
          ]}
          activeId={subTab}
          onChange={setSubTab}
          size="sm"
          fullWidth
        />
      </div>

      {/* Main SubTab Content Area */}
      <div className="flex-1 overflow-y-auto" ref={menuContainerRef}>
        {/* Competitor Usage Inspection Card (Stage 4) */}
        {inspectingTopic && (
          <div className="m-3.5 p-4 rounded-2xl bg-neutral-900/95 border border-white/20 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white text-base tracking-tight">{inspectingTopic.term}</span>
                    <span className="text-[10px] uppercase font-mono text-neutral-400 font-semibold">
                      {inspectingTopic.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">Competitor SERP Usage Breakdown</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => onInsertTopic(inspectingTopic.term)}
                  className="px-2.5 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert</span>
                </button>
                {onDraftTopicParagraph && (
                  <button
                    onClick={() => onDraftTopicParagraph(inspectingTopic.term)}
                    disabled={isGenerating}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1 border border-white/10 disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Draft</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setInspectingTopic(null)
                    onClearFocusedTerm?.()
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close competitor usage view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metric Overview */}
            <div className="grid grid-cols-4 gap-2 my-3 text-center text-xs font-mono">
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-neutral-500 text-[10px] uppercase font-sans">Inclusion</div>
                <div className="text-white font-bold text-sm mt-0.5">{Math.round(inspectingTopic.competitorInclusionRate * 100)}%</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-neutral-500 text-[10px] uppercase font-sans">SERP Avg</div>
                <div className="text-neutral-200 font-bold text-sm mt-0.5">{inspectingTopic.serpAvgCount}x</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-neutral-500 text-[10px] uppercase font-sans">SERP Max</div>
                <div className="text-neutral-200 font-bold text-sm mt-0.5">{inspectingTopic.serpMaxCount}x</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-neutral-500 text-[10px] uppercase font-sans">In Draft</div>
                <div className="text-white font-bold text-sm mt-0.5">{inspectingTopic.userCount}/{inspectingTopic.targetMin}</div>
              </div>
            </div>

            {/* Competitor-by-competitor usage list */}
            <div className="mt-2 text-xs">
              <div className="text-neutral-400 font-mono text-[11px] mb-1.5">Mentions across competitors:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                {competitors.map((comp) => {
                  const count = inspectingTopic.competitorCounts[comp.rank] || 0
                  return (
                    <div
                      key={comp.rank}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                        count > 0
                          ? 'bg-white/[0.06] border-white/15 text-white font-medium'
                          : 'bg-white/[0.01] border-white/[0.04] text-neutral-500'
                      }`}
                    >
                      <span className="truncate pr-1">#{comp.rank} {comp.domain?.split('.')[0] || `Comp ${comp.rank}`}</span>
                      <span className="font-mono font-bold">{count}x</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 1: HEATMAP MATRIX */}
        {subTab === 'heatmap' && (
          <div className="flex flex-col h-full">
            {/* Filter, Search, and Sort Bar */}
            <div className="p-3.5 border-b border-white/[0.06] bg-neutral-950/70 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search topics..."
                    className="w-full bg-neutral-900/90 border border-white/[0.08] text-sm text-neutral-100 pl-9 pr-3 py-2 rounded-xl placeholder-neutral-500 focus:outline-none focus:border-white/30 font-sans"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        onClearFocusedTerm?.()
                      }}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-white text-sm cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs sm:text-sm">
                  <ArrowUpDown className="w-4 h-4 text-neutral-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as TopicSortOption)}
                    className="bg-transparent text-neutral-200 focus:outline-none cursor-pointer font-sans"
                  >
                    <option value="importance" className="bg-neutral-900 text-neutral-200">
                      Importance
                    </option>
                    <option value="frequency" className="bg-neutral-900 text-neutral-200">
                      SERP Frequency
                    </option>
                    <option value="gaps" className="bg-neutral-900 text-neutral-200">
                      Gaps First
                    </option>
                    <option value="user" className="bg-neutral-900 text-neutral-200">
                      Your Count
                    </option>
                    <option value="alpha" className="bg-neutral-900 text-neutral-200">
                      A-Z
                    </option>
                  </select>
                </div>
              </div>

              {/* Segmented Category Filter */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <SegmentedControl<'all' | 'seo' | 'geo' | 'aio' | 'gaps' | 'over'>
                  items={[
                    { id: 'all', label: 'All' },
                    { id: 'seo', label: 'SEO' },
                    { id: 'geo', label: 'GEO' },
                    { id: 'aio', label: 'AIO' },
                    { id: 'gaps', label: 'Gaps' },
                    { id: 'over', label: 'Over' },
                  ]}
                  activeId={categoryFilter}
                  onChange={setCategoryFilter}
                  size="xs"
                />

                <span className="text-neutral-400 font-mono text-xs sm:text-sm">
                  {filteredTopics.length} topics
                </span>
              </div>

              {/* Competitor Cohort Filter Toggles (Frase Competitor Selector) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 pt-0.5 text-xs sm:text-sm no-scrollbar">
                <span className="text-neutral-400 font-mono text-xs uppercase mr-0.5 font-semibold">Cohort:</span>
                <button
                  onClick={selectAllCompetitors}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs sm:text-sm font-medium"
                  title="Include all competitors"
                >
                  All
                </button>
                {competitors.map((c) => {
                  const isActive = activeCompetitorRanks.includes(c.rank)
                  return (
                    <button
                      key={c.rank}
                      onClick={() => toggleCompetitorInclusion(c.rank)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs sm:text-sm transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-neutral-800 text-white border border-white/10 shadow-xs'
                          : 'bg-neutral-900/40 text-neutral-600 line-through'
                      }`}
                      title={`${c.domain || c.title} (Click to toggle)`}
                    >
                      <span>C{c.rank}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Matrix Table with Sticky Left Topic Column */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-20 border-b border-white/[0.08] text-neutral-300 font-mono text-xs sm:text-sm">
                  <tr>
                    {/* Pinned Topic Header */}
                    <th className="sticky left-0 bg-neutral-900/95 backdrop-blur-md z-30 py-3 px-3.5 font-semibold min-w-[160px] border-r border-white/[0.06]">
                      Topic
                    </th>
                    <th className="py-3 px-2 text-center font-semibold w-20">You</th>
                    <th className="py-3 px-2 text-center font-semibold w-16 text-neutral-400">Avg</th>
                    {competitors.map((c) => {
                      const isActive = activeCompetitorRanks.includes(c.rank)
                      return (
                        <th
                          key={c.rank}
                          className={`py-3 px-1 text-center font-semibold w-11 ${
                            isActive ? 'text-neutral-200' : 'text-neutral-600 opacity-40'
                          }`}
                          title={`Rank #${c.rank}: ${c.domain || c.title}${
                            isActive ? '' : ' (Excluded from benchmark)'
                          }`}
                        >
                          C{c.rank}
                        </th>
                      )
                    })}
                    <th className="py-3 px-2 text-center font-medium w-16"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTopics.map((row) => {
                    return (
                      <tr
                        key={row.term}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        {/* Pinned Topic Term Column with Apple Quick Actions Popover */}
                        <td className="sticky left-0 bg-neutral-950/95 group-hover:bg-neutral-900/95 backdrop-blur-md z-10 py-3 px-3.5 border-r border-white/[0.06]">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                              onClick={() => setActiveMenuTerm(activeMenuTerm === row.term ? null : row.term)}
                            >
                              <span className="font-semibold text-neutral-100 group-hover:text-white transition-colors truncate max-w-[140px] text-sm sm:text-base">
                                {row.term}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuTerm(activeMenuTerm === row.term ? null : row.term)
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ml-1 ${
                                activeMenuTerm === row.term
                                  ? 'bg-white text-black'
                                  : 'text-neutral-500 hover:text-white hover:bg-white/10'
                              }`}
                              title="Quick actions menu"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs uppercase font-mono text-neutral-400">
                              {row.category}
                            </span>
                            {row.isGap && (
                              <span className="text-xs font-mono text-amber-400 font-medium">
                                Gap
                              </span>
                            )}
                            {row.status === 'over' && (
                              <span className="text-xs font-mono text-rose-400 font-medium">
                                Over
                              </span>
                            )}
                          </div>

                          {/* Apple Quick Action Popover */}
                          {activeMenuTerm === row.term && (
                            <div className="mt-2.5 p-2 rounded-xl bg-neutral-900 border border-white/15 shadow-2xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 text-xs z-30">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onInsertTopic(row.term)
                                  setActiveMenuTerm(null)
                                }}
                                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left font-sans"
                              >
                                <Plus className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Insert into draft</span>
                              </button>
                              {onDraftTopicParagraph && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDraftTopicParagraph(row.term)
                                    setActiveMenuTerm(null)
                                  }}
                                  disabled={isGenerating}
                                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left disabled:opacity-40 font-sans"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Draft with Ollama</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setInspectingTopic(row)
                                  setActiveMenuTerm(null)
                                }}
                                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer text-left font-sans"
                              >
                                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                                <span>View competitor usage</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* User Count with Target Range */}
                        <td className="py-3 px-1 text-center font-mono text-xs sm:text-sm">
                          <span
                            className={
                              row.status === 'optimal'
                                ? 'text-white font-bold'
                                : row.status === 'missing'
                                ? 'text-neutral-500 font-medium'
                                : row.status === 'over'
                                ? 'text-amber-400 font-bold'
                                : 'text-neutral-200'
                            }
                          >
                            {row.userCount}
                            <span className="text-neutral-500 text-xs">
                              /{row.targetMin}-{row.targetMax}
                            </span>
                          </span>
                        </td>

                        {/* SERP Average */}
                        <td className="py-3 px-1 text-center font-mono text-neutral-300 text-xs sm:text-sm">
                          {row.serpAvgCount}
                        </td>

                        {/* Individual Competitor Cells (Heatmap Shading) */}
                        {competitors.map((c) => {
                          const isActive = activeCompetitorRanks.includes(c.rank)
                          const count = row.competitorCounts[c.rank] || 0
                          let cellStyle = 'text-neutral-600'
                          if (!isActive) {
                            cellStyle = 'text-neutral-700 opacity-40'
                          } else if (count >= 5) {
                            cellStyle = 'bg-white/25 text-white font-bold rounded'
                          } else if (count >= 3) {
                            cellStyle = 'bg-white/15 text-white font-semibold rounded'
                          } else if (count >= 1) {
                            cellStyle = 'bg-white/[0.08] text-neutral-200 rounded'
                          }

                          return (
                            <td key={c.rank} className="py-3 px-0.5 text-center font-mono text-xs sm:text-sm">
                              <span className={`inline-block w-8 py-0.5 ${cellStyle}`}>
                                {count > 0 ? count : '·'}
                              </span>
                            </td>
                          )
                        })}

                        {/* Micro Actions: Draft, Copy & Insert */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onDraftTopicParagraph && (
                              <button
                                onClick={() => onDraftTopicParagraph(row.term)}
                                disabled={isGenerating}
                                title={`Draft paragraph for "${row.term}" with Ollama`}
                                className="p-1.5 rounded-lg text-amber-300/80 hover:text-amber-300 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                {isGenerating && generatingTopicTerm === row.term ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                  <Sparkles className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => setInspectingTopic(row)}
                              title={`View competitor usage for "${row.term}"`}
                              className="p-1.5 rounded-lg text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors cursor-pointer"
                            >
                              <BarChart2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCopyText(row.term, `heat-${row.term}`)}
                              title={`Copy "${row.term}"`}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              {copiedId === `heat-${row.term}` ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => onInsertTopic(row.term)}
                              title={`Insert "${row.term}" into draft`}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredTopics.length === 0 && (
                    <tr>
                      <td
                        colSpan={5 + competitors.length}
                        className="py-12 text-center text-neutral-500 text-sm sm:text-base font-sans"
                      >
                        No topics match the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: CONTENT GAPS */}
        {subTab === 'gaps' && (
          <div className="p-4 space-y-3.5">
            <div className="bg-neutral-900/60 border border-white/[0.08] p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-white">Content Gaps Identified</span>
                <span className="text-xs sm:text-sm font-mono text-amber-400 font-bold">
                  {compareData.gaps.length} opportunities
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed">
                High-impact semantic entities heavily covered by SERP competitors ({`>50%`} inclusion) that are completely absent from your draft.
              </p>
            </div>

            <div className="space-y-2.5">
              {compareData.gaps.map((gap: TopicComparisonRow) => (
                <div
                  key={gap.term}
                  className="bg-neutral-900/50 hover:bg-neutral-900/80 border border-white/[0.08] p-3.5 rounded-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-semibold text-white">{gap.term}</span>
                        <span className="text-xs uppercase font-mono text-neutral-400 font-semibold">
                          {gap.category}
                        </span>
                        <span className="text-xs font-mono text-amber-400 font-medium">
                          Priority {gap.importance}/5
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5">
                        Covered by {Math.round(gap.competitorInclusionRate * 100)}% of SERP · Competitor avg: {gap.serpAvgCount}x (max {gap.serpMaxCount}x)
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {onDraftTopicParagraph && (
                        <button
                          onClick={() => onDraftTopicParagraph(gap.term)}
                          disabled={isGenerating}
                          title={`Draft paragraph for "${gap.term}" with Ollama`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 border border-white/10"
                        >
                          {isGenerating && generatingTopicTerm === gap.term ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Draft</span>
                        </button>
                      )}

                      <button
                        onClick={() => setInspectingTopic(gap)}
                        title={`View competitor usage for "${gap.term}"`}
                        className="p-1.5 rounded-lg text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors cursor-pointer"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleCopyText(gap.term, `gap-${gap.term}`)}
                        title="Copy term"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {copiedId === `gap-${gap.term}` ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => onInsertTopic(gap.term)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Insert</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {compareData.gaps.length === 0 && (
                <div className="p-10 text-center text-neutral-500 text-sm sm:text-base">
                  Outstanding! No critical content gaps detected against SERP leaders.
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: OUTLINES & HEADINGS COMPARISON */}
        {subTab === 'outlines' && (
          <div className="p-4 space-y-4">
            {/* Competitor Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs sm:text-sm no-scrollbar">
              <button
                onClick={() => setSelectedCompetitorRank('all')}
                className={`px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCompetitorRank === 'all'
                    ? 'bg-neutral-800 text-white border border-white/10 shadow-xs'
                    : 'text-neutral-400 hover:text-white bg-neutral-900/50'
                }`}
              >
                All Combined ({compareData.headingGaps.length})
              </button>

              {competitors.map((c) => (
                <button
                  key={c.rank}
                  onClick={() => setSelectedCompetitorRank(c.rank)}
                  className={`px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCompetitorRank === c.rank
                      ? 'bg-neutral-800 text-white border border-white/10 shadow-xs'
                      : 'text-neutral-400 hover:text-white bg-neutral-900/50'
                  }`}
                >
                  #{c.rank} {c.domain ? c.domain.split('.')[0] : `Comp ${c.rank}`}
                </button>
              ))}
            </div>

            {/* Filtered Headings Display */}
            <div className="space-y-3">
              {selectedCompetitorRank === 'all' ? (
                // Combined heading gaps across competitors
                compareData.headingGaps.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      item.inDraft
                        ? 'bg-neutral-900/20 border-white/[0.04] text-neutral-400'
                        : 'bg-neutral-900/60 border-white/[0.08] text-neutral-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono uppercase text-neutral-400 font-semibold">
                            {item.level}
                          </span>
                          <span className="text-xs sm:text-sm font-mono text-neutral-400">
                            in {item.frequency} competitor{item.frequency > 1 ? 's' : ''} (C{item.competitorRanks.join(', C')})
                          </span>
                        </div>
                        <div
                          className={`text-base md:text-lg font-semibold leading-snug ${
                            item.inDraft ? 'text-neutral-400' : 'text-neutral-100'
                          }`}
                        >
                          {item.text}
                        </div>
                        {item.inDraft && item.similarityMatch && (
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 mt-2 font-mono">
                            <Check className="w-4 h-4" />
                            <span>Covered in your draft</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleCopyText(item.text, `heading-${idx}`)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Copy heading"
                        >
                          {copiedId === `heading-${idx}` ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => onInsertHeading(item.text, item.level)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Insert heading into draft"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {onGenerateSection && !item.inDraft && (
                          <button
                            onClick={() =>
                              onGenerateSection({
                                id: `gap-${idx}`,
                                level: item.level,
                                title: item.text,
                                keyTopics: [],
                              })
                            }
                            disabled={isGenerating}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                            title="Write section with Ollama"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Specific competitor headings with full coverage detection
                (() => {
                  const comp = competitors.find((c) => c.rank === selectedCompetitorRank)
                  const headingsList = comp?.headingsList || []
                  const userHeadings = compareData.headingGaps.map((h) => ({ text: h.text }))

                  return (
                    <div className="space-y-3">
                      <div className="bg-neutral-900/50 p-4 rounded-xl border border-white/[0.08] text-xs sm:text-sm text-neutral-400">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-white text-base">#{comp?.rank} {comp?.title}</span>
                          <span className="font-mono text-xs sm:text-sm text-neutral-400">{headingsList.length} headings</span>
                        </div>
                        <a
                          href={comp?.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-400 hover:text-white flex items-center gap-1.5 font-mono text-xs sm:text-sm"
                        >
                          <span>{comp?.domain || comp?.url}</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {headingsList.map((h, i) => {
                        const coverage = isHeadingCovered(h.text, userHeadings, content)

                        return (
                          <div
                            key={i}
                            className={`p-4 rounded-xl border transition-all ${
                              coverage.isCovered
                                ? 'bg-neutral-900/20 border-white/[0.04] text-neutral-400'
                                : 'bg-neutral-900/60 border-white/[0.08] text-neutral-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs uppercase font-mono text-neutral-400 font-semibold">
                                    {h.level}
                                  </span>
                                </div>
                                <div
                                  className={`text-base md:text-lg font-semibold leading-snug ${
                                    coverage.isCovered ? 'text-neutral-400' : 'text-neutral-100'
                                  }`}
                                >
                                  {h.text}
                                </div>
                                {coverage.isCovered && (
                                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 mt-2 font-mono">
                                    <Check className="w-4 h-4" />
                                    <span>Covered in your draft</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleCopyText(h.text, `comp-h-${i}`)}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Copy heading"
                                >
                                  {copiedId === `comp-h-${i}` ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => onInsertHeading(h.text, h.level)}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Insert heading"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                {onGenerateSection && !coverage.isCovered && (
                                  <button
                                    onClick={() =>
                                      onGenerateSection({
                                        id: `comp-${comp?.rank}-${i}`,
                                        level: h.level,
                                        title: h.text,
                                        keyTopics: [],
                                      })
                                    }
                                    disabled={isGenerating}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                                    title="Write section with Ollama"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {headingsList.length === 0 && (
                        <div className="p-10 text-center text-neutral-500 text-sm sm:text-base">
                          No headings extracted for this competitor.
                        </div>
                      )}
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: BENCHMARK OVERVIEW */}
        {subTab === 'benchmarks' && (
          <div className="p-4 space-y-4 font-sans">
            {/* High-level Apple Grid Comparison */}
            <div className="grid grid-cols-2 gap-3">
              {/* Score Benchmark */}
              <div className="bg-neutral-900/60 border border-white/[0.08] p-4 rounded-xl">
                <span className="text-xs sm:text-sm uppercase font-mono text-neutral-400 font-semibold">Content Score</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl md:text-3xl font-extrabold text-white font-mono">{compareData.overview.userScore}</span>
                  <span className="text-xs sm:text-sm text-neutral-400 font-mono">/ Avg {compareData.overview.avgCompetitorScore}</span>
                </div>
                <div className="mt-3 w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (compareData.overview.userScore / (compareData.overview.topCompetitorScore || 100)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs sm:text-sm text-neutral-400 font-mono mt-2 block">
                  Top SERP: {compareData.overview.topCompetitorScore}
                </span>
              </div>

              {/* Word Count Benchmark */}
              <div className="bg-neutral-900/60 border border-white/[0.08] p-4 rounded-xl">
                <span className="text-xs sm:text-sm uppercase font-mono text-neutral-400 font-semibold">Word Count</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl md:text-3xl font-extrabold text-white font-mono">{compareData.overview.userWords}</span>
                  <span className="text-xs sm:text-sm text-neutral-400 font-mono">/ Avg {compareData.overview.avgCompetitorWords}</span>
                </div>
                <div className="mt-3 w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-300 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (compareData.overview.userWords / (compareData.overview.targetWords || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs sm:text-sm text-neutral-400 font-mono mt-2 block">
                  Target: {compareData.overview.targetWords}
                </span>
              </div>

              {/* Headings Benchmark */}
              <div className="bg-neutral-900/60 border border-white/[0.08] p-4 rounded-xl">
                <span className="text-xs sm:text-sm uppercase font-mono text-neutral-400 font-semibold">Headings (H2/H3)</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl md:text-3xl font-extrabold text-white font-mono">{compareData.overview.userHeadings}</span>
                  <span className="text-xs sm:text-sm text-neutral-400 font-mono">/ Avg {compareData.overview.avgCompetitorHeadings}</span>
                </div>
                <div className="mt-3 w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-300 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (compareData.overview.userHeadings /
                          Math.max(1, compareData.overview.avgCompetitorHeadings)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* GEO Citation Score */}
              <div className="bg-neutral-900/60 border border-white/[0.08] p-4 rounded-xl">
                <span className="text-xs sm:text-sm uppercase font-mono text-neutral-400 font-semibold">GEO Benchmark</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl md:text-3xl font-extrabold text-white font-mono">{compareData.overview.userGeoScore}</span>
                  <span className="text-xs sm:text-sm text-neutral-400 font-mono">/ Avg {compareData.overview.avgCompetitorGeo}</span>
                </div>
                <div className="mt-3 w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (compareData.overview.userGeoScore / 100) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Competitor Standings Table with Inclusion Checkboxes */}
            <div className="bg-neutral-900/40 border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between text-base font-semibold text-white">
                <span>SERP Competitors Cohort</span>
                <button
                  onClick={selectAllCompetitors}
                  className="text-xs sm:text-sm font-mono text-neutral-400 hover:text-white cursor-pointer"
                >
                  Reset All Active
                </button>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {competitors.map((c) => {
                  const isActive = activeCompetitorRanks.includes(c.rank)

                  return (
                    <div
                      key={c.rank}
                      onClick={() => toggleCompetitorInclusion(c.rank)}
                      className={`p-3.5 flex items-center justify-between text-sm sm:text-base cursor-pointer hover:bg-white/[0.02] transition-colors ${
                        isActive ? '' : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 pr-2 truncate">
                        <button
                          type="button"
                          className="text-neutral-400 hover:text-white transition-colors"
                        >
                          {isActive ? (
                            <CheckSquare className="w-4.5 h-4.5 text-white" />
                          ) : (
                            <Square className="w-4.5 h-4.5 text-neutral-600" />
                          )}
                        </button>
                        <span className="w-7 h-7 rounded-lg bg-white/[0.08] text-white flex items-center justify-center font-mono text-xs sm:text-sm font-bold flex-shrink-0">
                          {c.rank}
                        </span>
                        <div className="truncate">
                          <div className={`font-semibold truncate ${isActive ? 'text-neutral-100' : 'text-neutral-500 line-through'}`}>
                            {c.title}
                          </div>
                          <div className="text-xs sm:text-sm text-neutral-400 font-mono">{c.domain || c.url}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right font-mono text-xs sm:text-sm text-neutral-300">
                        <div>{c.words}w</div>
                        <div>{c.headings}h</div>
                        <div className="text-white font-bold">{c.score ?? c.geoScore}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
