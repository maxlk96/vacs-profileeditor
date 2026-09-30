import type { DirectAccessKey } from '../types'

/** Blank DA key used when expanding/shrinking the grid. */
export function blankKey(): DirectAccessKey {
  return { label: [] }
}

export function isBlankKey(key: DirectAccessKey): boolean {
  const lines = key.label ?? []
  if (lines.some((line) => (line ?? '').trim() !== '')) return false
  if (key.station_id != null && key.station_id.trim() !== '') return false
  if (key.page != null) return false
  if (key.color != null) return false
  return true
}

/** True when every cell in rows [newRows, oldRows) is blank or missing. */
export function removedRowsAreBlank(
  keys: DirectAccessKey[],
  oldRows: number,
  newRows: number
): boolean {
  if (keys.length === 0 || oldRows < 1 || newRows >= oldRows) return true
  const numCols = Math.ceil(keys.length / oldRows)
  for (let c = 0; c < numCols; c++) {
    for (let r = newRows; r < oldRows; r++) {
      const idx = c * oldRows + r
      if (idx < keys.length && !isBlankKey(keys[idx])) return false
    }
  }
  return true
}

/**
 * When increasing rows, insert blank cells at the bottom of each column so
 * existing keys keep their visual (column, row) positions under column-major layout.
 */
export function expandKeysForMoreRows(
  keys: DirectAccessKey[],
  oldRows: number,
  newRows: number
): DirectAccessKey[] {
  if (newRows <= oldRows || keys.length === 0 || oldRows < 1) return keys
  const numCols = Math.ceil(keys.length / oldRows)
  const next: DirectAccessKey[] = Array.from({ length: numCols * newRows }, blankKey)
  for (let i = 0; i < keys.length; i++) {
    const col = Math.floor(i / oldRows)
    const row = i % oldRows
    next[col * newRows + row] = keys[i]
  }
  return next
}

/**
 * When decreasing rows and the removed rows are blank, drop those blanks so
 * existing keys keep their visual positions under column-major layout.
 */
export function shrinkKeysForFewerRows(
  keys: DirectAccessKey[],
  oldRows: number,
  newRows: number
): DirectAccessKey[] {
  if (newRows >= oldRows || keys.length === 0 || oldRows < 1) return keys
  if (!removedRowsAreBlank(keys, oldRows, newRows)) return keys
  const numCols = Math.ceil(keys.length / oldRows)
  const next: DirectAccessKey[] = []
  for (let c = 0; c < numCols; c++) {
    for (let r = 0; r < newRows; r++) {
      const oldIdx = c * oldRows + r
      if (oldIdx >= keys.length) break
      next.push(keys[oldIdx])
    }
  }
  return next
}

export function remapKeyIndexForRowChange(index: number, oldRows: number, newRows: number): number | null {
  if (oldRows < 1 || newRows === oldRows) return index
  const col = Math.floor(index / oldRows)
  const row = index % oldRows
  if (newRows > oldRows) return col * newRows + row
  if (row >= newRows) return null
  return col * newRows + row
}
