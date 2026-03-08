/**
 * Load station IDs from vacs-project/vacs-data dataset on GitHub.
 * Discovers all FIRs dynamically; supports stations.toml and stations.json.
 * Extracts station `id`, `fir`, `parent_id`, and `controlled_by` (for tooltips).
 *
 * Uses a single GitHub API call (recursive tree) to discover all station files,
 * then fetches raw content from raw.githubusercontent.com (not rate-limited).
 */

const TREE_API = 'https://api.github.com/repos/vacs-project/vacs-data/git/trees/main?recursive=1'
const RAW_BASE = 'https://raw.githubusercontent.com/vacs-project/vacs-data/main/dataset'

/** Optional token for higher GitHub API rate limits (5k/hr vs 60/hr). Set VITE_GITHUB_TOKEN in .env.local */
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined

function apiHeaders(): HeadersInit {
  const h: HeadersInit = { Accept: 'application/vnd.github.v3+json' }
  if (GITHUB_TOKEN) (h as Record<string, string>)['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  return h
}

export interface StationEntry {
  id: string
  fir: string
  /** Parent station ID for coverage inheritance (for tooltips). */
  parent_id?: string
  /** Station IDs that control this station (for tooltips). */
  controlled_by?: string[]
}

interface StationFileRef {
  fir: string
  fileName: string
}

/**
 * Discover all station files in a single API call using the Git Trees API (recursive).
 * Returns a list of { fir, fileName } for each dataset/{fir}/stations.toml or stations.json found.
 * When both toml and json exist for the same FIR, toml is preferred.
 */
async function discoverStationFiles(): Promise<StationFileRef[]> {
  const res = await fetch(TREE_API, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`Failed to fetch repo tree: ${res.status} ${res.statusText}`)
  const data = await res.json()
  const tree: { path: string; type: string }[] = data.tree ?? []

  // Match paths like "dataset/{FIR}/stations.toml" or "dataset/{FIR}/stations.json"
  const stationFileRe = /^dataset\/([^/]+)\/(stations\.(?:toml|json))$/
  const byFir = new Map<string, StationFileRef>()

  for (const entry of tree) {
    if (entry.type !== 'blob') continue
    const m = stationFileRe.exec(entry.path)
    if (!m) continue
    const fir = m[1]
    const fileName = m[2]
    const existing = byFir.get(fir)
    // Prefer toml over json
    if (!existing || (existing.fileName.endsWith('.json') && fileName.endsWith('.toml'))) {
      byFir.set(fir, { fir, fileName })
    }
  }

  return Array.from(byFir.values())
}

/** Parse TOML: extract id, parent_id, and controlled_by for each [[stations]] block. */
function parseTomlStations(text: string): { id: string; parent_id?: string; controlled_by: string[] }[] {
  const result: { id: string; parent_id?: string; controlled_by: string[] }[] = []
  const blockRe = /\[\[stations\]\]\s*([\s\S]*?)(?=\[\[stations\]\]|$)/g
  let block: RegExpExecArray | null
  while ((block = blockRe.exec(text)) !== null) {
    const section = block[1]
    const idM = /id\s*=\s*"([^"]+)"/.exec(section)
    if (!idM) continue
    const parentIdM = /parent_id\s*=\s*["']([^"']*)["']/.exec(section)
    const parent_id = parentIdM?.[1] ? parentIdM[1].trim() || undefined : undefined
    const controlledBy: string[] = []
    const arrayMatch = /controlled_by\s*=\s*\[([\s\S]*?)\]/m.exec(section)
    if (arrayMatch) {
      const quotedRe = /"([^"]+)"/g
      let q: RegExpExecArray | null
      while ((q = quotedRe.exec(arrayMatch[1])) !== null) controlledBy.push(q[1])
    }
    result.push({ id: idM[1], parent_id, controlled_by: controlledBy })
  }
  return result
}

/** Parse JSON station file: array of { id, parent_id?, controlled_by? } or { stations: [...] }. */
function parseJsonStations(data: unknown): { id: string; parent_id?: string; controlled_by: string[] }[] {
  const result: { id: string; parent_id?: string; controlled_by: string[] }[] = []
  let arr: unknown[] = []
  if (Array.isArray(data)) arr = data
  else if (data != null && typeof data === 'object' && Array.isArray((data as { stations?: unknown[] }).stations))
    arr = (data as { stations: unknown[] }).stations
  for (const item of arr) {
    if (item == null || typeof item !== 'object' || typeof (item as { id?: string }).id !== 'string') continue
    const obj = item as { id: string; parent_id?: unknown; controlled_by?: unknown }
    const parent_id = typeof obj.parent_id === 'string' ? obj.parent_id : undefined
    const controlled_by = Array.isArray(obj.controlled_by)
      ? obj.controlled_by.filter((x): x is string => typeof x === 'string')
      : []
    result.push({ id: obj.id, parent_id, controlled_by })
  }
  return result
}

/** Fetch and parse stations for one FIR given the already-known file name (no API call). */
async function fetchStationsForFir(ref: StationFileRef): Promise<StationEntry[]> {
  const url = `${RAW_BASE}/${encodeURIComponent(ref.fir)}/${ref.fileName}`
  const res = await fetch(url)
  if (!res.ok) return []

  const text = await res.text()
  const isJson = ref.fileName.endsWith('.json')
  const entries = isJson ? parseJsonStations(JSON.parse(text)) : parseTomlStations(text)
  return entries.map((e) => ({
    id: e.id,
    fir: ref.fir,
    parent_id: e.parent_id,
    controlled_by: e.controlled_by?.length ? e.controlled_by : undefined,
  }))
}

let inflight: Promise<StationEntry[]> | null = null

/**
 * Load all stations from the vacs-data dataset.
 * Makes exactly ONE GitHub API call (recursive tree) to discover all station files,
 * then fetches raw content files from raw.githubusercontent.com (not rate-limited).
 * Result is deduplicated by id (first FIR wins), sorted by id.
 * Concurrent calls share the same in-flight promise; result is NOT cached after completion.
 */
export function loadStations(): Promise<StationEntry[]> {
  if (inflight != null) return inflight
  const p = (async (): Promise<StationEntry[]> => {
    const stationFiles = await discoverStationFiles()
    const byId = new Map<string, StationEntry>()
    await Promise.all(
      stationFiles.map(async (ref) => {
        try {
          const entries = await fetchStationsForFir(ref)
          for (const e of entries) if (!byId.has(e.id)) byId.set(e.id, e)
        } catch {
          // skip this FIR
        }
      })
    )
    const list = Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id))
    return list
  })()
  inflight = p
  p.finally(() => { inflight = null })
  return p
}
