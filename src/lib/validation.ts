import type { TabbedProfile, Tab, DirectAccessKey, DirectAccessPage } from '../types';

export interface ValidationError {
  path: string;
  message: string;
}

export function validateProfile(data: unknown): { ok: true; profile: TabbedProfile } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (data == null || typeof data !== 'object') {
    return { ok: false, errors: [{ path: '', message: 'Invalid JSON: expected an object' }] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'Tabbed') {
    return { ok: false, errors: [{ path: 'type', message: 'Only Tabbed profiles are supported' }] };
  }

  if (typeof obj.id !== 'string' || obj.id.trim() === '') {
    errors.push({ path: 'id', message: 'Profile id must be a non-empty string' });
  }

  if (!Array.isArray(obj.tabs) || obj.tabs.length === 0) {
    errors.push({ path: 'tabs', message: 'Profile must have at least one tab' });
  }

  const tabs = Array.isArray(obj.tabs) ? obj.tabs : [];
  tabs.forEach((t, i) => {
    if (t == null || typeof t !== 'object') {
      errors.push({ path: `tabs[${i}]`, message: 'Tab must be an object' });
      return;
    }
    const tab = t as Record<string, unknown>;
    if (typeof tab.label !== 'string' || tab.label.trim() === '') {
      errors.push({ path: `tabs[${i}].label`, message: 'Tab label must be non-empty' });
    }
    if (tab.page == null || typeof tab.page !== 'object') {
      errors.push({ path: `tabs[${i}].page`, message: 'Tab must have a page' });
    } else {
      const page = tab.page as Record<string, unknown>;
      if (typeof page.rows !== 'number' || page.rows < 1) {
        errors.push({ path: `tabs[${i}].page.rows`, message: 'Rows must be at least 1' });
      }
      if (page.keys != null && !Array.isArray(page.keys)) {
        errors.push({ path: `tabs[${i}].page.keys`, message: 'Keys must be an array' });
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    profile: data as TabbedProfile,
  };
}

export function validateKeyLabel(label: unknown): string | null {
  if (!Array.isArray(label)) return 'Label must be an array of strings';
  if (label.length > 3) return 'Label can have at most 3 lines';
  if (label.some((l) => typeof l !== 'string')) return 'Each label line must be a string';
  return null;
}

export function normalizeProfile(profile: TabbedProfile): TabbedProfile {
  return {
    id: profile.id.trim(),
    type: 'Tabbed',
    tabs: profile.tabs.map((tab): Tab => {
      const page = tab.page as { rows?: number; keys?: DirectAccessKey[]; client_page?: unknown } | undefined
      if (page?.client_page != null) {
        return { label: tab.label.trim(), page: { rows: Math.max(1, Math.floor(page.rows ?? 4)), client_page: page.client_page } }
      }
      return {
        label: tab.label.trim(),
        page: {
          rows: Math.max(1, Math.floor(page?.rows ?? 4)),
          keys: (page?.keys ?? []).map((k): DirectAccessKey => ({
            label: Array.isArray(k.label) ? k.label.slice(0, 3).map((l) => String(l)) : [],
            ...(k.station_id != null && k.station_id !== '' ? { station_id: String(k.station_id) } : {}),
            ...(k.page != null ? { page: normalizePage(k.page) } : {}),
          })),
        },
      }
    }),
  };
}

function normalizePage(page: { rows?: number; keys?: DirectAccessKey[]; client_page?: unknown }): DirectAccessPage {
  return {
    rows: Math.max(1, Math.floor(page.rows ?? 4)),
    keys: (page.keys ?? []).map((k): DirectAccessKey => ({
      label: Array.isArray(k.label) ? k.label.slice(0, 3).map((l) => String(l)) : [],
      ...(k.station_id != null && k.station_id !== '' ? { station_id: String(k.station_id) } : {}),
      ...(k.page != null ? { page: normalizePage(k.page) } : {}),
    })),
  };
}
