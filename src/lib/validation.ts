import {
  ALIGN_ITEMS_VALUES,
  CUSTOM_BUTTON_COLORS,
  DEFAULT_VIEW_MODE,
  DIVIDER_ORIENTATIONS,
  FLEX_DIRECTIONS,
  GEO_SIZE_RE,
  JUSTIFY_CONTENT_VALUES,
  isGeoPageButton,
  isGeoPageContainer,
  isGeoPageDivider,
  isViewMode,
  type AlignItems,
  type DirectAccessKey,
  type DirectAccessPage,
  type FlexDirection,
  type GeoNode,
  type GeoPageButton,
  type GeoPageContainer,
  type GeoPageDivider,
  type GeoProfile,
  type JustifyContent,
  type Profile,
  type Tab,
  type TabbedProfile,
  type ViewMode,
} from '../types';

export interface ValidationError {
  path: string;
  message: string;
}

export function validateProfile(data: unknown): { ok: true; profile: Profile } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (data == null || typeof data !== 'object') {
    return { ok: false, errors: [{ path: '', message: 'Invalid JSON: expected an object' }] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'Tabbed' && obj.type !== 'Geo') {
    return { ok: false, errors: [{ path: 'type', message: 'Profile type must be "Tabbed" or "Geo"' }] };
  }

  if (typeof obj.id !== 'string' || obj.id.trim() === '') {
    errors.push({ path: 'id', message: 'Profile id must be a non-empty string' });
  }

  if (obj.type === 'Tabbed') {
    validateTabbed(obj, errors);
  } else {
    validateGeo(obj, errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    profile: data as Profile,
  };
}

function validateTabbed(obj: Record<string, unknown>, errors: ValidationError[]) {
  if (obj.view != null && !isViewMode(obj.view)) {
    errors.push({
      path: 'view',
      message: 'View must be "page", "split", or "cycle"',
    });
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
    validateLabel(tab.label, `tabs[${i}].label`, errors, { allowEmpty: false });
    if (tab.page == null || typeof tab.page !== 'object') {
      errors.push({ path: `tabs[${i}].page`, message: 'Tab must have a page' });
    } else {
      validatePage(tab.page as Record<string, unknown>, `tabs[${i}].page`, errors);
    }
  });
}

function validateGeo(obj: Record<string, unknown>, errors: ValidationError[]) {
  if (obj.view != null && obj.view !== DEFAULT_VIEW_MODE) {
    errors.push({
      path: 'view',
      message: 'Geo profiles only support the default "page" view',
    });
  }
  validateContainerFields(obj, '', errors, { requireChildren: true });
}

function validateContainerFields(
  obj: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
  opts: { requireChildren: boolean }
) {
  const prefix = path ? `${path}.` : '';

  if (!isFlexDirection(obj.direction)) {
    errors.push({ path: `${prefix}direction`, message: 'Direction must be "row" or "col"' });
  }

  if (!Array.isArray(obj.children) || (opts.requireChildren && obj.children.length === 0)) {
    errors.push({ path: `${prefix}children`, message: 'Container must have at least one child' });
  }

  if (obj.height != null && (typeof obj.height !== 'string' || !GEO_SIZE_RE.test(obj.height))) {
    errors.push({ path: `${prefix}height`, message: 'Height must match pattern like "100%" or "20rem"' });
  }
  if (obj.width != null && (typeof obj.width !== 'string' || !GEO_SIZE_RE.test(obj.width))) {
    errors.push({ path: `${prefix}width`, message: 'Width must match pattern like "100%" or "20rem"' });
  }

  validateOptionalNonNeg(obj.padding, `${prefix}padding`, errors);
  validateOptionalNonNeg(obj.padding_left, `${prefix}padding_left`, errors);
  validateOptionalNonNeg(obj.padding_right, `${prefix}padding_right`, errors);
  validateOptionalNonNeg(obj.padding_top, `${prefix}padding_top`, errors);
  validateOptionalNonNeg(obj.padding_bottom, `${prefix}padding_bottom`, errors);
  validateOptionalNonNeg(obj.gap, `${prefix}gap`, errors);

  if (obj.justify_content != null && !isJustifyContent(obj.justify_content)) {
    errors.push({
      path: `${prefix}justify_content`,
      message: 'Invalid justify_content value',
    });
  }
  if (obj.align_items != null && !isAlignItems(obj.align_items)) {
    errors.push({
      path: `${prefix}align_items`,
      message: 'Invalid align_items value',
    });
  }

  const children = Array.isArray(obj.children) ? obj.children : [];
  children.forEach((child, i) => {
    validateGeoNode(child, `${prefix}children[${i}]`, errors);
  });
}

