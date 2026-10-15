import React, { useState, useEffect, useRef } from 'react'
import { Check, Loader2, X } from 'lucide-react'

export interface ResearchProgressHudProps {
  isResearching: boolean
  progress: { percent: number; message: string } | null
  competitorsCount?: number
  onDismiss?: () => void
}

export const ResearchProgressHud: React.FC<ResearchProgressHudProps> = ({
  isResearching,
  progress,
  competitorsCount = 20,
  onDismiss,
}) => {
  const [completed, setCompleted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const prevResearchingRef = useRef(isResearching)

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let showTimer: ReturnType<typeof setTimeout> | undefined

    if (prevResearchingRef.current && !isResearching) {
      showTimer = setTimeout(() => {
        setCompleted(true)
        setDismissed(false)
      }, 0)
      hideTimer = setTimeout(() => {
        setCompleted(false)
      }, 2200)
    } else if (isResearching) {
      showTimer = setTimeout(() => {
        setCompleted(false)
        setDismissed(false)
      }, 0)
    }
    prevResearchingRef.current = isResearching

    return () => {
      if (showTimer) clearTimeout(showTimer)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [isResearching])

  const visible = (isResearching || completed) && !dismissed
  if (!visible) return null

  const percent = progress?.percent ?? (completed ? 100 : 15)
  const message = completed
    ? `Research Complete · ${competitorsCount} Competitors Analyzed`
    : progress?.message || 'Scraping SERP competitors...'

  return (
    <div
      className="fixed top-18 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex items-center space-x-3.5 px-4 sm:px-5 py-2.5 rounded-xl border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          completed
            ? 'bg-neutral-900/95 border-emerald-400/50 ring-2 ring-emerald-400/20 shadow-emerald-950/40'
            : 'bg-neutral-950/85 border-white/15 ring-1 ring-white/10'
        }`}
      >
        {/* Status Indicator Icon */}
        <div className="flex items-center justify-center flex-shrink-0">
          {completed ? (
            <div className="w-5 h-5 rounded-lg bg-emerald-400/20 text-emerald-400 flex items-center justify-center animate-in zoom-in-75">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          ) : (
            <Loader2 className="w-4 h-4 text-neutral-300 animate-spin" />
          )}
        </div>

        {/* Message and Step text */}
        <div className="flex items-center space-x-2 text-xs sm:text-sm font-sans">
          <span
            className={`font-medium tracking-tight ${
              completed ? 'text-white font-semibold' : 'text-neutral-200'
            }`}
          >
            {message}
          </span>
          {!completed && (
            <span className="text-neutral-400 font-mono text-xs">
              · {percent}%
            </span>
          )}
        </div>

        {/* Subtle Progress Bar */}
        {!completed && (
          <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, Math.min(100, percent))}%` }}
            />
          </div>
        )}

        {/* Dismiss Button */}
        <button
          onClick={() => {
            setDismissed(true)
            if (onDismiss) onDismiss()
          }}
          className="w-5 h-5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer -mr-1"
          title="Dismiss HUD"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
