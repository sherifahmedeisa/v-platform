import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Download,
  Check,
  Cpu,
  FileText,
  Edit3,
  Search,
  ChevronDown,
  Loader2,
  FilePlus,
  FolderClosed,
  Compass,
  Plus,
  Activity,
  Trash2,
} from 'lucide-react'
import type { ScoreMetrics, Workspace } from '../types'
import { UserProfileMenu } from './UserProfileMenu'
import type { UserAccount } from '../services/api'

interface HeaderProps {
  query: string
  onQueryChange: (q: string) => void
  onNewResearch: () => void
  onFinishDraft: () => void
  scoreMetrics: ScoreMetrics
  targetScore: number
  models: string[]
  selectedModel: string
  onModelChange: (model: string) => void
  onTriggerBoost: () => void
  onExport: (format: 'markdown' | 'text' | 'html') => void
  onCopyMarkdown?: () => void
  isGenerating: boolean
  isResearching?: boolean
  researchProgress?: { percent: number; message: string } | null
  user: UserAccount | null
  documentsCount: number
  currentWorkspace?: Workspace | null
  workspaces?: Workspace[]
  onSelectWorkspace?: (ws: Workspace) => void
  onDeleteWorkspace?: (id: string) => void
  onOpenWebsiteAudit?: () => void
  onOpenCreateWorkspace?: () => void
  onOpenAuth: () => void
  onOpenProfile: () => void
  onOpenDocuments: () => void
  onOpenOnboarding?: () => void
  onNewBlankDocument?: () => void
  autoSaveStatus?: 'saved' | 'saving' | 'unsaved' | 'offline'
  onLogout: () => void
  onNavigateLanding?: () => void
  isModalOpen?: boolean
}

const isMacPlatform = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || navigator.platform || '')