function validateGeoNode(node: unknown, path: string, errors: ValidationError[]) {
  if (node == null || typeof node !== 'object') {
    errors.push({ path, message: 'Geo node must be an object' });
    return;
  }
  const obj = node as Record<string, unknown>;

  if ('orientation' in obj && 'thickness' in obj && 'color' in obj) {
    validateDivider(obj, path, errors);
    return;
  }
  if ('label' in obj && 'size' in obj) {
    validateButton(obj, path, errors);
    return;
  }
  if ('direction' in obj && 'children' in obj) {
    validateContainerFields(obj, path, errors, { requireChildren: true });
    return;
  }
  errors.push({ path, message: 'Unknown geo node (expected container, button, or divider)' });
}

function validateButton(obj: Record<string, unknown>, path: string, errors: ValidationError[]) {
  validateLabel(obj.label, `${path}.label`, errors, { allowEmpty: false });
  if (typeof obj.size !== 'number' || !(obj.size > 0)) {
    errors.push({ path: `${path}.size`, message: 'Button size must be a number > 0' });
  }
  if (obj.color != null && !isCustomButtonColor(obj.color)) {
    errors.push({ path: `${path}.color`, message: 'Invalid button color' });
  }
  if (obj.station_id != null && typeof obj.station_id !== 'string') {
    errors.push({ path: `${path}.station_id`, message: 'station_id must be a string' });
  }
  if (obj.page != null) {
    if (typeof obj.page !== 'object') {
      errors.push({ path: `${path}.page`, message: 'page must be an object' });
    } else {
      validatePage(obj.page as Record<string, unknown>, `${path}.page`, errors);
    }
  }
  if (obj.station_id != null && obj.station_id !== '' && obj.page != null) {
    errors.push({ path, message: 'station_id and page are mutually exclusive' });
  }
}

function validateDivider(obj: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (!isDividerOrientation(obj.orientation)) {
    errors.push({ path: `${path}.orientation`, message: 'Orientation must be "horizontal" or "vertical"' });
  }
  if (typeof obj.thickness !== 'number' || !(obj.thickness > 0)) {
    errors.push({ path: `${path}.thickness`, message: 'Thickness must be a number > 0' });
  }
  if (typeof obj.color !== 'string' || obj.color.trim() === '') {
    errors.push({ path: `${path}.color`, message: 'Color must be a non-empty CSS color string' });
  }
  if (obj.oversize != null && (typeof obj.oversize !== 'number' || !(obj.oversize > 0))) {
    errors.push({ path: `${path}.oversize`, message: 'Oversize must be a number > 0' });
  }
}

function validatePage(page: Record<string, unknown>, path: string, errors: ValidationError[]) {
  if (typeof page.rows !== 'number' || page.rows < 1) {
    errors.push({ path: `${path}.rows`, message: 'Rows must be at least 1' });
  }
  if (page.keys != null && !Array.isArray(page.keys)) {
    errors.push({ path: `${path}.keys`, message: 'Keys must be an array' });
  }
}

