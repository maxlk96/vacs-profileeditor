import type { RefObject } from 'react'

interface HeaderProps {
  profileId: string
  onProfileIdChange: (id: string) => void
  onNew: () => void
  onLoad: () => void
  onSaveAs: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function Header({
  profileId,
  onProfileIdChange,
  onNew,
  onLoad,
  onSaveAs,
  fileInputRef,
  onFileChange,
}: HeaderProps) {
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
    </header>
  )
}
