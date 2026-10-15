import React from 'react'
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ScoreMetrics, AuditIssue } from '../types'

interface ScoreWidgetProps {
  metrics: ScoreMetrics
  targetScore: number
  issues: AuditIssue[]
  onTriggerBoost: () => void
  isGenerating: boolean
}

export const ScoreWidget: React.FC<ScoreWidgetProps> = ({
  metrics,
  targetScore,
  issues,
  onTriggerBoost,
  isGenerating,
}) => {
  return (
    <div className="h-full flex flex-col overflow-y-auto text-sm select-none bg-neutral-950 font-sans">
      {/* Top Score Summary (Apple Inset Glass Card) */}
      <div className="p-4 border-b border-white/[0.08] bg-neutral-900/50 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-white font-semibold tracking-tight text-base">Quality Audit</span>
          <span className="text-xs sm:text-sm font-mono text-neutral-400">Target: {targetScore}</span>
        </div>

        {/* Score Gauge */}
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-white font-mono">
            {metrics.overall}
          </span>
          <span className="text-neutral-400 text-sm sm:text-base font-mono font-medium">/ 100</span>
        </div>

        {/* Apple Pill Progress Bar */}
        <div className="mt-3 w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (metrics.overall / 100) * 100)}%` }}
          />
        </div>

        {/* Sub-scores Grid (Apple Cards) */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-white/[0.08] text-xs sm:text-sm">
          <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3 text-center">
            <div className="text-neutral-400 text-xs sm:text-sm uppercase font-mono font-semibold">SEO</div>
            <div className="text-white font-bold text-xl md:text-2xl mt-1.5 font-mono">{metrics.seo}</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3 text-center">
            <div className="text-neutral-400 text-xs sm:text-sm uppercase font-mono font-semibold">GEO</div>
            <div className="text-white font-bold text-xl md:text-2xl mt-1.5 font-mono">{metrics.geo}</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-neutral-900/70 p-3 text-center">
            <div className="text-neutral-400 text-xs sm:text-sm uppercase font-mono font-semibold">AIO</div>
            <div className="text-white font-bold text-xl md:text-2xl mt-1.5 font-mono">{metrics.aio}</div>
          </div>
        </div>

        {/* Apple Primary /boost Trigger */}
        <button
          onClick={onTriggerBoost}
          disabled={isGenerating}
          className="mt-4 w-full py-3 bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center space-x-2 font-semibold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Execute /boost Optimizer</span>
        </button>
      </div>

      {/* Audit Deficits Checklist */}
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white font-semibold text-base tracking-tight">
            Detected Deficits
          </span>
          <span className="text-xs sm:text-sm font-mono text-neutral-400">
            {issues.length} item{issues.length !== 1 ? 's' : ''}
          </span>
        </div>

        {issues.map((issue, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/[0.08] bg-neutral-900/50 p-3.5 text-sm transition-all hover:border-white/15"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-neutral-100 font-semibold leading-snug">{issue.title}</div>
                <div className="text-neutral-400 text-xs sm:text-sm mt-1 font-mono">{issue.detail}</div>
                {issue.fixProposal && (
                  <div className="text-neutral-300 text-xs sm:text-sm mt-2 bg-white/[0.03] p-2 rounded-lg border border-white/[0.04]">
                    Fix: {issue.fixProposal}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {issues.length === 0 && (
          <div className="p-8 text-center text-neutral-400 border border-white/[0.06] bg-neutral-900/30 rounded-xl flex flex-col items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span className="text-sm sm:text-base">No deficits detected. Content is well-optimized.</span>
          </div>
        )}
      </div>
    </div>
  )
}
