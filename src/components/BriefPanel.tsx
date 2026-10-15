import React from 'react'
import { Plus, Edit3, ExternalLink, Sparkles, ListTree, Loader2 } from 'lucide-react'
import type { OutlineItem, SerpCompetitor } from '../types'

interface BriefPanelProps {
  outline: OutlineItem[]
  competitors: SerpCompetitor[]
  onInsertHeading: (heading: string, level: 'h2' | 'h3') => void
  onGenerateSection: (item: OutlineItem) => void
  onInsertFullOutline?: () => void
  onFinishDraft?: () => void
  isGenerating: boolean
  generatingSectionId?: string | null
}

export const BriefPanel: React.FC<BriefPanelProps> = ({
  outline,
  competitors,
  onInsertHeading,
  onGenerateSection,
  onInsertFullOutline,
  onFinishDraft,
  isGenerating,
  generatingSectionId,
}) => {
  return (
    <div className="h-full flex flex-col overflow-y-auto text-sm select-none bg-neutral-950 font-sans">
      {/* Plan Header */}
      <div className="p-4 border-b border-white/[0.08] bg-neutral-900/50 backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-white font-semibold tracking-tight text-base">Content Plan</span>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">Hierarchical outline & entities</p>
          </div>
          <span className="text-xs sm:text-sm font-mono text-neutral-400">
            {outline.length} sections
          </span>
        </div>

        {/* Dual Planning Primary Action Triggers: Insert Full Outline & Finish Draft */}
        <div className="flex items-center gap-2">
          {onInsertFullOutline && (
            <button
              onClick={onInsertFullOutline}
              disabled={isGenerating || outline.length === 0}
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
              title="Inject all H2/H3 headers at once into draft"
            >
              <ListTree className="w-3.5 h-3.5 text-neutral-400" />
              <span>Insert Full Outline</span>
            </button>
          )}

          {onFinishDraft && (
            <button
              onClick={onFinishDraft}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-40 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
              title="Draft full comprehensive article with Ollama"
            >
              {isGenerating && !generatingSectionId ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Drafting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Finish Draft</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Outline List (Apple Inset Grouped Card Style) */}
      <div className="p-4 space-y-3 flex-1">
        {outline.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border border-white/[0.08] bg-neutral-900/50 hover:bg-neutral-900/80 p-3.5 transition-all ${
              item.level === 'h3' ? 'ml-3 border-white/[0.05] bg-neutral-900/30' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-1.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs uppercase font-mono text-neutral-400 font-semibold">
                    {item.level}
                  </span>
                </div>
                <div className="text-neutral-100 font-semibold text-base leading-snug">
                  {item.title}
                </div>
              </div>
            </div>

            {/* Subtopics / Entities */}
            {item.keyTopics && item.keyTopics.length > 0 && (
              <div className="mt-2 text-xs sm:text-sm text-neutral-400 font-mono">
                {item.keyTopics.join(' · ')}
              </div>
            )}

            {/* Apple Micro Actions */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs sm:text-sm font-medium">
              <button
                onClick={() => onInsertHeading(item.title, item.level)}
                className="text-neutral-400 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors py-1 px-2.5 rounded-lg hover:bg-white/[0.04]"
              >
                <Plus className="w-4 h-4" />
                <span>Insert</span>
              </button>

              <button
                onClick={() => onGenerateSection(item)}
                disabled={isGenerating}
                className="text-neutral-300 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors disabled:opacity-40 py-1 px-2.5 rounded-lg hover:bg-white/[0.04]"
                title="Draft modular section with local Ollama"
              >
                {generatingSectionId === item.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Write with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Competitor SERP Benchmarks (Apple Inset Card Group) */}
      <div className="border-t border-white/[0.08] bg-neutral-900/30 p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-base font-semibold text-white tracking-tight">Top Competitors</span>
          <span className="text-xs sm:text-sm text-neutral-400 font-mono">{competitors.length} ranked</span>
        </div>

        <div className="space-y-2.5">
          {competitors.slice(0, 4).map((comp) => (
            <div
              key={comp.rank}
              className="rounded-xl border border-white/[0.06] bg-neutral-900/60 p-3.5 text-xs sm:text-sm transition-all hover:border-white/10"
            >
              <div className="flex items-center justify-between text-neutral-200 font-medium">
                <span className="text-neutral-500 font-mono text-xs sm:text-sm mr-2">#{comp.rank}</span>
                <span className="truncate flex-1 text-sm sm:text-base font-medium">{comp.title}</span>
                {comp.url && (
                  <a
                    href={comp.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-400 hover:text-white ml-2 transition-colors flex-shrink-0"
                    title={comp.url}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-neutral-400 text-xs sm:text-sm font-mono">
                <span>{comp.words}w</span>
                <span>{comp.headings}h</span>
                <span>GEO: {comp.geoScore}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
