import { useEffect, useMemo, useState } from 'react'
import {
  fetchProfileTypes,
  firsFromProfiles,
  listProfiles,
  profilesForFir,
  type DatasetProfileType,
  type ProfileRef,
} from '../lib/vacsProfiles'
import { IconProfileGeo, IconProfileTabbed } from './Icons'

const LAST_FIR_KEY = 'vacs-profileeditor:lastDatasetFir'

function readLastFir(): string {
  try {
    return localStorage.getItem(LAST_FIR_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeLastFir(fir: string) {
  try {
    localStorage.setItem(LAST_FIR_KEY, fir)
  } catch {
    // ignore quota / private mode
  }
}

interface FloatingTooltip {
  text: string
  x: number
  y: number
}

function typeTooltipText(
  type: DatasetProfileType | null | undefined,
  loading?: boolean
): string {
  if (type === 'Geo') return 'Geo profile'
  if (type === 'Tabbed') return 'Tabbed profile'
  return loading ? 'Loading type…' : 'Unknown type'
}

function ProfileTypeIcon({
  type,
  loading,
  onShowTooltip,
  onHideTooltip,
}: {
  type: DatasetProfileType | null | undefined
  loading?: boolean
  onShowTooltip: (text: string, anchor: DOMRect) => void
  onHideTooltip: () => void
}) {
  const text = typeTooltipText(type, loading)
  const show = (el: HTMLElement) => onShowTooltip(text, el.getBoundingClientRect())

  const common = {
    className: `dataset-profile-type-icon${type == null ? ' dataset-profile-type-unknown' : ''}${loading ? ' loading' : ''}`,
    'aria-label': text,
    onMouseEnter: (e: React.MouseEvent<HTMLSpanElement>) => show(e.currentTarget),
    onMouseLeave: onHideTooltip,
    onFocus: (e: React.FocusEvent<HTMLSpanElement>) => show(e.currentTarget),
    onBlur: onHideTooltip,
  }

  if (type === 'Geo') {
    return (
      <span {...common} tabIndex={0}>
        <IconProfileGeo />
      </span>
    )
  }
  if (type === 'Tabbed') {
    return (
      <span {...common} tabIndex={0}>
        <IconProfileTabbed />
      </span>
    )
  }
  return (
    <span {...common} tabIndex={0}>
      {loading ? '…' : '?'}
    </span>
  )
}

interface LoadFromDatasetModalProps {
  onLoad: (ref: ProfileRef) => void
  onCancel: () => void
  loading?: boolean
  error?: string | null
}

export default function LoadFromDatasetModal({
  onLoad,
  onCancel,
  loading = false,
  error = null,
}: LoadFromDatasetModalProps) {
  const [profiles, setProfiles] = useState<ProfileRef[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [listing, setListing] = useState(true)
  const [fir, setFir] = useState('')
  const [fileName, setFileName] = useState('')
  const [search, setSearch] = useState('')
  const [typesByKey, setTypesByKey] = useState<Map<string, DatasetProfileType | null>>(new Map())
  const [typesLoading, setTypesLoading] = useState(false)
  const [tooltip, setTooltip] = useState<FloatingTooltip | null>(null)

  useEffect(() => {
    let cancelled = false
    setListing(true)
    setListError(null)
    listProfiles()
      .then((list) => {
        if (cancelled) return
        setProfiles(list)
        const firs = firsFromProfiles(list)
        if (firs.length === 0) return
        const remembered = readLastFir()
        const initialFir = remembered && firs.includes(remembered) ? remembered : firs[0]
        setFir(initialFir)
        const inFir = profilesForFir(list, initialFir)
        setFileName(inFir[0]?.fileName ?? '')
      })
      .catch((err) => {
        if (cancelled) return
        setListError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setListing(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const firs = useMemo(() => (profiles ? firsFromProfiles(profiles) : []), [profiles])
  const profilesInFir = useMemo(
    () => (profiles && fir ? profilesForFir(profiles, fir) : []),
    [profiles, fir]
  )

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profilesInFir
    return profilesInFir.filter((p) => {
      const key = `${p.fir}/${p.fileName}`
      const type = typesByKey.get(key)
      return (
        p.name.toLowerCase().includes(q) ||
        p.fileName.toLowerCase().includes(q) ||
        (type != null && type.toLowerCase().includes(q))
      )
    })
  }, [profilesInFir, search, typesByKey])

  useEffect(() => {
    if (profilesInFir.length === 0) return
    let cancelled = false
    setTypesLoading(true)
    fetchProfileTypes(profilesInFir)
      .then((map) => {
        if (cancelled) return
        setTypesByKey((prev) => {
          const next = new Map(prev)
          for (const [key, value] of map) next.set(key, value)
          return next
        })
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [profilesInFir])

  useEffect(() => {
    if (filteredProfiles.length === 0) return
    if (!filteredProfiles.some((p) => p.fileName === fileName)) {
      setFileName(filteredProfiles[0]!.fileName)
    }
  }, [filteredProfiles, fileName])

  const handleFirChange = (nextFir: string) => {
    setFir(nextFir)
    writeLastFir(nextFir)
    setSearch('')
    setTooltip(null)
    const inFir = profiles ? profilesForFir(profiles, nextFir) : []
    setFileName(inFir[0]?.fileName ?? '')
  }

  const showTooltip = (text: string, anchor: DOMRect) => {
    setTooltip({
      text,
      x: anchor.left + anchor.width / 2,
      y: anchor.top,
    })
  }

  const selected =
    filteredProfiles.find((p) => p.fileName === fileName) ??
    profilesInFir.find((p) => p.fileName === fileName) ??
    null

  const canLoad = selected != null && !loading && !listing

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="load-dataset-title">
      <div className="modal modal-load-dataset">
        <h2 id="load-dataset-title">Load from VACS dataset</h2>
        <p>Pick an FIR folder, then a profile from vacs-data.</p>

        {listing && <p className="modal-status">Loading profile list…</p>}
        {listError && (
          <p className="modal-status modal-status-error" role="alert">
            {listError}
          </p>
        )}

        {!listing && !listError && profiles && (
          <>
            <label>
              FIR
              <select
                value={fir}
                onChange={(e) => handleFirChange(e.target.value)}
                disabled={firs.length === 0 || loading}
              >
                {firs.length === 0 && <option value="">No FIRs found</option>}
                {firs.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Search
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name or type…"
                disabled={profilesInFir.length === 0 || loading}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="dataset-profile-field">
              <span className="dataset-profile-field-label" id="dataset-profile-label">
                Profile
              </span>
              {profilesInFir.length === 0 ? (
                <p className="modal-status">No profiles in this FIR</p>
              ) : filteredProfiles.length === 0 ? (
                <p className="modal-status">No profiles match “{search.trim()}”</p>
              ) : (
                <ul
                  className="dataset-profile-list"
                  role="listbox"
                  aria-labelledby="dataset-profile-label"
                  onScroll={() => setTooltip(null)}
                >
                  {filteredProfiles.map((p) => {
                    const key = `${p.fir}/${p.fileName}`
                    const type = typesByKey.get(key)
                    const missing = !typesByKey.has(key)
                    const isSelected = p.fileName === fileName
                    return (
                      <li key={p.fileName} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`dataset-profile-option${isSelected ? ' selected' : ''}`}
                          disabled={loading}
                          onClick={() => setFileName(p.fileName)}
                          onDoubleClick={() => {
                            if (!loading) onLoad(p)
                          }}
                        >
                          <ProfileTypeIcon
                            type={type}
                            loading={typesLoading && missing}
                            onShowTooltip={showTooltip}
                            onHideTooltip={() => setTooltip(null)}
                          />
                          <span className="dataset-profile-option-name">{p.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="modal-status modal-status-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button
            type="button"
            onClick={() => selected && onLoad(selected)}
            disabled={!canLoad}
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
      {tooltip && (
        <div
          className="dataset-floating-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
