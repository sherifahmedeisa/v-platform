import React, { useState, useRef, useEffect } from 'react'
import {
  User as UserIcon,
  FolderClosed,
  Settings,
  LogOut,
  ChevronDown,
  Database,
  Users,
  Compass,
} from 'lucide-react'
import type { UserAccount } from '../services/api'

interface UserProfileMenuProps {
  user: UserAccount | null
  documentsCount: number
  onOpenAuth: () => void
  onOpenProfile: () => void
  onOpenDocuments: () => void
  onOpenOnboarding?: () => void
  onLogout: () => void
  onNavigateLanding?: () => void
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  documentsCount,
  onOpenAuth,
  onOpenProfile,
  onOpenDocuments,
  onOpenOnboarding,
  onLogout,
  onNavigateLanding,
}) => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center space-x-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 rounded-xl text-sm font-medium text-white transition-all cursor-pointer shadow-xs active:scale-98"
      >
        <UserIcon className="w-4 h-4 text-neutral-300" />
        <span>Sign In</span>
      </button>
    )
  }

  const fullName = user.profile?.fullName || user.email.split('@')[0]
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const role = user.profile?.role || 'Content Architect'

  return (
    <div className="relative" ref={menuRef}>
      {/* Apple-style Profile Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/90 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group active:scale-98"
      >
        <div className="relative">
          {user.profile?.avatarUrl ? (
            <img
              src={user.profile.avatarUrl}
              alt={fullName}
              className="w-7 h-7 rounded-lg object-cover border border-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/80 via-purple-500/80 to-pink-500/80 text-white flex items-center justify-center font-semibold text-xs tracking-tight shadow-inner">
              {initials}
            </div>
          )}
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-medium text-neutral-200 group-hover:text-white truncate max-w-[110px] leading-tight">
            {fullName}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono leading-tight truncate max-w-[110px]">
            {role}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200 transition-transform duration-200" />
      </button>

      {/* Popover Card */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-neutral-950/95 border border-white/10 shadow-2xl backdrop-blur-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Card */}
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-sm text-white truncate">{fullName}</div>
                <div className="text-xs text-neutral-400 truncate">{user.email}</div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  {role}
                </div>
              </div>
            </div>

            {/* DB status */}
            <div className="mt-3 flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-300 font-mono">
              <div className="flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-neutral-400" />
                <span>{user.profile?.preferences?.isGuest ? 'Demo / Offline' : 'Neon PostgreSQL'}</span>
              </div>
              <span className="text-emerald-400">
                {user.profile?.preferences?.isGuest ? 'Guest' : 'Connected'}
              </span>
            </div>
          </div>

          {/* Action List */}
          <div className="py-1 text-sm text-neutral-200">
            {onOpenOnboarding && (
              <button
                onClick={() => {
                  setOpen(false)
                  onOpenOnboarding()
                }}
                className="w-full px-4 py-2 flex items-center space-x-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
              >
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Workspace Tour & Guide</span>
              </button>
            )}

            {onNavigateLanding && (
              <button
                onClick={() => {
                  setOpen(false)
                  onNavigateLanding()
                }}
                className="w-full px-4 py-2 flex items-center space-x-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
              >
                <Compass className="w-4 h-4 text-purple-400" />
                <span>Landing Page</span>
              </button>
            )}

            <button
              onClick={() => {
                setOpen(false)
                onOpenDocuments()
              }}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center space-x-2.5">
                <FolderClosed className="w-4 h-4 text-neutral-400" />
                <span>Saved Documents</span>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                {documentsCount}
              </span>
            </button>

            <button
              onClick={() => {
                setOpen(false)
                onOpenProfile()
              }}
              className="w-full px-4 py-2 flex items-center space-x-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-neutral-400" />
              <span>Profile Settings</span>
            </button>

            <button
              onClick={() => {
                setOpen(false)
                onOpenAuth()
              }}
              className="w-full px-4 py-2 flex items-center space-x-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
            >
              <Users className="w-4 h-4 text-neutral-400" />
              <span>Switch Profile</span>
            </button>
          </div>

          <div className="border-t border-white/[0.08] pt-1">
            <button
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="w-full px-4 py-2 flex items-center space-x-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer text-left text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
