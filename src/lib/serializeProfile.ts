import prettier from 'prettier/standalone'
import prettierPluginBabel from 'prettier/plugins/babel'
import prettierPluginEstree from 'prettier/plugins/estree'
import type { Options as PrettierOptions } from 'prettier'
import {
  DEFAULT_VIEW_MODE,
  isGeoPageButton,
  isGeoPageContainer,
  isGeoPageDivider,
  type DirectAccessKey,
  type DirectAccessPage,
  type GeoNode,
  type GeoPageContainer,
  type GeoProfile,
  type Profile,
  type TabbedProfile,
} from '../types'

/**
 * Serialize a profile to JSON matching vacs-data Prettier format exactly.
 * Output passes `prettier --check` in the dataset repo.
 *
 * Format: objects expanded (one prop per line), arrays compact when under 80 chars,
 * 2-space indent, LF, trailing newline.
 */
const PRETTIER_OPTIONS: PrettierOptions = {
  parser: 'json',
  plugins: [prettierPluginBabel, prettierPluginEstree],
  printWidth: 50,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
}

export async function serializeProfile(profile: Profile): Promise<string> {
  const obj = profileToJson(profile)
  const json = JSON.stringify(obj, null, 2)
  return await prettier.format(json, PRETTIER_OPTIONS)
}

function profileToJson(profile: Profile): Record<string, unknown> {
  if (profile.type === 'Geo') {
    return geoProfileToJson(profile)
  }
  return tabbedProfileToJson(profile)
}

function tabbedProfileToJson(profile: TabbedProfile): Record<string, unknown> {
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

function geoProfileToJson(profile: GeoProfile): Record<string, unknown> {
  const container = containerToJson(profile)
  return {
    id: profile.id,
    type: 'Geo',
    ...container,
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
  if (key.color != null) result.color = key.color
  if (key.station_id != null && key.station_id !== '') result.station_id = key.station_id
  if (key.page != null) result.page = pageToJson(key.page)
  return result
}

function containerToJson(container: GeoPageContainer): Record<string, unknown> {
  const result: Record<string, unknown> = {
    direction: container.direction,
  }
  if (container.height != null) result.height = container.height
  if (container.width != null) result.width = container.width
  if (container.padding != null) result.padding = container.padding
  if (container.padding_left != null) result.padding_left = container.padding_left
  if (container.padding_right != null) result.padding_right = container.padding_right
  if (container.padding_top != null) result.padding_top = container.padding_top
  if (container.padding_bottom != null) result.padding_bottom = container.padding_bottom
  if (container.gap != null) result.gap = container.gap
  if (container.justify_content != null) result.justify_content = container.justify_content
  if (container.align_items != null) result.align_items = container.align_items
  result.children = container.children.map(nodeToJson)
  return result
}

function nodeToJson(node: GeoNode): Record<string, unknown> {
  if (isGeoPageDivider(node)) {
    const result: Record<string, unknown> = {
      orientation: node.orientation,
      thickness: node.thickness,
      color: node.color,
    }
    if (node.oversize != null) result.oversize = node.oversize
    return result
  }
  if (isGeoPageButton(node)) {
    const result: Record<string, unknown> = {
      label: node.label,
      size: node.size,
    }
    if (node.color != null) result.color = node.color
    if (node.station_id != null && node.station_id !== '') result.station_id = node.station_id
    if (node.page != null) result.page = pageToJson(node.page)
    return result
  }
  if (isGeoPageContainer(node)) {
    return containerToJson(node)
  }
  return {}
}
