const iconProps = { width: 16, height: 16, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2 }

export function IconPlus() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" aria-hidden>
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

export function IconChevronUp() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10l4-4 4 4" />
    </svg>
  )
}

export function IconChevronDown() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

export function IconChevronLeft() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 4l-4 4 4 4" />
    </svg>
  )
}

export function IconChevronRight() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

export function IconCopy() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="9" height="9" rx="1" />
      <path d="M3 12V5a1 1 0 011-1h6" />
    </svg>
  )
}

export function IconCut() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="4" cy="5" r="2.5" />
      <circle cx="4" cy="11" r="2.5" />
      <path d="M6.5 6.5l6 6M6.5 9.5l6-6" />
    </svg>
  )
}

export function IconPaste() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="5" width="8" height="10" rx="1" />
      <path d="M5 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
    </svg>
  )
}

export function IconTrash() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v4M10 7v4M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1L12 4" />
    </svg>
  )
}

export function IconClear() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export function IconSubpage() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M6 8h4M8 6v4" />
    </svg>
  )
}

export function IconChevronRightSmall() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

export function IconUndo() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8h7a3 3 0 013 3v0M3 8l4-4M3 8l4 4" />
    </svg>
  )
}

export function IconRedo() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 8H6a3 3 0 00-3 3v0M13 8l-4-4M13 8l-4 4" />
    </svg>
  )
}

export function IconSwap() {
  return (
    <svg {...iconProps} viewBox="0 0 16 16" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4l3 3-3 3M5 12l-3-3 3-3" />
    </svg>
  )
}

