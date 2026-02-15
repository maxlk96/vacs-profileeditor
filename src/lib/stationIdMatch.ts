import type { StationEntry } from './vacsStations'

/** Normalize for flexible matching: strip spaces/underscores, lowercase. e.g. "EPWW F" -> "epwwf" */
export function normalizeStationIdForMatch(s: string): string {
  return s.replace(/[\s_]+/g, '').toLowerCase()
}

/**
 * Get match tokens from input so "EPWW HIGH" or "EPWWHIGH" both match stations containing EPWW and HIGH.
 * Splits on spaces/underscores; if one token and length >= 6, split into prefix (4 chars) + rest.
 */
export function getMatchTokens(input: string): string[] {
  const normalized = normalizeStationIdForMatch(input)
  if (normalized.length === 0) return []
  const fromSplit = normalized.split(/[\s_]+/).filter(Boolean)
  if (fromSplit.length > 1) return fromSplit
  if (normalized.length >= 6) return [normalized.slice(0, 4), normalized.slice(4)]
  return [normalized]
}

/** Station id matches when its normalized form contains every token. */
export function stationIdMatchesTokens(normalizedId: string, tokens: string[]): boolean {
  return tokens.length > 0 && tokens.every((t) => normalizedId.includes(t))
}

/** True when key has a station_id that is not in the loaded dataset (mismatch). Uses same flexible matching as editor. */
export function hasStationIdMismatch(stationId: string | undefined, stations: StationEntry[] | null): boolean {
  const sid = stationId?.trim() ?? ''
  if (sid === '') return false
  if (stations == null || stations.length === 0) return false
  const normalizedInput = normalizeStationIdForMatch(sid)
  const exactMatch = stations.some((s) => s.id === stationId)
  const normalizedMatch = stations.some((s) => normalizeStationIdForMatch(s.id) === normalizedInput)
  const matchTokens = getMatchTokens(sid)
  const tokenMatch =
    matchTokens.length > 0 &&
    stations.some((s) => stationIdMatchesTokens(normalizeStationIdForMatch(s.id), matchTokens))
  return !exactMatch && !normalizedMatch && !tokenMatch
}
