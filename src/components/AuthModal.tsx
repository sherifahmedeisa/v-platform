import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, User, Briefcase, Loader2, AlertCircle, Compass } from 'lucide-react'
import { authApi, type UserAccount } from '../services/api'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: UserAccount, isNewUser?: boolean) => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Content Architect')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOfflineSuggested, setIsOfflineSuggested] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsOfflineSuggested(false)
    setLoading(true)

    try {
      if (mode === 'login') {
        const session = await authApi.login(email, password)
        onSuccess(session.user, false)
        onClose()
      } else {
        const session = await authApi.register(email, password, fullName, role)
        onSuccess(session.user, true)
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication request failed.'
      const isNetworkIssue =
        msg.includes('Failed to fetch') ||
        msg.includes('Load failed') ||
        msg.includes('NetworkError') ||
        msg.toLowerCase().includes('network') ||
        msg.includes('500') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('404') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('offline') ||
        msg.toLowerCase().includes('unreachable')

      if (isNetworkIssue) {
        setError('Backend service is currently offline or unreachable. You can continue instantly in Local Creator Mode.')
        setIsOfflineSuggested(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOfflineCreatorContinue = () => {
    const session = authApi.createLocalSession(
      email || 'creator@vplatform.ai',
      fullName.trim() || undefined,
      role || undefined
    )
    const isNew = !localStorage.getItem('v_platform_onboarded')
    onSuccess(session.user, isNew)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-900/95 border border-white/10 shadow-2xl backdrop-blur-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/10 shadow-inner mb-3">
            <span className="font-mono text-xl font-bold text-white">V</span>
          </div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            {mode === 'login' ? 'Sign in to V Platform' : 'Create Creator Profile'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Persisted securely on Neon PostgreSQL with offline fallback.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-white/[0.06] p-1 mb-5 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
              setIsOfflineSuggested(false)
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-black shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError(null)
              setIsOfflineSuggested(false)
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-black shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Create Profile
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex flex-col space-y-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {isOfflineSuggested && (
              <button
                type="button"
                onClick={handleOfflineCreatorContinue}
                className="mt-1 py-1.5 px-3 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg text-xs font-medium transition-colors text-left flex items-center space-x-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Continue as Local Creator ({fullName.trim() || 'Sherif'}) &rarr;</span>
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Creator"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Specialty Role
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
                  >
                    <option value="Content Architect">Content Architect</option>
                    <option value="Lead GEO Strategist">Lead GEO Strategist</option>
                    <option value="Technical SEO Specialist">Technical SEO Specialist</option>
                    <option value="AI Content Researcher">AI Content Researcher</option>
                    <option value="Managing Editor">Managing Editor</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-xs active:scale-98"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{mode === 'login' ? 'Sign In to Neon Account' : 'Create Profile'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
