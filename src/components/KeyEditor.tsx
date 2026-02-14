import type { RefObject } from 'react'
import type { DirectAccessKey } from '../types'
import { IconPlus, IconTrash, IconClear, IconChevronRightSmall } from './Icons'

interface KeyEditorProps {
  keyData: DirectAccessKey | null
  keyIndex: number | null
  selectedCount?: number
  stationIdInputRef?: RefObject<HTMLInputElement | null>
  onUpdateKey: (updater: (k: DirectAccessKey) => DirectAccessKey) => void
  onRemoveKey: () => void
  onGoToSubpage?: () => void
  onRemoveSubpage?: () => void
  hasSubpage: boolean
}

export default function KeyEditor({
  keyData,
  keyIndex,
  selectedCount = 1,
  stationIdInputRef,
  onUpdateKey,
  onRemoveKey,
  onGoToSubpage,
  onRemoveSubpage,
  hasSubpage,
}: KeyEditorProps) {
  if (keyData == null || keyIndex == null) {
    return (
      <section className="key-editor">
        <p className="key-editor-placeholder">Select a key (Ctrl+click for multiple)</p>
      </section>
    )
  }

  const label = keyData.label ?? []
  const line0 = label[0] ?? ''
  const line1 = label[1] ?? ''
  const line2 = label[2] ?? ''

  const setLabelLine = (index: number, value: string) => {
    const next = [...label]
    while (next.length <= index) next.push('')
    next[index] = value
    onUpdateKey((k) => ({ ...k, label: next.slice(0, 3) }))
  }

  return (
    <section className="key-editor">
      <h3>Key{selectedCount > 1 ? ` (${selectedCount} selected)` : ''}</h3>
      <label>
        Label line 1
        <input
          type="text"
          value={line0}
          onChange={(e) => setLabelLine(0, e.target.value)}
          placeholder="First line"
        />
      </label>
      <label>
        Label line 2
        <input
          type="text"
          value={line1}
          onChange={(e) => setLabelLine(1, e.target.value)}
          placeholder="Second line (optional)"
        />
      </label>
      <label>
        Label line 3
        <input
          type="text"
          value={line2}
          onChange={(e) => setLabelLine(2, e.target.value)}
          placeholder="Third line (optional)"
        />
      </label>
      <label>
        Station ID
        <input
          ref={stationIdInputRef}
          type="text"
          value={keyData.station_id ?? ''}
          onChange={(e) =>
            onUpdateKey((k) => ({
              ...k,
              station_id: e.target.value === '' ? undefined : e.target.value,
            }))
          }
          placeholder="e.g. LOWW_TWR"
        />
      </label>
      {hasSubpage ? (
        <div className="key-editor-subpage-actions">
          <button type="button" onClick={onGoToSubpage} className="key-editor-btn" title="Edit subpage" aria-label="Edit subpage">
            <IconChevronRightSmall />
            <span>Edit subpage</span>
          </button>
          <button type="button" onClick={onRemoveSubpage} className="key-editor-btn" title="Remove subpage" aria-label="Remove subpage">
            <IconTrash />
            <span>Remove subpage</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            onUpdateKey((k) => ({
              ...k,
              page: { rows: 4, keys: [] },
            }))
          }
          className="key-editor-btn"
          title="Add subpage"
          aria-label="Add subpage"
        >
          <IconPlus />
          <span>Add subpage</span>
        </button>
      )}
      <button type="button" onClick={() => onUpdateKey(() => ({ label: [] }))} className="key-editor-btn" title="Clear key" aria-label="Clear key">
        <IconClear />
        <span>Clear key</span>
      </button>
      <button type="button" onClick={onRemoveKey} className="key-editor-btn" title="Remove key" aria-label="Remove key">
        <IconTrash />
        <span>Remove key</span>
      </button>
    </section>
  )
}