export const Header: React.FC<HeaderProps> = ({
  query,
  onQueryChange,
  onNewResearch,
  onFinishDraft,
  scoreMetrics,
  targetScore,
  models,
  selectedModel,
  onModelChange,
  onTriggerBoost,
  onExport,
  onCopyMarkdown,
  isGenerating,
  isResearching,
  researchProgress,
  user,
  documentsCount,
  currentWorkspace,
  workspaces = [],
  onSelectWorkspace,
  onDeleteWorkspace,
  onOpenWebsiteAudit,
  onOpenCreateWorkspace,
  onOpenAuth,
  onOpenProfile,
  onOpenDocuments,
  onOpenOnboarding,
  onNewBlankDocument,
  autoSaveStatus = 'saved',
  onLogout,
  onNavigateLanding,
  isModalOpen = false,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleCopy = () => {
    if (onCopyMarkdown) {
      onCopyMarkdown()
    } else {
      onExport('markdown')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Spotlight bar keyboard shortcut (⌘K / Ctrl+K), suppressed when modals are open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setShowModelMenu(false)
      }
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setShowWorkspaceMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-16 border-b border-white/[0.08] bg-neutral-950/85 backdrop-blur-2xl px-5 flex items-center justify-between select-none z-30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      {/* Left: Brand, Apple Glass Workspace Capsule & Query Input */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        <button
          onClick={onNavigateLanding}
          className="flex items-center space-x-2 p-1.5 -m-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group text-left"
          title="Return to Landing Page"
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 group-hover:bg-white/20 text-white flex items-center justify-center font-bold text-base tracking-tight border border-white/15 shadow-inner font-mono transition-colors">
            V
          </div>
          <span className="font-semibold text-base tracking-tight text-white hidden sm:inline group-hover:text-neutral-200 transition-colors">
            Platform
          </span>
        </button>

        {onNavigateLanding && (
          <button
            onClick={onNavigateLanding}
            className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer"
            title="Switch to Landing Page"
          >
            <Compass className="w-3.5 h-3.5 text-neutral-400" />
            <span>Landing</span>
          </button>
        )}

        {/* Workspace Selector */}
        <div className="relative" ref={workspaceRef}>
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-white/[0.08] hover:border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all cursor-pointer group"
            title="Active Workspace & Website Domain Audit"
          >
            <span className="text-xs">🌐</span>
            <span className="text-xs font-semibold text-white tracking-tight">
              {currentWorkspace?.name || 'Workspace'}
            </span>
            <span className="text-neutral-500 text-xs">·</span>
            <span className="text-xs font-mono text-neutral-400 group-hover:text-neutral-200 transition-colors hidden md:inline">
              {currentWorkspace?.domain || 'Add Domain'}
            </span>
            {currentWorkspace?.overallScore !== undefined && (
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                {currentWorkspace.overallScore}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-neutral-900/95 border border-white/10 p-2.5 shadow-2xl backdrop-blur-2xl z-50 text-xs animate-in fade-in duration-150">
              {/* Header Active Workspace Card */}
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2 mb-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center space-x-1.5 truncate">
                    <span>🌐 {currentWorkspace?.name || 'Workspace'}</span>
                    <span className="text-[10px] font-mono text-neutral-400 truncate">
                      ({currentWorkspace?.domain || 'Add Domain'})
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-emerald-400 flex-shrink-0">
                    {currentWorkspace?.overallScore || 85}/100
                  </span>
                </div>

                {onOpenWebsiteAudit && (
                  <button
                    onClick={() => {
                      onOpenWebsiteAudit()
                      setShowWorkspaceMenu(false)
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs active:scale-98"
                  >
                    <Activity className="w-3.5 h-3.5 text-sky-600" />
                    <span>Website Audit & Competitor Match</span>
                  </button>
                )}
              </div>

              {/* Workspaces Switcher Section */}
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-neutral-400 font-semibold flex items-center justify-between">
                <span>Switch Workspace</span>
                <span>{workspaces?.length || 1} available</span>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(workspaces || []).map((ws) => (
                  <div
                    key={ws.id}
                    className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors group/item ${
                      currentWorkspace?.id === ws.id
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <button
                      onClick={() => {
                        if (onSelectWorkspace) onSelectWorkspace(ws)
                        setShowWorkspaceMenu(false)
                      }}
                      className="truncate flex items-center space-x-2 text-left flex-1 cursor-pointer"
                    >
                      <span className="text-xs">🌐</span>
                      <span className="font-semibold text-white">{ws.name}</span>
                      <span className="text-[10px] font-mono text-neutral-400 truncate">
                        {ws.domain}
                      </span>
                    </button>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="font-mono text-[10px] text-neutral-400">{ws.overallScore}</span>
                      {currentWorkspace?.id === ws.id && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                      {onDeleteWorkspace && workspaces.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteWorkspace(ws.id)
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1 text-neutral-500 hover:text-rose-400 rounded-md transition-all cursor-pointer"
                          title={`Delete workspace ${ws.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Create New Workspace Action */}
              {onOpenCreateWorkspace && (
                <div className="pt-2 mt-1 border-t border-white/[0.08]">
                  <button
                    onClick={() => {
                      onOpenCreateWorkspace()
                      setShowWorkspaceMenu(false)
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center space-x-2 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>+ New Website Workspace / Audit</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Apple Spotlight-Style Query Bar with ⌘K shortcut */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isResearching && !isGenerating) {
                onNewResearch()
              }
            }}
            placeholder="Target topic or keyword..."
            className="w-52 md:w-64 lg:w-72 bg-neutral-900/80 border border-white/[0.08] text-sm text-neutral-100 pl-10 pr-12 py-2 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all placeholder-neutral-500 font-sans shadow-inner"
          />
          <div className="absolute right-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-800/80 rounded border border-white/10">
              {isMacPlatform ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </div>
        </div>

        {/* Cupertino Primary Action Controls */}
        <div className="flex items-center space-x-2">
          {onNewBlankDocument && (
            <button
              onClick={onNewBlankDocument}
              className="flex items-center space-x-1.5 px-3 py-2 text-sm text-neutral-200 hover:text-white bg-neutral-900/70 hover:bg-neutral-800 border border-white/[0.08] rounded-xl transition-all cursor-pointer font-medium"
              title="Quick + New Document"
            >
              <FilePlus className="w-4 h-4 text-neutral-400" />
              <span className="hidden xl:inline">New</span>
            </button>
          )}

          <button
            onClick={onNewResearch}
            disabled={isGenerating || isResearching}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-sm text-neutral-200 hover:text-white bg-neutral-900/70 hover:bg-neutral-800 border border-white/[0.08] rounded-xl transition-all cursor-pointer disabled:opacity-40 font-medium"
            title="Generate SERP brief & outline"
          >
            {isResearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
            ) : (
              <FileText className="w-4 h-4 text-neutral-400" />
            )}
            <span className="hidden md:inline">
              {isResearching ? `${researchProgress?.percent || 0}%` : 'Research'}
            </span>
          </button>

          <button
            onClick={onFinishDraft}
            disabled={isGenerating || isResearching}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-sm text-neutral-200 hover:text-white bg-neutral-900/70 hover:bg-neutral-800 border border-white/[0.08] rounded-xl transition-all cursor-pointer disabled:opacity-40 font-medium"
            title="Finish draft using local Ollama"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
            ) : (
              <Edit3 className="w-4 h-4 text-neutral-400" />
            )}
            <span className="hidden md:inline">
              {isGenerating ? 'Drafting...' : 'Draft'}
            </span>
          </button>

          <button
            onClick={onTriggerBoost}
            disabled={isGenerating || isResearching}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white text-black hover:bg-neutral-200 text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            title="Audit and optimize draft with Ollama"
          >
            <Sparkles className="w-4 h-4" />
            <span>/boost</span>
          </button>
        </div>
      </div>

      {/* Center: Score Panel & Cloud Auto-Save Status */}
      <div className="hidden xl:flex items-center space-x-3.5">
        <div className="flex items-center space-x-4 px-4 py-2 rounded-xl bg-neutral-900/70 border border-white/[0.08] backdrop-blur-md">
          <div className="flex items-center space-x-2 font-mono">
            <span className="text-neutral-400 text-xs sm:text-sm font-sans">Score</span>
            <span className="text-white font-bold text-lg">{scoreMetrics.overall}</span>
            <span className="text-neutral-500 text-xs sm:text-sm">/{targetScore}</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center space-x-3.5 text-xs sm:text-sm font-mono text-neutral-300">
            <div>
              <span className="text-neutral-400 mr-1.5">SEO</span>
              <span className="text-neutral-100 font-semibold text-sm">{scoreMetrics.seo}</span>
            </div>
            <div>
              <span className="text-neutral-400 mr-1.5">GEO</span>
              <span className="text-neutral-100 font-semibold text-sm">{scoreMetrics.geo}</span>
            </div>
            <div>
              <span className="text-neutral-400 mr-1.5">AIO</span>
              <span className="text-neutral-100 font-semibold text-sm">{scoreMetrics.aio}</span>
            </div>
          </div>
        </div>

        {/* Cloud Auto-Save Status */}
        <div className="flex items-center space-x-1.5 text-xs font-mono text-neutral-400">
          {autoSaveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 text-neutral-400 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-neutral-400">
              {user?.profile?.preferences?.isGuest ? 'Local Saved' : 'Cloud Synced'}
            </span>
          )}
          {autoSaveStatus === 'unsaved' && (
            <span className="text-neutral-500">Unsaved</span>
          )}
          {autoSaveStatus === 'offline' && (
            <span className="text-neutral-500">Local Draft</span>
          )}
        </div>
      </div>

      {/* Right: Local Model, Export & Apple User Profile */}
      <div className="flex items-center space-x-2.5">
        {/* Model Selector Popover */}
        <div className="relative" ref={modelRef}>
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.08] rounded-xl text-xs text-neutral-200 transition-all cursor-pointer font-mono"
          >
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
            <span className="truncate max-w-[100px]">{selectedModel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {showModelMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-neutral-900/95 border border-white/10 py-1.5 shadow-2xl backdrop-blur-xl z-50 text-xs font-mono">
              <div className="px-3.5 py-1.5 text-[11px] text-neutral-400 uppercase font-sans font-semibold">
                Local Ollama Models
              </div>
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onModelChange(m)
                    setShowModelMenu(false)
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-white/[0.06] transition-colors cursor-pointer ${
                    selectedModel === m ? 'text-white font-medium bg-white/[0.04]' : 'text-neutral-300'
                  }`}
                >
                  <span className="truncate">{m}</span>
                  {selectedModel === m && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Popover */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.08] rounded-xl text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Export options"
          >
            <Download className="w-4 h-4" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-neutral-900/95 border border-white/10 py-1.5 shadow-2xl backdrop-blur-xl z-50 text-xs">
              <button
                onClick={() => {
                  handleCopy()
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-3.5 py-2 text-neutral-200 hover:text-white hover:bg-white/[0.06] flex items-center justify-between cursor-pointer"
              >
                <span>Copy Markdown</span>
                {copied && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <button
                onClick={() => {
                  onExport('markdown')
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-3.5 py-2 text-neutral-200 hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                Download .md
              </button>
              <button
                onClick={() => {
                  onExport('html')
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-3.5 py-2 text-neutral-200 hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                Download .html
              </button>
              <button
                onClick={() => {
                  onExport('text')
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-3.5 py-2 text-neutral-200 hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                Download .txt
              </button>
            </div>
          )}
        </div>

        {/* Apple Documents Drawer Slide-Out Toggle */}
        <button
          onClick={onOpenDocuments}
          className="flex items-center space-x-1.5 p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.08] rounded-xl text-neutral-300 hover:text-white transition-all cursor-pointer group"
          title={`Documents Drawer (${documentsCount} ${user?.profile?.preferences?.isGuest ? 'stored locally' : 'stored in Neon'})`}
        >
          <FolderClosed className="w-4 h-4" />
          {documentsCount > 0 && (
            <span className="text-[11px] font-mono text-neutral-400 group-hover:text-white font-medium">
              {documentsCount}
            </span>
          )}
        </button>

        {/* Workspace Tour Quick Guide Button */}
        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.08] rounded-xl text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Launch Workspace Tour & Onboarding Guide"
          >
            <Compass className="w-4 h-4 text-sky-400" />
          </button>
        )}

        <div className="h-5 w-px bg-white/10 mx-0.5" />

        {/* Apple User Profile Menu */}
        <UserProfileMenu
          user={user}
          documentsCount={documentsCount}
          onOpenAuth={onOpenAuth}
          onOpenProfile={onOpenProfile}
          onOpenDocuments={onOpenDocuments}
          onOpenOnboarding={onOpenOnboarding}
          onLogout={onLogout}
          onNavigateLanding={onNavigateLanding}
        />
      </div>
    </header>
  )
}
