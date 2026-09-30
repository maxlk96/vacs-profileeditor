/**
 * Discover and load tabbed profiles from vacs-project/vacs-data.
 * Profiles live at dataset/{FIR}/profiles/*.json.
 */

import { fetchRepoTree, rawDatasetUrl } from './vacsGithub'

export interface ProfileRef {
  fir: string
  /** File name including .json, e.g. LOWW_TWR.json */
  fileName: string
  /** Display name without extension */
  name: string
}

const PROFILE_PATH_RE = /^dataset\/([^/]+)\/profiles\/([^/]+\.json)$/

let listInflight: Promise<ProfileRef[]> | null = null
let listCached: ProfileRef[] | null = null

/**
 * List all profile JSON files in the dataset, sorted by FIR then name.
 * Concurrent callers share one request; result is cached until the page reloads.
 */
export function listProfiles(): Promise<ProfileRef[]> {
  if (listCached != null) return Promise.resolve(listCached)
  if (listInflight != null) return listInflight

  const p = (async (): Promise<ProfileRef[]> => {
    const tree = await fetchRepoTree()
    const refs: ProfileRef[] = []
    for (const entry of tree) {
      if (entry.type !== 'blob') continue
      const m = PROFILE_PATH_RE.exec(entry.path)
      if (!m) continue
      const fir = m[1]
      const fileName = m[2]
      refs.push({
        fir,
        fileName,
        name: fileName.replace(/\.json$/i, ''),
      })
    }
    refs.sort((a, b) => a.fir.localeCompare(b.fir) || a.name.localeCompare(b.name))
    listCached = refs
    return refs
  })()

  listInflight = p
  p.finally(() => {
    listInflight = null
  })
  return p
}

/** Unique FIR folder names that contain at least one profile, sorted. */
export function firsFromProfiles(profiles: ProfileRef[]): string[] {
  return Array.from(new Set(profiles.map((p) => p.fir))).sort((a, b) => a.localeCompare(b))
}

/** Profiles in a given FIR folder. */
export function profilesForFir(profiles: ProfileRef[], fir: string): ProfileRef[] {
  return profiles.filter((p) => p.fir === fir)
}

/**
 * Fetch raw profile JSON from the dataset.
 * Returns parsed JSON (caller should validate with validateProfile).
 */
export async function fetchProfileJson(ref: ProfileRef): Promise<unknown> {
  const url = rawDatasetUrl(ref.fir, 'profiles', ref.fileName)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}`)
  }
  return res.json()
}
