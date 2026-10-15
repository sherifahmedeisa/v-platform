import React, { useRef, useState } from 'react'
import {
  Heading2,
  Heading3,
  Bold,
  List,
  Quote,
  Table,
  Eye,
  Edit3,
  Sparkles,
} from 'lucide-react'
import type { ScoreMetrics } from '../types'
import { SegmentedControl } from './SegmentedControl'

interface EditorProps {
  content: string
  onChange: (val: string) => void
  scoreMetrics: ScoreMetrics
  targetWordCount: number
  onTriggerBoost: () => void
  isGenerating: boolean
}

const isMacPlatform = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || navigator.platform || '')

export const Editor: React.FC<EditorProps> = ({
  content,
  onChange,
  scoreMetrics,
  targetWordCount,
  onTriggerBoost,
  isGenerating,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertSnippet = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return
    const el = textareaRef.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = content.substring(start, end)
    const replacement = `${prefix}${selected || 'text'}${suffix}`
    const newContent = content.substring(0, start) + replacement + content.substring(end)
    onChange(newContent)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected ? selected.length : 4)
      )
    }, 10)
  }

  const renderSimpleMarkdown = (md: string) => {
    const lines = md.split('\n')
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-3xl md:text-4xl font-bold text-white mt-8 mb-4 tracking-tight font-sans">
            {line.replace('# ', '')}
          </h1>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl md:text-2xl font-bold text-white mt-8 mb-3 border-b border-white/[0.08] pb-1.5 tracking-tight font-sans">
            {line.replace('## ', '')}
          </h2>
        )
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg md:text-xl font-semibold text-neutral-100 mt-6 mb-2 tracking-tight font-sans">
            {line.replace('### ', '')}
          </h3>
        )
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-6 list-disc text-neutral-200 text-base my-1.5 leading-relaxed font-sans">
            {line.replace(/^[-*]\s+/, '')}
          </li>
        )
      }
      if (/^\d+\.\s+/.test(line)) {
        return (
          <li key={idx} className="ml-6 list-decimal text-neutral-200 text-base my-1.5 leading-relaxed font-sans">
            {line.replace(/^\d+\.\s+/, '')}
          </li>
        )
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-3 border-white/30 pl-4 italic text-neutral-300 text-base my-4 leading-relaxed font-sans">
            {line.replace('> ', '')}
          </blockquote>
        )
      }
      if (line.startsWith('|')) {
        return (
          <div key={idx} className="font-mono text-sm text-neutral-200 py-1 whitespace-pre overflow-x-auto bg-neutral-900/40 rounded px-2 my-1">
            {line}
          </div>
        )
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-4" />
      }
      return (
        <p key={idx} className="text-neutral-200 text-base md:text-lg leading-relaxed my-3 font-sans">
          {line}
        </p>
      )
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08080a] select-none border-r border-white/[0.08]">
      {/* Editor Toolbar with Apple Segmented Styling */}
      <div className="h-13 border-b border-white/[0.08] bg-neutral-950/70 backdrop-blur-md px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-neutral-900/80 p-1 rounded-xl border border-white/[0.06] space-x-0.5">
            <button
              onClick={() => insertSnippet('## ')}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
              title="H2 Heading"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertSnippet('### ')}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
              title="H3 Heading"
            >
              <Heading3 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-neutral-900/80 p-1 rounded-xl border border-white/[0.06] space-x-0.5">
            <button
              onClick={() => insertSnippet('**', '**')}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertSnippet('- ')}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertSnippet('> ')}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                insertSnippet(
                  '\n| Metric | Specification | Benchmark |\n| --- | --- | --- |\n| ',
                  ' | 0.00 | Industry Spec |\n'
                )
              }
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
              title="Structured Table (GEO & AIO)"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher and Boost Button */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onTriggerBoost}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-3.5 py-2 text-sm text-neutral-200 hover:text-white bg-neutral-900/70 hover:bg-neutral-800 border border-white/[0.08] rounded-xl transition-all cursor-pointer font-sans font-medium"
            title="Audit and /boost"
          >
            <Sparkles className="w-4 h-4 text-neutral-400" />
            <span>Audit</span>
          </button>

          <SegmentedControl<'edit' | 'preview'>
            items={[
              { id: 'edit', label: 'Write', icon: <Edit3 className="w-4 h-4" /> },
              { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
            ]}
            activeId={viewMode}
            onChange={setViewMode}
            size="sm"
          />
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 relative overflow-auto p-6 md:p-10 lg:p-12">
        {viewMode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Start drafting or use Research & Plan in the sidebar..."
            className="w-full h-full bg-transparent text-neutral-100 resize-none focus:outline-none font-mono text-base md:text-lg leading-relaxed placeholder-neutral-600 selection:bg-white/20 select-text"
            spellCheck={false}
          />
        ) : (
          <div className="max-w-3xl mx-auto py-2">
            {renderSimpleMarkdown(content)}
          </div>
        )}
      </div>

      {/* Apple Cupertino Status Bar */}
      <div className="h-11 border-t border-white/[0.08] bg-neutral-950/80 px-5 flex items-center justify-between text-xs sm:text-sm text-neutral-300 font-sans select-none">
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-1.5">
            <span className="text-neutral-400">Words</span>
            <span className="font-mono text-neutral-100 font-semibold">{scoreMetrics.wordCount}</span>
            <span className="text-neutral-500 font-mono">/ {targetWordCount}</span>
          </div>

          <div className="h-3.5 w-px bg-white/[0.08]" />

          <div className="flex items-center space-x-1.5">
            <span className="text-neutral-400">Headings</span>
            <span className="font-mono text-neutral-100 font-semibold">{scoreMetrics.headingCount}</span>
          </div>

          <div className="h-3.5 w-px bg-white/[0.08]" />

          <div className="flex items-center space-x-1.5">
            <span className="text-neutral-400">Citations</span>
            <span className="font-mono text-neutral-100 font-semibold">{scoreMetrics.geoCitationsCount}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 font-mono text-xs sm:text-sm">
            <span className="text-neutral-400 font-sans">Entities</span>
            <span className="text-neutral-100 font-semibold">{scoreMetrics.topicsCovered}</span>
            <span className="text-neutral-500">/ {scoreMetrics.totalTopics}</span>
          </div>

          <span className="hidden sm:inline text-xs sm:text-sm text-neutral-400 font-mono">
            {isMacPlatform ? '⌘↵' : 'Ctrl+↵'} /boost
          </span>
        </div>
      </div>
    </div>
  )
}
