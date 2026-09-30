/**
 * Discover and load profiles from vacs-project/vacs-data.
 * Profiles live at dataset/{FIR}/profiles/*.json.
 */

import { fetchRepoTree, rawDatasetUrl } from './vacsGithub'

export type DatasetProfileType = 'Tabbed' | 'Geo'

export interface ProfileRef {
  fir: string
  /** File name including .json, e.g. LOWW_TWR.json */
  fileName: string
  /** Display name without extension */
  name: string
}

const PROFILE_PATH_RE = /^dataset\/([^/]+)\/profiles\/([^/]+\.json)$/
const PROFILE_TYPE_RE = /"type"\s*:\s*"(Tabbed|Geo)"/

let listInflight: Promise<ProfileRef[]> | null = null
let listCached: ProfileRef[] | null = null
const typeCache = new Map<string, DatasetProfileType | null>()
const typeInflight = new Map<string, Promise<DatasetProfileType | null>>()

function typeCacheKey(ref: ProfileRef): string {
  return `${ref.fir}/${ref.fileName}`
}

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
 * Read the profile `type` field from the dataset file (cached).
 * Uses a light text scan so large Geo profiles are not fully parsed.
 */
export function fetchProfileType(ref: ProfileRef): Promise<DatasetProfileType | null> {
  const key = typeCacheKey(ref)
  if (typeCache.has(key)) return Promise.resolve(typeCache.get(key) ?? null)
  const existing = typeInflight.get(key)
  if (existing) return existing

  const p = (async (): Promise<DatasetProfileType | null> => {
    try {
      const url = rawDatasetUrl(ref.fir, 'profiles', ref.fileName)
      const res = await fetch(url)
      if (!res.ok) {
        typeCache.set(key, null)
        return null
      }
      const text = await res.text()
      const m = PROFILE_TYPE_RE.exec(text)
      const type = m?.[1] === 'Tabbed' || m?.[1] === 'Geo' ? m[1] : null
      typeCache.set(key, type)
      return type
    } catch {
      typeCache.set(key, null)
      return null
    } finally {
      typeInflight.delete(key)
    }
  })()

  typeInflight.set(key, p)
  return p
}

/** Resolve types for many refs; returns a map keyed by `fir/fileName`. */
export async function fetchProfileTypes(
  refs: ProfileRef[]
): Promise<Map<string, DatasetProfileType | null>> {
  const entries = await Promise.all(
    refs.map(async (ref) => [typeCacheKey(ref), await fetchProfileType(ref)] as const)
  )
  return new Map(entries)
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
