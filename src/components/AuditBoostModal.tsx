import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  Sparkles,
  Check,
  ArrowRight,
  Loader2,
  Download,
  Copy,
  CheckCircle2,
  FileCheck,
} from 'lucide-react'
import type { ProjectBrief, ScoreMetrics, AuditIssue } from '../types'
import { ollama } from '../services/ollama'
import { analyzeContent } from '../services/scoring'

interface AuditBoostModalProps {
  isOpen: boolean
  onClose: () => void
  currentContent: string
  brief: ProjectBrief
  metrics: ScoreMetrics
  issues: AuditIssue[]
  selectedModel: string
  onApplyBoost: (newContent: string) => void
  onExport?: (format: 'markdown' | 'text' | 'html', contentToExport: string) => void
}

const isMacPlatform = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || navigator.platform || '')

export const AuditBoostModal: React.FC<AuditBoostModalProps> = ({
  isOpen,
  onClose,
  currentContent,
  brief,
  metrics,
  issues,
  selectedModel,
  onApplyBoost,
  onExport,
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [boostedText, setBoostedText] = useState<string | null>(null)
  const [boostedMetrics, setBoostedMetrics] = useState<ScoreMetrics | null>(null)
  const [copied, setCopied] = useState(false)

  const handleStartBoost = useCallback(async () => {
    setIsProcessing(true)
    setBoostedText('')

    const missingTopics = brief.topics
      .filter((t) => t.currentCount === 0)
      .map((t) => t.term)

    const unansweredQuestions = brief.questions
      .filter((q) => !q.answered)
      .map((q) => q.question)

    try {
      const result = await ollama.boostContent(
        currentContent,
        brief.query,
        missingTopics,
        unansweredQuestions,
        (token) => {
          setBoostedText((prev) => (prev ?? '') + token)
        }
      )

      const { metrics: newMetrics } = analyzeContent(result, brief)
      setBoostedText(result)
      setBoostedMetrics(newMetrics)
    } catch {
      // Graceful fallback
    } finally {
      setIsProcessing(false)
    }
  }, [brief, currentContent])

  const handleAccept = useCallback(() => {
    if (boostedText) {
      onApplyBoost(boostedText)
      onClose()
    }
  }, [boostedText, onApplyBoost, onClose])

  // Keyboard shortcut listener for Escape (dismiss) and Cmd/Ctrl+Enter (start boost / apply)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (boostedText && !isProcessing) {
          handleAccept()
        } else if (!isProcessing) {
          handleStartBoost()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isProcessing, boostedText, handleAccept, handleStartBoost, onClose])

  if (!isOpen) return null

  const handleCopyMarkdown = () => {
    const textToCopy = boostedText || currentContent
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = (format: 'markdown' | 'text' | 'html') => {
    const textToExport = boostedText || currentContent
    if (onExport) {
      onExport(format, textToExport)
      return
    }

    let fileContent = textToExport
    let mimeType = 'text/plain'
    let extension = 'txt'

    if (format === 'markdown') {
      extension = 'md'
      mimeType = 'text/markdown'
    } else if (format === 'html') {
      fileContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${brief.query}</title></head><body><pre>${textToExport}</pre></body></html>`
      mimeType = 'text/html'
      extension = 'html'
    }

    const blob = new Blob([fileContent], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${brief.query.toLowerCase().replace(/\s+/g, '-')}-boosted.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="bg-neutral-950/95 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Apple Window Header */}
        <div className="h-14 border-b border-white/[0.08] px-5 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-semibold text-base tracking-tight">/boost Comparison Review Sheet</span>
              <span className="text-neutral-400 text-xs font-mono ml-2">({selectedModel})</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-800/80 rounded border border-white/10">
              {isMacPlatform ? '⌘↵' : 'Ctrl+↵'}
            </kbd>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Before vs After Metric Cards Grid (Cupertino Elevation) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            {/* Overall Score */}
            <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3 col-span-2 sm:col-span-1">
              <div className="text-neutral-400 text-xs uppercase font-mono font-semibold">Overall</div>
              <div className="text-white font-bold text-lg md:text-xl mt-1 font-mono">
                {boostedMetrics ? (
                  <span className="flex items-center justify-center space-x-1.5">
                    <span className="text-neutral-400">{metrics.overall}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 inline" />
                    <span className="text-emerald-400 font-bold">{boostedMetrics.overall}</span>
                  </span>
                ) : (
                  <span>{metrics.overall} <span className="text-xs text-neutral-500 font-normal">/{brief.targetScore}</span></span>
                )}
              </div>
            </div>

            {/* SEO Score */}
            <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3">
              <div className="text-neutral-400 text-xs uppercase font-mono font-semibold">SEO</div>
              <div className="text-neutral-200 font-bold text-lg mt-1 font-mono">
                {boostedMetrics ? (
                  <span className="flex items-center justify-center space-x-1">
                    <span className="text-neutral-400">{metrics.seo}%</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500 inline" />
                    <span className="text-white">{boostedMetrics.seo}%</span>
                  </span>
                ) : (
                  `${metrics.seo}%`
                )}
              </div>
            </div>

            {/* GEO Score */}
            <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3">
              <div className="text-neutral-400 text-xs uppercase font-mono font-semibold">GEO</div>
              <div className="text-neutral-200 font-bold text-lg mt-1 font-mono">
                {boostedMetrics ? (
                  <span className="flex items-center justify-center space-x-1">
                    <span className="text-neutral-400">{metrics.geo}%</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500 inline" />
                    <span className="text-white">{boostedMetrics.geo}%</span>
                  </span>
                ) : (
                  `${metrics.geo}%`
                )}
              </div>
            </div>

            {/* AIO Score */}
            <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3">
              <div className="text-neutral-400 text-xs uppercase font-mono font-semibold">AIO</div>
              <div className="text-neutral-200 font-bold text-lg mt-1 font-mono">
                {boostedMetrics ? (
                  <span className="flex items-center justify-center space-x-1">
                    <span className="text-neutral-400">{metrics.aio}%</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500 inline" />
                    <span className="text-white">{boostedMetrics.aio}%</span>
                  </span>
                ) : (
                  `${metrics.aio}%`
                )}
              </div>
            </div>

            {/* Citations Count */}
            <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3">
              <div className="text-neutral-400 text-xs uppercase font-mono font-semibold">Citations</div>
              <div className="text-neutral-200 font-bold text-lg mt-1 font-mono">
                {boostedMetrics ? (
                  <span className="flex items-center justify-center space-x-1">
                    <span className="text-neutral-400">{metrics.geoCitationsCount}</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500 inline" />
                    <span className="text-emerald-400 font-bold">{boostedMetrics.geoCitationsCount}</span>
                  </span>
                ) : (
                  metrics.geoCitationsCount
                )}
              </div>
            </div>
          </div>

          {/* Deficit Remediation Checklist */}
          {issues.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-neutral-900/40 p-3.5">
              <div className="text-neutral-300 font-semibold text-xs uppercase tracking-wider mb-2 flex items-center justify-between font-mono">
                <span>Deficit Remediation Checklist</span>
                <span className="text-neutral-400">{boostedText ? `${issues.length} resolved` : `${issues.length} pending`}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-2 text-xs p-2 rounded-lg border transition-colors ${
                      boostedText
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-neutral-200'
                        : 'bg-neutral-900/40 border-white/[0.06] text-neutral-400'
                    }`}
                  >
                    {boostedText ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <FileCheck className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className={`font-medium ${boostedText ? 'text-white' : 'text-neutral-300'}`}>
                        {issue.title}:
                      </span>{' '}
                      <span className="text-neutral-400">{issue.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Callout or Live Token Streaming Output */}
          {!boostedText && !isProcessing ? (
            <div className="rounded-xl border border-white/[0.08] bg-neutral-900/30 p-8 text-center">
              <p className="text-sm sm:text-base text-neutral-300 mb-4 max-w-lg mx-auto leading-relaxed">
                Executes an autonomous audit pass to inject missing semantic entities, anchor definitional statements, and format comparative empirical benchmark data.
              </p>
              <button
                onClick={handleStartBoost}
                className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 font-semibold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-xs"
              >
                Run /boost Optimization
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2 text-neutral-300 text-sm font-semibold">
                <span className="flex items-center space-x-2">
                  <span>Optimized Content Preview</span>
                  {boostedMetrics && (
                    <span className="text-xs font-mono text-emerald-400 font-semibold">
                      +{boostedMetrics.overall - metrics.overall} score elevation
                    </span>
                  )}
                </span>
                {isProcessing && (
                  <span className="flex items-center space-x-1.5 text-neutral-300 text-xs sm:text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Streaming tokens...</span>
                  </span>
                )}
              </div>
              <div className="h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#050507] p-4 text-neutral-200 whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed shadow-inner">
                {boostedText || 'Initiating model generation...'}
              </div>
            </div>
          )}
        </div>

        {/* Apple Footer with 1-Click Apply and 1-Click Export */}
        <div className="h-16 border-t border-white/[0.08] px-5 flex items-center justify-between bg-neutral-900/60">
          {/* Export Options (1-Click) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMarkdown}
              disabled={!boostedText && !currentContent}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs font-medium"
              title="Copy Markdown to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>

            <button
              onClick={() => handleDownload('markdown')}
              disabled={!boostedText && !currentContent}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs font-medium"
              title="Download Markdown file"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>.md</span>
            </button>

            <button
              onClick={() => handleDownload('html')}
              disabled={!boostedText && !currentContent}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs font-medium hidden sm:flex"
              title="Download HTML file"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>.html</span>
            </button>

            <button
              onClick={() => handleDownload('text')}
              disabled={!boostedText && !currentContent}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs font-medium hidden sm:flex"
              title="Download Plain Text file"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>.txt</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs sm:text-sm font-medium"
            >
              Cancel
            </button>

            {boostedText && !isProcessing && (
              <button
                onClick={handleAccept}
                className="flex items-center space-x-2 px-5 py-2 bg-white text-black hover:bg-neutral-200 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Apply to Canvas</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
