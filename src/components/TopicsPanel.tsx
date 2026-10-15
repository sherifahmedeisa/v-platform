import React, { useState, useRef, useEffect } from 'react'
import { Plus, Sparkles, BarChart2, MoreHorizontal, Loader2 } from 'lucide-react'
import type { SemanticTopic } from '../types'
import { SegmentedControl } from './SegmentedControl'

interface TopicsPanelProps {
  topics: SemanticTopic[]
  onInsertTopic: (term: string) => void
  onDraftTopicParagraph?: (term: string) => void
  onViewCompetitorUsage?: (term: string) => void
  isGenerating?: boolean
  generatingTopicTerm?: string | null
}

export const TopicsPanel: React.FC<TopicsPanelProps> = ({
  topics,
  onInsertTopic,
  onDraftTopicParagraph,
  onViewCompetitorUsage,
  isGenerating = false,
  generatingTopicTerm = null,
}) => {
  const [filter, setFilter] = useState<'all' | 'seo' | 'geo' | 'aio' | 'missing'>('all')
  const [activeMenuTerm, setActiveMenuTerm] = useState<string | null>(null)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenuTerm(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredTopics = topics.filter((t) => {
    if (filter === 'missing') return t.currentCount === 0
    if (filter === 'all') return true
    return t.category === filter
  })

  const optimalCount = topics.filter((t) => t.currentCount >= t.targetMin).length

  return (
    <div className="h-full flex flex-col text-sm select-none bg-neutral-950 font-sans">
      {/* Cupertino Header and Filter */}
      <div className="p-4 border-b border-white/[0.08] bg-neutral-900/50 backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-white font-semibold tracking-tight text-base">Topic Optimization</span>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">Semantic entity coverage</p>
          </div>
          <span className="text-xs sm:text-sm font-mono text-neutral-300 font-medium">
            {optimalCount}/{topics.length} covered
          </span>
        </div>

        {/* Apple Segmented Filter Bar */}
        <SegmentedControl<'all' | 'seo' | 'geo' | 'aio' | 'missing'>
          items={[
            { id: 'all', label: 'All' },
            { id: 'seo', label: 'SEO' },
            { id: 'geo', label: 'GEO' },
            { id: 'aio', label: 'AIO' },
            { id: 'missing', label: 'Missing' },
          ]}
          activeId={filter}
          onChange={setFilter}
          size="sm"
          fullWidth
        />
      </div>

      {/* Topic List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5" ref={menuContainerRef}>
        {filteredTopics.map((topic) => {
          const isOptimal = topic.currentCount >= topic.targetMin && topic.currentCount <= topic.targetMax
          const isUnder = topic.currentCount < topic.targetMin
          const isZero = topic.currentCount === 0
          const isMenuOpen = activeMenuTerm === topic.term
          const isThisGenerating = isGenerating && generatingTopicTerm === topic.term

          return (
            <div
              key={topic.term}
              className={`relative rounded-xl border p-3.5 transition-all group ${
                isMenuOpen
                  ? 'bg-neutral-900/90 border-white/20 shadow-xl ring-1 ring-white/10'
                  : 'bg-neutral-900/50 hover:bg-neutral-900/80 border-white/[0.08] hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 pr-2 cursor-pointer"
                  onClick={() => setActiveMenuTerm(isMenuOpen ? null : topic.term)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-neutral-100 group-hover:text-white font-medium text-sm sm:text-base transition-colors">
                      {topic.term}
                    </span>
                    <span className="text-xs uppercase font-mono text-neutral-400 font-semibold">
                      {topic.category}
                    </span>
                  </div>
                </div>

                {/* Status & Frequency Meter */}
                <div className="flex items-center space-x-2.5">
                  <div className="text-right font-mono mr-1">
                    <span
                      className={`text-sm sm:text-base ${
                        isOptimal
                          ? 'text-white font-bold'
                          : isZero
                          ? 'text-neutral-500 font-medium'
                          : 'text-neutral-200 font-semibold'
                      }`}
                    >
                      {topic.currentCount}
                    </span>
                    <span className="text-neutral-500 text-xs sm:text-sm">/{topic.targetMin}</span>
                  </div>

                  {/* Apple-style pill progress indicator */}
                  <div className="w-14 h-2.5 bg-neutral-800 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOptimal
                          ? 'bg-white'
                          : isUnder && !isZero
                          ? 'bg-neutral-400'
                          : 'bg-neutral-700'
                      }`}
                      style={{
                        width: `${Math.min(100, (topic.currentCount / (topic.targetMin || 1)) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Quick Insert Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onInsertTopic(topic.term)
                    }}
                    title={`Insert "${topic.term}" into draft`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Popover Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenuTerm(isMenuOpen ? null : topic.term)
                    }}
                    title="Quick actions menu"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      isMenuOpen
                        ? 'bg-white text-black'
                        : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isThisGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MoreHorizontal className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Apple Action Popover Menu */}
              {isMenuOpen && (
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-1.5 animate-in fade-in slide-in-from-top-1 text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onInsertTopic(topic.term)
                      setActiveMenuTerm(null)
                    }}
                    className="flex items-center justify-center sm:justify-start space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Insert into draft</span>
                  </button>

                  {onDraftTopicParagraph && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDraftTopicParagraph(topic.term)
                        setActiveMenuTerm(null)
                      }}
                      disabled={isGenerating}
                      className="flex items-center justify-center sm:justify-start space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Draft with Ollama</span>
                    </button>
                  )}

                  {onViewCompetitorUsage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewCompetitorUsage(topic.term)
                        setActiveMenuTerm(null)
                      }}
                      className="flex items-center justify-center sm:justify-start space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Competitor usage</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredTopics.length === 0 && (
          <div className="p-10 text-center text-neutral-500 text-sm sm:text-base">
            No topics in this category.
          </div>
        )}
      </div>
    </div>
  )
}