function validateLabel(
  label: unknown,
  path: string,
  errors: ValidationError[],
  opts: { allowEmpty: boolean }
) {
  if (typeof label === 'string') {
    if (!opts.allowEmpty && label.trim() === '') {
      errors.push({ path, message: 'Label must be non-empty' });
    }
    return;
  }
  if (Array.isArray(label)) {
    if (!opts.allowEmpty && label.length === 0) {
      errors.push({ path, message: 'Label must be non-empty' });
    } else if (label.some((l) => typeof l !== 'string')) {
      errors.push({ path, message: 'Label must be an array of strings' });
    } else if (label.length > 3) {
      errors.push({ path, message: 'Label can have at most 3 lines' });
    } else if (!opts.allowEmpty && label.every((l) => String(l).trim() === '')) {
      errors.push({ path, message: 'Label must be non-empty' });
    }
    return;
  }
  errors.push({ path, message: 'Label must be a string or array of strings' });
}

function validateOptionalNonNeg(value: unknown, path: string, errors: ValidationError[]) {
  if (value == null) return;
  if (typeof value !== 'number' || value < 0 || Number.isNaN(value)) {
    errors.push({ path, message: 'Must be a non-negative number' });
  }
}

export function validateKeyLabel(label: unknown): string | null {
  if (!Array.isArray(label)) return 'Label must be an array of strings';
  if (label.length > 3) return 'Label can have at most 3 lines';
  if (label.some((l) => typeof l !== 'string')) return 'Each label line must be a string';
  return null;
}

export function normalizeProfile(profile: Profile): Profile {
  if (profile.type === 'Geo') {
    return normalizeGeoProfile(profile);
  }
  return normalizeTabbedProfile(profile);
}

function normalizeTabbedProfile(profile: TabbedProfile): TabbedProfile {
  const view = normalizeView(profile.view);
  return {
    id: profile.id.trim(),
    type: 'Tabbed',
    ...(view != null ? { view } : {}),
    tabs: profile.tabs.map((tab): Tab => {
      const page = tab.page as { rows?: number; keys?: DirectAccessKey[]; client_page?: unknown } | undefined
      const rawLabel = tab.label as unknown as string | string[]
      const label = Array.isArray(rawLabel) ? rawLabel.map(l => l.trim()) : [rawLabel.trim()]

      if (page?.client_page != null) {
        return { label, page: { rows: Math.max(1, Math.floor(page.rows ?? 4)), client_page: page.client_page } }
      }
      return {
        label,
        page: {
          rows: Math.max(1, Math.floor(page?.rows ?? 4)),
          keys: (page?.keys ?? []).map((k): DirectAccessKey => normalizeKey(k)),
        },
      }
    }),
  };
}

function normalizeGeoProfile(profile: GeoProfile): GeoProfile {
  const container = normalizeContainer(profile);
  return {
    ...container,
    id: profile.id.trim(),
    type: 'Geo',
  };
}

function normalizeContainer(container: GeoPageContainer): GeoPageContainer {
  const result: GeoPageContainer = {
    direction: isFlexDirection(container.direction) ? container.direction : 'col',
    children: (container.children ?? []).map(normalizeGeoNode),
  };
  if (typeof container.height === 'string' && GEO_SIZE_RE.test(container.height)) {
    result.height = container.height;
  }
  if (typeof container.width === 'string' && GEO_SIZE_RE.test(container.width)) {
    result.width = container.width;
  }
  copyOptionalNumber(container, result, 'padding');
  copyOptionalNumber(container, result, 'padding_left');
  copyOptionalNumber(container, result, 'padding_right');
  copyOptionalNumber(container, result, 'padding_top');
  copyOptionalNumber(container, result, 'padding_bottom');
  copyOptionalNumber(container, result, 'gap');
  if (isJustifyContent(container.justify_content)) {
    result.justify_content = container.justify_content;
  }
  if (isAlignItems(container.align_items)) {
    result.align_items = container.align_items;
  }
  return result;
}

