import type { TabbedProfile, DirectAccessKey, DirectAccessPage } from '../types'

const PRINT_WIDTH = 80
const INDENT = '  '

/**
 * Serialize a profile to JSON matching vacs-data Prettier format exactly.
 * Output passes `prettier --check` in the dataset repo.
 *
 * Format: objects expanded (one prop per line), arrays compact when under 80 chars,
 * 2-space indent, LF, trailing newline.
 */
export function serializeProfile(profile: TabbedProfile): string {
  const obj = profileToJson(profile)
  return format(obj, 0) + '\n'
}

function formatObject(obj: Record<string, unknown>, depth: number): string {
  const entries = Object.entries(obj)
  return entries
    .map(([k, v], i) => {
      const prefix = INDENT.repeat(depth + 1)
      const keyStr = JSON.stringify(k) + ': '
      const suffix = i < entries.length - 1 ? ',' : ''
      if (v === null || typeof v !== 'object') {
        return prefix + keyStr + JSON.stringify(v) + suffix
      }
      if (Array.isArray(v)) {
        const hasObjects = v.some((x) => !isPrimitive(x))
        if (!hasObjects) {
          const compact = '[' + v.map((x) => formatInline(x)).join(', ') + ']'
          if (compact.length <= PRINT_WIDTH - keyStr.length - prefix.length) {
            return prefix + keyStr + compact + suffix
          }
        }
        const arrLines = v.map((x, j) => {
          const s = INDENT.repeat(depth + 2) + format(x, depth + 2)
          return j < v.length - 1 ? s + ',' : s
        })
        return prefix + keyStr + '[\n' + arrLines.join('\n') + '\n' + prefix + ']' + suffix
      }
      return prefix + keyStr + '{\n' + formatObject(v as Record<string, unknown>, depth + 1) + '\n' + prefix + '}' + suffix
    })
    .join('\n')
}

function formatInline(val: unknown): string {
  if (val === null || typeof val !== 'object') return JSON.stringify(val)
  if (Array.isArray(val)) return '[' + val.map(formatInline).join(', ') + ']'
  return JSON.stringify(val)
}

function isPrimitive(val: unknown): boolean {
  return val === null || typeof val !== 'object'
}

function format(val: unknown, depth: number): string {
  if (val === null || typeof val !== 'object') return JSON.stringify(val)
  if (Array.isArray(val)) {
    if (val.some((x) => !isPrimitive(x))) {
      return '[\n' + val.map((x, i) => INDENT.repeat(depth + 1) + format(x, depth + 1) + (i < val.length - 1 ? ',' : '')).join('\n') + '\n' + INDENT.repeat(depth) + ']'
    }
    const compact = '[' + val.map((x) => formatInline(x)).join(', ') + ']'
    if (compact.length <= PRINT_WIDTH) return compact
    return '[\n' + val.map((x, i) => INDENT.repeat(depth + 1) + format(x, depth + 1) + (i < val.length - 1 ? ',' : '')).join('\n') + '\n' + INDENT.repeat(depth) + ']'
  }
  return '{\n' + formatObject(val as Record<string, unknown>, depth) + '\n' + INDENT.repeat(depth) + '}'
}

function profileToJson(profile: TabbedProfile): Record<string, unknown> {
  return {
    id: profile.id,
    type: profile.type,
    tabs: profile.tabs.map(tabToJson),
  }
}

function tabToJson(tab: { label: string[]; page: DirectAccessPage }): Record<string, unknown> {
  return { label: tab.label, page: pageToJson(tab.page) }
}

function pageToJson(page: DirectAccessPage): Record<string, unknown> {
  if (page.client_page != null) return { rows: page.rows, client_page: page.client_page }
  return { rows: page.rows, keys: (page.keys ?? []).map(keyToJson) }
}

function keyToJson(key: DirectAccessKey): Record<string, unknown> {
  const result: Record<string, unknown> = { label: key.label }
  if (key.station_id != null && key.station_id !== '') result.station_id = key.station_id
  if (key.page != null) result.page = pageToJson(key.page)
  return result
}
