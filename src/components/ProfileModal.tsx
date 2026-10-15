import React, { useState, useEffect } from 'react'
import { X, User, Briefcase, FileText, Image, Check, Loader2, Database } from 'lucide-react'
import { profileApi, type UserAccount } from '../services/api'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserAccount | null
  onProfileUpdated: (updatedUser: UserAccount) => void
}

interface ProfileModalContentProps {
  onClose: () => void
  user: UserAccount
  onProfileUpdated: (updatedUser: UserAccount) => void
}

const ProfileModalContent: React.FC<ProfileModalContentProps> = ({
  onClose,
  user,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState(user.profile?.fullName || '')
  const [role, setRole] = useState(user.profile?.role || 'Content Architect')
  const [bio, setBio] = useState(user.profile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user.profile?.avatarUrl || '')
  const [autoSave, setAutoSave] = useState(user.profile?.preferences?.autoSave !== false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedSuccess(false)

    try {
      const updatedProfile = await profileApi.update({
        fullName,
        role,
        bio,
        avatarUrl: avatarUrl || undefined,
        preferences: { autoSave },
      })

      const updatedUser: UserAccount = {
        ...user,
        profile: updatedProfile,
      }
      onProfileUpdated(updatedUser)
      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        onClose()
      }, 900)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update profile settings.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-900/95 border border-white/10 shadow-2xl backdrop-blur-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Creator Profile</h2>
            <div className="flex items-center space-x-2 text-xs text-neutral-400">
              <span>{user.email}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-emerald-400 font-mono flex items-center space-x-1">
                <Database className="w-3 h-3 inline" />
                <span>{user.profile?.preferences?.isGuest ? 'Local Storage (Guest)' : 'Neon PostgreSQL'}</span>
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Role / Title
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Avatar Image URL
            </label>
            <div className="relative">
              <Image className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Creator Bio & Editorial Mandate
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Leading AI-first editorial research and generative search authority..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-neutral-200 block">
                {user.profile?.preferences?.isGuest ? 'Local Auto-Save' : 'Cloud Auto-Save'}
              </span>
              <span className="text-[11px] text-neutral-400 block">
                {user.profile?.preferences?.isGuest
                  ? 'Automatically save drafts to local storage'
                  : 'Automatically sync drafts to your Neon database table'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoSave(!autoSave)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                autoSave ? 'bg-white justify-end' : 'bg-neutral-800 justify-start'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform ${
                  autoSave ? 'bg-black' : 'bg-neutral-500'
                }`}
              />
            </button>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
}) => {
  if (!isOpen || !user) return null

  return (
    <ProfileModalContent
      onClose={onClose}
      user={user}
      onProfileUpdated={onProfileUpdated}
    />
  )
}
