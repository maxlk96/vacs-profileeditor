/**
 * Load station IDs from MorpheusXAUT/vacs-data dataset on GitHub.
 * Discovers all FIRs dynamically; supports stations.toml and stations.json.
 * Extracts station `id`, `fir`, `parent_id`, and `controlled_by` (for tooltips).
 */

const API_BASE = 'https://api.github.com/repos/MorpheusXAUT/vacs-data/contents/dataset'
const RAW_BASE = 'https://raw.githubusercontent.com/MorpheusXAUT/vacs-data/main/dataset'
const REF = 'ref=main'

export interface StationEntry {
  id: string
  fir: string
  /** Parent station ID for coverage inheritance (for tooltips). */
  parent_id?: string
  /** Station IDs that control this station (for tooltips). */
  controlled_by?: string[]
}

/** List FIR names by listing the dataset directory (only type === "dir"). */
async function discoverFirs(): Promise<string[]> {
  const res = await fetch(`${API_BASE}?${REF}`)
  if (!res.ok) throw new Error(`Failed to list dataset: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data
    .filter((item: { type?: string }) => item.type === 'dir')
    .map((item: { name: string }) => item.name)
    .filter((name: string) => name.length > 0)
}

/** List files in a FIR directory; return 'stations.toml' or 'stations.json' if present (toml preferred). */
async function getStationsFileName(fir: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(fir)}?${REF}`)
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data)) return null
  const names = data.map((item: { name: string }) => item.name)
  if (names.includes('stations.toml')) return 'stations.toml'
  if (names.includes('stations.json')) return 'stations.json'
  return null
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

/** Load stations for one FIR: fetch only the stations file that exists (toml or json). */
async function loadStationsForFir(fir: string): Promise<StationEntry[]> {
  const fileName = await getStationsFileName(fir)
  if (fileName == null) return []

  const url = `${RAW_BASE}/${encodeURIComponent(fir)}/${fileName}`
  const res = await fetch(url)
  if (!res.ok) return []

  const text = await res.text()
  const isJson = fileName.endsWith('.json')
  const entries = isJson ? parseJsonStations(JSON.parse(text)) : parseTomlStations(text)
  return entries.map((e) => ({
    id: e.id,
    fir,
    parent_id: e.parent_id,
    controlled_by: e.controlled_by?.length ? e.controlled_by : undefined,
  }))
}

let cached: Promise<StationEntry[]> | null = null

/**
 * Load all stations from the vacs-data dataset: discover FIRs, then for each
 * load stations.toml or stations.json and extract only station id.
 * Result is deduplicated by id (first FIR wins), sorted by id.
 * Repeated calls return the same promise until load completes (no in-memory cache after).
 */
export function loadStations(): Promise<StationEntry[]> {
  if (cached != null) return cached
  const p = (async (): Promise<StationEntry[]> => {
    const firs = await discoverFirs()
    const byId = new Map<string, StationEntry>()
    await Promise.all(
      firs.map(async (fir) => {
        try {
          const entries = await loadStationsForFir(fir)
          for (const e of entries) if (!byId.has(e.id)) byId.set(e.id, e)
        } catch {
          // skip this FIR
        }
      })
    )
    const list = Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id))
    return list
  })()
  cached = p
  p.finally(() => { cached = null })
  return p
}
