/**
 * VACS tabbed profile types (profiles.md).
 * Only Tabbed profiles; no client_page in editor.
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
