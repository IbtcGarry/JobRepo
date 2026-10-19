import { EMPTY_FILTERS, JobFilters, POSTED_OPTIONS, SALARY_OPTIONS } from './job-filters';
import { COMPANY_SIZES, JOB_TYPES, LEVELS, ROLES, WORKPLACES } from './jobs';
import { Place, RADIUS_OPTIONS } from './geo';

/** Everything the map search remembers in the page address, so searches can be shared and survive reloads. */
export interface MapSearch {
  filters: JobFilters;
  /** Point to measure distance from (searched place or "my location"). */
  near: Place | null;
  /** Miles around `near`; 0 = no limit. */
  radius: number;
  /** Map view: center and zoom. */
  view: { lat: number; lng: number; zoom: number } | null;
}

export const EMPTY_SEARCH: MapSearch = { filters: EMPTY_FILTERS, near: null, radius: 0, view: null };

type Params = Record<string, string>;

const LISTS = [
  ['roles', 'role', ROLES],
  ['workplaces', 'wp', WORKPLACES],
  ['types', 'type', JOB_TYPES],
  ['levels', 'lvl', LEVELS],
  ['sizes', 'size', COMPANY_SIZES],
] as const;

/** Turn a search into query params, leaving out anything at its default. */
export function searchToParams(s: MapSearch): Params {
  const f = s.filters;
  const p: Params = {};
  if (f.query.trim()) p['q'] = f.query.trim();
  for (const [key, param] of LISTS) if (f[key].length) p[param] = (f[key] as readonly string[]).join('|');
  if (f.minSalary) p['sal'] = String(f.minSalary);
  if (f.skills.length) p['skills'] = f.skills.join('|');
  if (f.postedWithinDays) p['posted'] = String(f.postedWithinDays);
  if (f.equityOnly) p['equity'] = '1';
  if (f.visaOnly) p['visa'] = '1';
  if (f.sort !== 'newest') p['sort'] = f.sort;
  if (s.near) {
    p['near'] = `${round(s.near.lat, 5)},${round(s.near.lng, 5)}`;
    p['place'] = s.near.label;
    if (s.radius) p['r'] = String(s.radius);
  }
  if (s.view) p['v'] = `${round(s.view.lat, 5)},${round(s.view.lng, 5)},${s.view.zoom}`;
  return p;
}

/** Read a search back from query params, ignoring anything unknown or malformed. */
export function searchFromParams(p: Partial<Params>): MapSearch {
  const f: JobFilters = { ...EMPTY_FILTERS };
  f.query = p['q'] ?? '';
  for (const [key, param] of LISTS) {
    const allowed = new Set<string>(LISTS.find(([k]) => k === key)![2]);
    (f as unknown as Record<string, string[]>)[key] = (p[param] ?? '').split('|').filter((v) => allowed.has(v));
  }
  f.minSalary = oneOf(Number(p['sal']), SALARY_OPTIONS, 0);
  f.skills = (p['skills'] ?? '').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 20);
  f.postedWithinDays = oneOf(Number(p['posted']), POSTED_OPTIONS.map((o) => o.days), 0);
  f.equityOnly = p['equity'] === '1';
  f.visaOnly = p['visa'] === '1';
  f.sort = p['sort'] === 'salary' || p['sort'] === 'distance' ? p['sort'] : 'newest';

  const near = numbers(p['near'], 2);
  const nearPlace = near && validLatLng(near[0], near[1]) ? { lat: near[0], lng: near[1], label: p['place'] || 'Selected place' } : null;
  const view = numbers(p['v'], 3);
  const validView = view && validLatLng(view[0], view[1]) && view[2] >= 1 && view[2] <= 19;

  if (f.sort === 'distance' && !nearPlace) f.sort = 'newest';
  return {
    filters: f,
    near: nearPlace,
    radius: nearPlace ? oneOf(Number(p['r']), RADIUS_OPTIONS, 0) : 0,
    view: validView ? { lat: view[0], lng: view[1], zoom: Math.round(view[2]) } : null,
  };
}

function oneOf(value: number, allowed: readonly number[], fallback: number): number {
  return allowed.includes(value) ? value : fallback;
}

function numbers(value: string | undefined, count: number): number[] | null {
  const parts = (value ?? '').split(',').map(Number);
  return parts.length === count && parts.every(Number.isFinite) ? parts : null;
}

function validLatLng(lat: number, lng: number): boolean {
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function round(n: number, digits: number): number {
  return Number(n.toFixed(digits));
}
