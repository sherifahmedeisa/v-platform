import React from 'react'

interface SegmentItem<T extends string = string> {
  id: T
  label: React.ReactNode
  icon?: React.ReactNode
  count?: number
}

interface SegmentedControlProps<T extends string = string> {
  items: SegmentItem<T>[]
  activeId: T
  onChange: (id: T) => void
  size?: 'xs' | 'sm' | 'md'
  className?: string
  fullWidth?: boolean
}

export function SegmentedControl<T extends string = string>({
  items,
  activeId,
  onChange,
  size = 'sm',
  className = '',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    xs: 'p-1 text-xs sm:text-sm',
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-sm sm:text-base',
  }

  const itemSizeClasses = {
    xs: 'px-2.5 py-1',
    sm: 'px-3.5 py-1.5',
    md: 'px-4 py-2',
  }

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % items.length
      onChange(items[nextIndex].id)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + items.length) % items.length
      onChange(items[prevIndex].id)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(items[0].id)
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(items[items.length - 1].id)
    }
  }

  return (
    <div
      role="tablist"
      className={`inline-flex items-center rounded-xl bg-neutral-900/80 p-0.5 border border-white/[0.08] backdrop-blur-md transition-colors select-none ${sizeClasses[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {items.map((item, index) => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              fullWidth ? 'flex-1' : ''
            } ${itemSizeClasses[size]} ${
              isActive
                ? 'bg-neutral-800 text-white shadow-xs border border-white/[0.08]'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            {item.icon && <span className="opacity-80 flex-shrink-0">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className={`text-xs tabular-nums font-mono ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-neutral-400'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