function normalizeGeoNode(node: GeoNode): GeoNode {
  if (isGeoPageDivider(node)) return normalizeDivider(node);
  if (isGeoPageButton(node)) return normalizeButton(node);
  if (isGeoPageContainer(node)) return normalizeContainer(node);
  // Fallback: treat unknowns as empty buttons so we don't crash
  return { label: ['?'], size: 10 };
}

function normalizeButton(button: GeoPageButton): GeoPageButton {
  const rawLabel = button.label as unknown as string | string[];
  const label = Array.isArray(rawLabel)
    ? rawLabel.slice(0, 3).map((l) => String(l))
    : [String(rawLabel ?? '').trim() || 'Button'];
  const result: GeoPageButton = {
    label: label.length > 0 ? label : ['Button'],
    size: typeof button.size === 'number' && button.size > 0 ? button.size : 10,
  };
  if (isCustomButtonColor(button.color)) result.color = button.color;
  if (button.station_id != null && button.station_id !== '') {
    result.station_id = String(button.station_id);
  } else if (button.page != null) {
    result.page = normalizePage(button.page);
  }
  return result;
}

function normalizeDivider(divider: GeoPageDivider): GeoPageDivider {
  const result: GeoPageDivider = {
    orientation: isDividerOrientation(divider.orientation) ? divider.orientation : 'horizontal',
    thickness: typeof divider.thickness === 'number' && divider.thickness > 0 ? divider.thickness : 2,
    color: typeof divider.color === 'string' && divider.color.trim() !== '' ? divider.color : '#364153',
  };
  if (typeof divider.oversize === 'number' && divider.oversize > 0) {
    result.oversize = divider.oversize;
  }
  return result;
}

function normalizeKey(k: DirectAccessKey): DirectAccessKey {
  return {
    label: Array.isArray(k.label) ? k.label.slice(0, 3).map((l) => String(l)) : [],
    ...(isCustomButtonColor(k.color) ? { color: k.color } : {}),
    ...(k.station_id != null && k.station_id !== '' ? { station_id: String(k.station_id) } : {}),
    ...(k.page != null ? { page: normalizePage(k.page) } : {}),
  };
}

function normalizePage(page: { rows?: number; keys?: DirectAccessKey[]; client_page?: unknown }): DirectAccessPage {
  if (page.client_page != null) {
    return {
      rows: Math.max(1, Math.floor(page.rows ?? 4)),
      client_page: page.client_page,
    };
  }
  return {
    rows: Math.max(1, Math.floor(page.rows ?? 4)),
    keys: (page.keys ?? []).map(normalizeKey),
  };
}

function copyOptionalNumber<K extends keyof GeoPageContainer>(
  from: GeoPageContainer,
  to: GeoPageContainer,
  key: K
) {
  const value = from[key];
  if (typeof value === 'number' && value >= 0 && !Number.isNaN(value)) {
    (to as unknown as Record<string, unknown>)[key as string] = value;
  }
}

function isCustomButtonColor(value: unknown): value is DirectAccessKey['color'] {
  return typeof value === 'string' && (CUSTOM_BUTTON_COLORS as readonly string[]).includes(value);
}

function isFlexDirection(value: unknown): value is FlexDirection {
  return typeof value === 'string' && (FLEX_DIRECTIONS as readonly string[]).includes(value);
}

function isJustifyContent(value: unknown): value is JustifyContent {
  return typeof value === 'string' && (JUSTIFY_CONTENT_VALUES as readonly string[]).includes(value);
}

function isAlignItems(value: unknown): value is AlignItems {
  return typeof value === 'string' && (ALIGN_ITEMS_VALUES as readonly string[]).includes(value);
}

function isDividerOrientation(value: unknown): value is GeoPageDivider['orientation'] {
  return typeof value === 'string' && (DIVIDER_ORIENTATIONS as readonly string[]).includes(value);
}

/** Keep only non-default view modes so omitted `view` stays the `"page"` default. */
function normalizeView(value: unknown): ViewMode | undefined {
  if (!isViewMode(value) || value === DEFAULT_VIEW_MODE) return undefined;
  return value;
}
