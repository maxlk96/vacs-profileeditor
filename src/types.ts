/**
 * VACS tabbed profile types (profiles.md).
 * Only Tabbed profiles; no client_page in editor.
 */

export interface DirectAccessKey {
  label: string[];
  station_id?: string;
  page?: DirectAccessPage;
}

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

export interface TabbedProfile {
  id: string;
  type: 'Tabbed';
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
