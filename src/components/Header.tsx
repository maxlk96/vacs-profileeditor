import type { RefObject } from 'react'
import {
  VIEW_MODES,
  VIEW_MODE_LABELS,
  type ViewMode,
} from '../types'

interface HeaderProps {
  profileId: string
  onProfileIdChange: (id: string) => void
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  onNew: () => void
  onLoad: () => void
  onSaveAs: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const VIEW_MODE_HELP =
  'Page: Radio and Phone as full-size pages. Split: Phone tab, plus a Radio tab with the phone page beside it. Cycle: a Page button cycles radio, phone, and mixed views. Split and Cycle open mixed view (four key columns by default).'

export default function Header({
  profileId,
  onProfileIdChange,
  view,
  onViewChange,
  onNew,
  onLoad,
  onSaveAs,
  fileInputRef,
  onFileChange,
}: HeaderProps) {
  const showMixedViewHint = view === 'split' || view === 'cycle'

  return (
    <header className="app-header">
      <label>
        Profile ID
        <input
          type="text"
          value={profileId}
          onChange={(e) => onProfileIdChange(e.target.value)}
          placeholder="e.g. LOWW"
        />
      </label>
      <label title={VIEW_MODE_HELP}>
        View
        <select
          value={view}
          onChange={(e) => onViewChange(e.target.value as ViewMode)}
          aria-describedby={showMixedViewHint ? 'view-mode-hint' : undefined}
        >
          {VIEW_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {VIEW_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onNew}>
        New profile
      </button>
      <button type="button" onClick={onLoad}>
        Load JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={onFileChange}
        aria-hidden
      />
      <button type="button" onClick={onSaveAs}>
        Save as
      </button>
      {showMixedViewHint && (
        <p id="view-mode-hint" className="view-mode-hint">
          Mixed view defaults to four key columns; extra columns scroll horizontally.
        </p>
      )}
    </header>
  )
}
