import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Globe,
  Briefcase,
  User,
  ArrowRight,
  Check,
  CheckCircle2,
  X,
  Loader2,
  SlidersHorizontal,
  Flame,
  Award,
} from 'lucide-react'
import type { UserAccount } from '../services/api'
import type { DomainAuditResult } from '../types'
import { cleanDomain, deriveWorkspaceName, computeDomainAudit } from '../services/domain'
import { workspacesApi } from '../services/api'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserAccount | null
  initialDomain?: string
  initialWorkspaceName?: string
  initialStep?: 1 | 2 | 3
  onComplete: (data: {
    fullName: string
    role: string
    domain: string
    workspaceName: string
    initialTopic: string
    auditResult?: DomainAuditResult
  }) => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  user,
  initialDomain,
  initialWorkspaceName,
  initialStep = 1,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(initialStep)

  // Domain & Workspace State
  const [rawDomain, setRawDomain] = useState(() => initialDomain || '')
  const [workspaceName, setWorkspaceName] = useState(() => {
    if (initialWorkspaceName) return initialWorkspaceName
    if (initialDomain) return deriveWorkspaceName(initialDomain)
    return ''
  })
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false)

  // Profile Form state
  const [fullName, setFullName] = useState(() => {
    if (user?.profile?.fullName) return user.profile.fullName
    if (user?.email) {
      const localPart = user.email.split('@')[0]
      return localPart.charAt(0).toUpperCase() + localPart.slice(1)
    }
    return 'Alex Creator'
  })
  const [role, setRole] = useState(user?.profile?.role || 'Lead GEO Strategist')

  // Domain Computation & Competitor Selection State
  const [isComputing, setIsComputing] = useState(false)
  const [computeProgress, setComputeProgress] = useState(0)
  const [computeStatusText, setComputeStatusText] = useState('Preparing domain analysis...')
  const [auditResult, setAuditResult] = useState<DomainAuditResult | null>(null)
  const [selectedCompetitorDomain, setSelectedCompetitorDomain] = useState<string | null>(null)

  const [domainError, setDomainError] = useState<string | null>(null)

  // Update derived workspace name as user types domain (unless manually overridden)
  const handleDomainChange = (val: string) => {
    setRawDomain(val)
    if (domainError) setDomainError(null)
    if (!isNameManuallyEdited) {
      const derived = deriveWorkspaceName(val)
      setWorkspaceName(derived)
    }
  }

  // Handle triggering computation when transitioning to step 2
  const runComputation = async (targetDomain: string, targetName: string) => {
    setIsComputing(true)
    setComputeProgress(15)
    setComputeStatusText(`Resolving domain content footprint for ${targetDomain}...`)

    const progressTimer1 = setTimeout(() => {
      setComputeProgress(45)
      setComputeStatusText('Extracting semantic entity clusters and title/heading hierarchy...')
    }, 350)

    const progressTimer2 = setTimeout(() => {
      setComputeProgress(75)
      setComputeStatusText('Benchmarking content competitors & calculating match percentages...')
    }, 700)

    try {
      const result = await workspacesApi.compute(targetDomain, targetName)
      setAuditResult(result)
      if (result.competitors && result.competitors.length > 0) {
        setSelectedCompetitorDomain(result.competitors[0].domain)
      }
    } catch {
      // Local fallback computation
      const fallback = computeDomainAudit(targetDomain, targetName)
      setAuditResult(fallback)
      if (fallback.competitors && fallback.competitors.length > 0) {
        setSelectedCompetitorDomain(fallback.competitors[0].domain)
      }
    } finally {
      clearTimeout(progressTimer1)
      clearTimeout(progressTimer2)
      setComputeProgress(100)
      setComputeStatusText('Computation complete!')
      setTimeout(() => {
        setIsComputing(false)
      }, 300)
    }
  }

  const autoStartedRef = useRef(false)

  useEffect(() => {
    if (isOpen && initialStep === 2 && !autoStartedRef.current && (initialDomain || rawDomain)) {
      autoStartedRef.current = true
      const cleaned = cleanDomain(initialDomain || rawDomain)
      const name = initialWorkspaceName || deriveWorkspaceName(cleaned)
      const timer = setTimeout(() => {
        void runComputation(cleaned, name)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialStep, initialDomain, initialWorkspaceName, rawDomain])

  if (!isOpen) return null

  const handleNext = () => {
    if (step === 1) {
      const trimmed = rawDomain.trim()
      if (!trimmed) {
        setDomainError('Please enter a target website or domain.')
        return
      }
      setDomainError(null)
      const domainCleaned = cleanDomain(trimmed)
      const finalName = workspaceName.trim() || deriveWorkspaceName(domainCleaned)
      setWorkspaceName(finalName)
      setAuditResult(null)
      setSelectedCompetitorDomain(null)
      runComputation(domainCleaned, finalName)
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else {
      const domainCleaned = cleanDomain(rawDomain)
      const finalName = workspaceName.trim() || deriveWorkspaceName(domainCleaned)
      const primaryFix = auditResult?.howToFix[0]
      const initialTopic = primaryFix?.title || `${finalName} Architecture & Core Principles`

      let reorderedCompetitors = auditResult?.competitors || []
      if (selectedCompetitorDomain && reorderedCompetitors.length > 0) {
        const chosen = reorderedCompetitors.find((c) => c.domain === selectedCompetitorDomain)
        if (chosen) {
          reorderedCompetitors = [chosen, ...reorderedCompetitors.filter((c) => c.domain !== selectedCompetitorDomain)]
        }
      }

      onComplete({
        fullName: fullName.trim() || 'Alex Creator',
        role: role || 'Lead GEO Strategist',
        domain: domainCleaned,
        workspaceName: finalName,
        initialTopic,
        auditResult: auditResult ? {
          ...auditResult,
          competitors: reorderedCompetitors,
        } : undefined,
      })
    }
  }

  const activeChosenCompetitor = auditResult?.competitors.find(
    (c) => c.domain === (selectedCompetitorDomain || auditResult?.competitors[0]?.domain)
  ) || auditResult?.competitors[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-neutral-900/80 border border-white/[0.12] shadow-2xl backdrop-blur-2xl p-7 overflow-hidden text-neutral-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        {/* Ambient glow accents */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close setup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Apple Step Progress Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-10 bg-white shadow-xs'
                    : s < step
                    ? 'w-5 bg-emerald-400'
                    : 'w-5 bg-white/20'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {step === 1 && 'Step 1: Website & Workspace Foundation'}
            {step === 2 && 'Step 2: Analysis & Competitor Benchmark Selection'}
            {step === 3 && 'Step 3: Launch Verified Workspace'}
          </span>
        </div>

        {/* STEP 1: Website / Domain Foundation */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-mono text-neutral-400 mb-1">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Domain-Centric Workspace</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                What website or domain are you optimizing?
              </h2>
              <p className="text-xs text-neutral-400">
                Your workspace will be custom-tailored around this domain, analyzing content, title, headings, and discoverable competitors in real time.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {/* Domain Input */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Target Website / Domain:
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-sky-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={rawDomain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder="e.g. yourbrand.io, acme.com"
                    className={`w-full bg-neutral-950/70 border rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition-all font-mono shadow-inner ${
                      domainError
                        ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                        : 'border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/30'
                    }`}
                  />
                </div>
                {domainError && (
                  <p className="text-[11px] text-rose-400 mt-1.5 flex items-center space-x-1">
                    <span>⚠</span>
                    <span>{domainError}</span>
                  </p>
                )}
              </div>

              {/* Derived Workspace Name & Role Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>Workspace Name:</span>
                    <span className="text-[10px] text-neutral-400 font-mono">Editable</span>
                  </label>
                  <div className="relative">
                    <SlidersHorizontal className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value)
                        setIsNameManuallyEdited(true)
                      }}
                      placeholder="e.g. My Workspace"
                      className="w-full bg-neutral-950/70 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Your Name:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Creator"
                      className="w-full bg-neutral-950/70 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Your Specialty Role:
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-neutral-950/70 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="Lead GEO Strategist">Lead GEO Strategist</option>
                    <option value="Content Architect">Content Architect</option>
                    <option value="Technical SEO Specialist">Technical SEO Specialist</option>
                    <option value="AI Content Researcher">AI Content Researcher</option>
                    <option value="Managing Editor">Managing Editor</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Live Domain Content Computation & Competitor Match */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-mono text-neutral-400">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Domain Content Computation</span>
                </div>
                <span className="font-mono text-xs text-neutral-400">
                  {cleanDomain(rawDomain)}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Website Audit & Nearest Competitor Selection
              </h2>
            </div>

            {/* Computation Scanning State */}
            {isComputing ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-white animate-spin opacity-80" />
                  <Globe className="w-5 h-5 text-sky-400 absolute" />
                </div>
                <div className="text-center space-y-1.5">
                  <div className="text-sm font-semibold text-white">{computeStatusText}</div>
                  <div className="text-xs text-neutral-400 font-mono">
                    Analyzing entity density, AIO capture & SERP competitor match...
                  </div>
                </div>
                <div className="w-56 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 transition-all duration-300 rounded-full"
                    style={{ width: `${computeProgress}%` }}
                  />
                </div>
              </div>
            ) : auditResult ? (
              <div className="space-y-4 animate-in fade-in duration-200 max-h-[55vh] overflow-y-auto pr-1">
                {/* Score Header Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.1] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-neutral-400">
                      Website Triple-Score Benchmark
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl font-bold font-mono text-white tracking-tight">
                        {auditResult.overallScore}
                      </span>
                      <span className="text-xs font-mono text-neutral-400 font-medium">
                        Target {auditResult.targetScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <div className="px-3 py-2 rounded-xl bg-neutral-900/80 border border-white/[0.06] text-center">
                      <div className="text-[10px] text-neutral-400 font-sans">GEO Index</div>
                      <div className="text-base font-bold text-sky-400">{auditResult.geoScore}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-neutral-900/80 border border-white/[0.06] text-center">
                      <div className="text-[10px] text-neutral-400 font-sans">AIO Capture</div>
                      <div className="text-base font-bold text-purple-400">{auditResult.aioScore}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-neutral-900/80 border border-white/[0.06] text-center">
                      <div className="text-[10px] text-neutral-400 font-sans">SEO On-Page</div>
                      <div className="text-base font-bold text-emerald-400">{auditResult.seoScore}</div>
                    </div>
                  </div>
                </div>

                {/* Content Competitors & Interactive Nearest Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-300">
                    <span className="flex items-center space-x-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select Nearest Competitor to Benchmark Against:</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Click card to choose
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {auditResult.competitors.slice(0, 3).map((comp) => {
                      const isSelected = (selectedCompetitorDomain || auditResult.competitors[0]?.domain) === comp.domain
                      return (
                        <div
                          key={comp.domain}
                          onClick={() => setSelectedCompetitorDomain(comp.domain)}
                          className={`p-3 rounded-2xl transition-all space-y-1.5 cursor-pointer relative ${
                            isSelected
                              ? 'bg-white/10 border-2 border-white shadow-md'
                              : 'bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                              {comp.name}
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {comp.matchPercentage}% match
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono truncate">
                            {comp.domain}
                          </div>
                          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                              style={{ width: `${comp.matchPercentage}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-neutral-400 pt-0.5">
                            <span className="text-neutral-300">Overlap:</span> {comp.keywordOverlap}% · <span className="text-neutral-300">Entities:</span> {comp.semanticEntityScore}%
                          </div>

                          <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                            {isSelected ? (
                              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>Nearest Benchmark</span>
                              </span>
                            ) : (
                              <span className="text-neutral-500 hover:text-neutral-300">
                                Click to select
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Primary How-To-Fix Recommendation */}
                {auditResult.howToFix[0] && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                        <Award className="w-3.5 h-3.5 text-sky-400" />
                        <span>Actionable Deficit Fix ({auditResult.howToFix[0].impact.toUpperCase()} IMPACT)</span>
                      </span>
                      <span className="text-[10px] font-mono text-sky-400 uppercase font-semibold">
                        {auditResult.howToFix[0].category}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-neutral-200">
                      {auditResult.howToFix[0].title}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {auditResult.howToFix[0].detail}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 3: Workspace Confirmation & Launch */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-mono text-emerald-400 mb-1">
                <Check className="w-3.5 h-3.5" />
                <span>Workspace Ready</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Your website workspace is ready to launch
              </h2>
              <p className="text-xs text-neutral-400">
                The entire editorial workspace is now configured for {workspaceName} ({cleanDomain(rawDomain)}).
              </p>
            </div>

            {/* Glass Showcase */}
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 flex items-center justify-between shadow-inner">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-base text-white border border-white/15">
                  🌐
                </div>
                <div>
                  <div className="text-xs font-semibold text-white flex items-center space-x-2">
                    <span>{workspaceName}</span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      ({cleanDomain(rawDomain)})
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Active Score: <span className="font-mono text-white font-bold">{auditResult?.overallScore || 85}</span>/100 · {auditResult?.competitors.length || 3} competitors matched
                  </div>
                  {activeChosenCompetitor && (
                    <div className="text-[11px] text-amber-300 font-mono mt-0.5">
                      Nearest Benchmark: <span className="font-semibold text-white">{activeChosenCompetitor.name}</span> ({activeChosenCompetitor.matchPercentage}% match)
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  Neon Persisted
                </span>
              </div>
            </div>

            {/* Apple Navigation Superpowers Guide */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-mono font-bold text-xs text-white flex-shrink-0">
                  ⌘K
                </div>
                <div>
                  <div className="font-semibold text-white">Spotlight Intelligence Search</div>
                  <div className="text-[11px] text-neutral-400">
                    Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">⌘K</kbd> / <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Ctrl+K</kbd> anywhere to search topics and trigger live SERP competitor analysis.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Competitor Benchmark Compare Engine</div>
                  <div className="text-[11px] text-neutral-400">
                    Benchmark keyword overlap, topic matrices, and semantic gaps against {activeChosenCompetitor?.name || 'top competitors'}.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Instant /boost Content Optimizer</div>
                  <div className="text-[11px] text-neutral-400">
                    Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">⌘Enter</kbd> / <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Ctrl+Enter</kbd> to run real-time AI content audit against competitor benchmarks.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isComputing}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm active:scale-98 disabled:opacity-50"
          >
            <span>
              {step === 1 && 'Analyze Domain'}
              {step === 2 && 'Confirm Competitor'}
              {step === 3 && 'Launch Workspace'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
