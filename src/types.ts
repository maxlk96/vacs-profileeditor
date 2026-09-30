/**
 * VACS profile types (profiles.md).
 * Supports Tabbed and Geo profiles. Client pages are shown read-only.
 */

export interface DirectAccessKey {
  label: string[];
  color?: CustomButtonColor;
  station_id?: string;
  page?: DirectAccessPage;
}

export const CUSTOM_BUTTON_COLORS = [
  'clay',
  'blush',
  'lilac',
  'mint',
  'lavender',
  'taupe',
  'cadet',
  'steel',
  'umber',
  'lagoon',
  'snow',
  'azure',
] as const;

export type CustomButtonColor = (typeof CUSTOM_BUTTON_COLORS)[number];

export const CUSTOM_BUTTON_COLOR_HEX: Record<CustomButtonColor, string> = {
  clay: '#d9b3a6',
  blush: '#e8b8bf',
  lilac: '#d2c2ea',
  mint: '#bfe3d1',
  lavender: '#c9d2f0',
  taupe: '#c7b7a2',
  cadet: '#a9bfc8',
  steel: '#b3becb',
  umber: '#b99a84',
  lagoon: '#a7d2d8',
  snow: '#eef2f7',
  azure: '#b7d3f6',
};

export interface DirectAccessPage {
  rows: number;
  keys?: DirectAccessKey[];
  /** Client page config (not edited in this app); when set, keys is absent */
  client_page?: unknown;
}

export interface Tab {
  label: string[];
  page: DirectAccessPage;
}

export const VIEW_MODES = ['page', 'split', 'cycle'] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

/** `"page"` is the default when `view` is omitted. */
export const DEFAULT_VIEW_MODE: ViewMode = 'page';

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  page: 'Page (default)',
  split: 'Split',
  cycle: 'Cycle',
};

export function isViewMode(value: unknown): value is ViewMode {
  return typeof value === 'string' && (VIEW_MODES as readonly string[]).includes(value);
}

export interface TabbedProfile {
  id: string;
  type: 'Tabbed';
  /** How the client arranges radio and phone pages. Omitted means `"page"`. */
  view?: ViewMode;
  tabs: Tab[];
}

export const FLEX_DIRECTIONS = ['row', 'col'] as const;
export type FlexDirection = (typeof FLEX_DIRECTIONS)[number];

export const JUSTIFY_CONTENT_VALUES = [
  'start',
  'end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
] as const;
export type JustifyContent = (typeof JUSTIFY_CONTENT_VALUES)[number];

export const ALIGN_ITEMS_VALUES = ['start', 'end', 'center'] as const;
export type AlignItems = (typeof ALIGN_ITEMS_VALUES)[number];

export const DIVIDER_ORIENTATIONS = ['horizontal', 'vertical'] as const;
export type DividerOrientation = (typeof DIVIDER_ORIENTATIONS)[number];

/** Size pattern: number with optional decimals + % or rem */
export const GEO_SIZE_RE = /^\d+(\.\d{1,5})?(%|rem)$/;

export interface GeoPageContainer {
  direction: FlexDirection;
  children: GeoNode[];
  height?: string;
  width?: string;
  padding?: number;
  padding_left?: number;
  padding_right?: number;
  padding_top?: number;
  padding_bottom?: number;
  gap?: number;
  justify_content?: JustifyContent;
  align_items?: AlignItems;
}

export interface GeoPageButton {
  label: string[];
  size: number;
  color?: CustomButtonColor;
  page?: DirectAccessPage;
  station_id?: string;
}

export interface GeoPageDivider {
  orientation: DividerOrientation;
  thickness: number;
  color: string;
  oversize?: number;
}

export type GeoNode = GeoPageContainer | GeoPageButton | GeoPageDivider;

/**
 * A geo profile is a root GeoPageContainer plus id/type.
 * Geo profiles only support the `"page"` view mode, so `view` is omitted.
 */
export interface GeoProfile extends GeoPageContainer {
  id: string;
  type: 'Geo';
}

export type Profile = TabbedProfile | GeoProfile;

export function isTabbedProfile(profile: Profile): profile is TabbedProfile {
  return profile.type === 'Tabbed';
}

export function isGeoProfile(profile: Profile): profile is GeoProfile {
  return profile.type === 'Geo';
}

export function isGeoPageDivider(node: GeoNode): node is GeoPageDivider {
  return (
    typeof node === 'object' &&
    node != null &&
    'orientation' in node &&
    'thickness' in node &&
    'color' in node &&
    !('direction' in node) &&
    !('label' in node)
  );
}

export function isGeoPageButton(node: GeoNode): node is GeoPageButton {
  return (
    typeof node === 'object' &&
    node != null &&
    'label' in node &&
    'size' in node &&
    !('direction' in node) &&
    !('orientation' in node)
  );
}

export function isGeoPageContainer(node: GeoNode): node is GeoPageContainer {
  return (
    typeof node === 'object' &&
    node != null &&
    'direction' in node &&
    'children' in node &&
    !('orientation' in node) &&
    !('label' in node && 'size' in node)
  );
}

export function createDefaultProfile(): TabbedProfile {
  return {
    id: 'NEW',
    type: 'Tabbed',
    tabs: [
      {
        label: ['Tab 1'],
        page: { rows: 4, keys: [] },
      },
    ],
  };
}

export function createDefaultGeoProfile(): GeoProfile {
  return {
    id: 'NEW',
    type: 'Geo',
    direction: 'col',
    gap: 8,
    children: [
      {
        label: ['Button'],
        size: 10,
        page: { rows: 4, keys: [] },
      },
    ],
  };
}

export function createDefaultGeoButton(): GeoPageButton {
  return {
    label: ['Button'],
    size: 10,
    page: { rows: 4, keys: [] },
  };
}

export function createDefaultGeoContainer(direction: FlexDirection = 'row'): GeoPageContainer {
  return {
    direction,
    gap: 8,
    children: [createDefaultGeoButton()],
  };
}

export function createDefaultGeoDivider(orientation: DividerOrientation = 'horizontal'): GeoPageDivider {
  return {
    orientation,
    thickness: 2,
    color: '#364153',
  };
}
