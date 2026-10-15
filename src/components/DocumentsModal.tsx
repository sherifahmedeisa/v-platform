import React, { useState, useEffect } from 'react'
import {
  X,
  FolderClosed,
  FilePlus,
  Trash2,
  ExternalLink,
  Search,
  Clock,
  Database,
  Loader2,
  Save,
} from 'lucide-react'
import { authApi, type UserDocument } from '../services/api'

interface DocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  documents: UserDocument[]
  loading: boolean
  currentDocId: string | null
  onOpenDocument: (doc: UserDocument) => void
  onSaveCurrentDraft: () => Promise<void>
  onNewBlankDocument: () => void
  onDeleteDocument: (id: string) => Promise<void>
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = Date.now()
    const diffMs = now - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

export const DocumentsModal: React.FC<DocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  loading,
  currentDocId,
  onOpenDocument,
  onSaveCurrentDraft,
  onNewBlankDocument,
  onDeleteDocument,
}) => {
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.query.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaveCurrent = async () => {
    setActionLoading(true)
    try {
      await onSaveCurrentDraft()
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const targetStorage = authApi.isGuestSession() ? 'local storage' : 'Neon PostgreSQL'
    if (!window.confirm(`Are you sure you want to delete this document from ${targetStorage}?`)) {
      return
    }
    setDeletingId(id)
    try {
      await onDeleteDocument(id)
    } finally {
      setDeletingId(null)
    }
  }


  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-md flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <aside
        className="relative w-full max-w-xl h-full bg-neutral-950/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
              <FolderClosed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Saved Documents & Research
              </h2>
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <span className="text-emerald-400 font-mono flex items-center space-x-1">
                  <Database className="w-3 h-3 inline" />
                  <span>
                    {authApi.isGuestSession() ? 'Local storage persistence' : 'Neon PostgreSQL persistence'}
                  </span>
                </span>
                <span>•</span>
                <span>{documents.length} drafts stored</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveCurrent}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Save current editor text as draft"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Current Draft</span>
            </button>

            <button
              onClick={() => {
                onNewBlankDocument()
                onClose()
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-all cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>New Document</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-white/[0.08] bg-neutral-950/40 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts by title or target query..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 font-sans"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span>Loading drafts from Neon PostgreSQL...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              <p>No documents found matching your filter.</p>
              <p className="mt-1 text-neutral-400">Click &ldquo;Save Current Draft&rdquo; to store your article.</p>
            </div>
          ) : (
            filtered.map((doc) => {
              const isCurrent = doc.id === currentDocId
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onOpenDocument(doc)
                    onClose()
                  }}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? 'bg-white/[0.08] border-white/30 shadow-md'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-neutral-100 group-hover:text-white truncate">
                        {doc.title || 'Untitled Document'}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-white font-mono font-semibold">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 mt-1 text-xs text-neutral-400">
                      <span className="truncate max-w-[200px]">Query: {doc.query}</span>
                      <span>•</span>
                      <span className="font-mono">{doc.wordCount || 0} words</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        <span>{formatRelativeTime(doc.updatedAt)}</span>
                      </span>
                    </div>

                    {/* Score indicators */}
                    <div className="flex items-center space-x-3 mt-2 font-mono text-[11px] text-neutral-400">
                      <span>SEO: <span className="text-neutral-200">{doc.seoScore}</span></span>
                      <span>·</span>
                      <span>GEO: <span className="text-neutral-200">{doc.geoScore}</span></span>
                      <span>·</span>
                      <span>AIO: <span className="text-neutral-200">{doc.aioScore}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        onOpenDocument(doc)
                        onClose()
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Open draft"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete draft"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>
    </div>
  )
}
