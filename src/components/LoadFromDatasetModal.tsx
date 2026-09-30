import { useEffect, useMemo, useState } from 'react'
import {
  firsFromProfiles,
  listProfiles,
  profilesForFir,
  type ProfileRef,
} from '../lib/vacsProfiles'

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

  const handleFirChange = (nextFir: string) => {
    setFir(nextFir)
    writeLastFir(nextFir)
    const inFir = profiles ? profilesForFir(profiles, nextFir) : []
    setFileName(inFir[0]?.fileName ?? '')
  }

  const selected =
    profilesInFir.find((p) => p.fileName === fileName) ?? null

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
              Profile
              <select
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                disabled={profilesInFir.length === 0 || loading}
              >
                {profilesInFir.length === 0 && <option value="">No profiles in this FIR</option>}
                {profilesInFir.map((p) => (
                  <option key={p.fileName} value={p.fileName}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
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
    </div>
  )
}
