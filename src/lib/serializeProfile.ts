import prettier from 'prettier/standalone'
import prettierPluginBabel from 'prettier/plugins/babel'
import prettierPluginEstree from 'prettier/plugins/estree'
import type { Options as PrettierOptions } from 'prettier'
import { DEFAULT_VIEW_MODE, type TabbedProfile, type DirectAccessKey, type DirectAccessPage } from '../types'

/**
 * Serialize a profile to JSON matching vacs-data Prettier format exactly.
 * Output passes `prettier --check` in the dataset repo.
 *
 * Format: objects expanded (one prop per line), arrays compact when under 80 chars,
 * 2-space indent, LF, trailing newline.
 */
// Match vacs-data Prettier/editorconfig defaults for JSON output.
const PRETTIER_OPTIONS: PrettierOptions = {
  parser: 'json',
  plugins: [prettierPluginBabel, prettierPluginEstree],
  printWidth: 50,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
}

export async function serializeProfile(profile: TabbedProfile): Promise<string> {
  const obj = profileToJson(profile)
  const json = JSON.stringify(obj, null, 2)
  return await prettier.format(json, PRETTIER_OPTIONS)
}

function profileToJson(profile: TabbedProfile): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: profile.id,
    type: profile.type,
  }
  if (profile.view != null && profile.view !== DEFAULT_VIEW_MODE) {
    result.view = profile.view
  }
  result.tabs = profile.tabs.map(tabToJson)
  return result
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
  if (key.color != null) result.color = key.color
  if (key.station_id != null && key.station_id !== '') result.station_id = key.station_id
  if (key.page != null) result.page = pageToJson(key.page)
  return result
}
