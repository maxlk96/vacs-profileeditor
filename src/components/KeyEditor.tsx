import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import type { DirectAccessKey } from '../types'
import type { StationEntry } from '../lib/vacsStations'
import {
  normalizeStationIdForMatch,
  getMatchTokens,
  stationIdMatchesTokens,
} from '../lib/stationIdMatch'
import { IconPlus, IconTrash, IconClear, IconChevronRightSmall } from './Icons'

interface KeyEditorProps {
  keyData: DirectAccessKey | null
  keyIndex: number | null
  selectedCount?: number
  stationIdInputRef?: RefObject<HTMLInputElement | null>
  stations?: StationEntry[] | null
  stationIdsLoadError?: string | null
  stationIdsLoading?: boolean
  onLoadStations?: () => void
  onUpdateKey: (updater: (k: DirectAccessKey) => DirectAccessKey) => void
  onRemoveKey: () => void
  onGoToSubpage?: () => void
  onRemoveSubpage?: () => void
  hasSubpage: boolean
}

const SUGGESTIONS_MAX = 40
const BLUR_DELAY_MS = 150

export default function KeyEditor({
  keyData,
  keyIndex,
  selectedCount = 1,
  stationIdInputRef,
  stations = null,
  stationIdsLoadError = null,
  stationIdsLoading = false,
  onLoadStations,
  onUpdateKey,
  onRemoveKey,
  onGoToSubpage,
  onRemoveSubpage,
  hasSubpage,
}: KeyEditorProps) {
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const suggestionListRef = useRef<HTMLUListElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stationId = keyData?.station_id ?? ''
  const matchTokens = getMatchTokens(stationId)
  const suggestions = (stations ?? []).filter((s) =>
    stationIdMatchesTokens(normalizeStationIdForMatch(s.id), matchTokens)
  ).slice(0, SUGGESTIONS_MAX)
  const showSuggestions = suggestionOpen && stationId.length > 0 && suggestions.length > 0

  const closeSuggestions = useCallback(() => {
    setSuggestionOpen(false)
    setHighlightIndex(0)
  }, [])

  const selectSuggestion = useCallback(
    (entry: StationEntry) => {
      onUpdateKey((k) => ({ ...k, station_id: entry.id }))
      closeSuggestions()
    },
    [onUpdateKey, closeSuggestions]
  )

  useEffect(() => {
    if (!showSuggestions) setHighlightIndex(0)
    else setHighlightIndex((i) => Math.min(i, suggestions.length - 1))
  }, [showSuggestions, suggestions.length])

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current != null) clearTimeout(blurTimeoutRef.current)
    }
  }, [])

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

  const hasStations = stations != null && stations.length > 0
  const exactMatch = hasStations && stations.some((s) => s.id === stationId)
  const stationExists = stationId === '' || exactMatch

  const onStationIdFocus = () => {
    if (blurTimeoutRef.current != null) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    if (stationId.length > 0 && (stations ?? []).length > 0) setSuggestionOpen(true)
  }
  const onStationIdBlur = () => {
    blurTimeoutRef.current = setTimeout(() => closeSuggestions(), BLUR_DELAY_MS)
  }
  const onStationIdChange = (value: string) => {
    onUpdateKey((k) => ({
      ...k,
      station_id: value === '' ? undefined : value,
    }))
    setSuggestionOpen(true)
    setHighlightIndex(0)
  }
  const onStationIdKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'ArrowDown' || e.key === 'Escape') setSuggestionOpen(false)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSuggestions()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i + 1) % suggestions.length)
      suggestionListRef.current?.querySelector('[data-highlight="true"]')?.scrollIntoView({ block: 'nearest' })
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
      suggestionListRef.current?.querySelector('[data-highlight="true"]')?.scrollIntoView({ block: 'nearest' })
      return
    }
    if (e.key === 'Enter' && suggestions[highlightIndex]) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightIndex])
    }
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
      <div className="station-id-field">
        <label className="station-id-label">
          Station ID
          <button
            type="button"
            className="station-id-load-btn"
            onClick={onLoadStations}
            disabled={stationIdsLoading}
            title="Reload station list from GitHub dataset"
            aria-label="Reload GitHub Dataset"
          >
            {stationIdsLoading ? 'Loading…' : 'Reload GitHub Dataset'}
          </button>
        </label>
        {stationIdsLoadError != null && (
          <p className="station-id-load-error" role="alert">
            {stationIdsLoadError}
          </p>
        )}
        <div className="station-id-input-wrap">
          <input
            ref={stationIdInputRef}
            type="text"
            value={stationId}
            onChange={(e) => onStationIdChange(e.target.value)}
            onFocus={onStationIdFocus}
            onBlur={onStationIdBlur}
            onKeyDown={onStationIdKeyDown}
            placeholder="e.g. LOWW_TWR"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? 'station-id-suggestions' : undefined}
          />
          {showSuggestions && (
            <ul
              id="station-id-suggestions"
              ref={suggestionListRef}
              className="station-id-suggestions"
              role="listbox"
            >
              {suggestions.map((entry, i) => (
                <li
                  key={`${entry.fir}-${entry.id}`}
                  role="option"
                  data-highlight={i === highlightIndex}
                  className={i === highlightIndex ? 'station-id-suggestion highlighted' : 'station-id-suggestion'}
                  title={
                    entry.controlled_by?.length
                      ? `Controlled by:\n${entry.controlled_by.join('\n')}`
                      : undefined
                  }
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectSuggestion(entry)
                  }}
                >
                  <span className="station-id-suggestion-id">{entry.id}</span>
                  <span className="station-id-suggestion-fir">({entry.fir})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {stationId.length > 0 && stations != null && stations.length > 0 && !stationExists && (
          <p className="station-id-unknown" role="status">
            Station ID not found in VACS dataset
          </p>
        )}
      </div>
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
