// Map maths for the map search: miles between two points, whether a job is inside the
// visible map, grouping jobs at one address into one pin, and price-tag pin labels.
// Tested in geo.spec.ts.

import { salaryRange } from './job-format';
import { Job } from './jobs';

/** A point on the map. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Visible map area. */
export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** A searched place or the user's location, used for distance and radius. */
export interface Place extends LatLng {
  label: string;
}

/** Jobs sharing one address, shown as a single pin. */
export interface PinGroup extends LatLng {
  key: string;
  jobs: Job[];
}

/** Choices for the map's "Within" menu, in miles (0 = any distance). */
export const RADIUS_OPTIONS = [0, 5, 10, 25, 50, 100];

const EARTH_RADIUS_MILES = 3958.8;

/** True when a job has map coordinates (jobs posted before addresses were checked may not). */
export function hasCoords(job: Job): job is Job & { lat: number; lng: number } {
  return job.lat !== null && job.lng !== null;
}

/** Great-circle distance in miles. */
export function distanceMiles(a: LatLng, b: LatLng): number {
  // Degrees to radians.
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True when a point is inside the visible map area. */
export function inBounds(point: LatLng, b: Bounds): boolean {
  const inLat = point.lat >= b.south && point.lat <= b.north;
  // A view that crosses the antimeridian has west > east.
  const inLng = b.west <= b.east ? point.lng >= b.west && point.lng <= b.east : point.lng >= b.west || point.lng <= b.east;
  return inLat && inLng;
}

/** Distance for display: "3.2 mi" under 10 miles, "43 mi" above. */
export function formatMiles(miles: number): string {
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

/** Group jobs with coordinates by exact location. */
export function groupByPlace(jobs: Job[]): PinGroup[] {
  const groups = new Map<string, PinGroup>();
  for (const job of jobs) {
    if (!hasCoords(job)) continue;
    const key = `${job.lat.toFixed(6)},${job.lng.toFixed(6)}`;
    const group = groups.get(key) ?? { key, lat: job.lat, lng: job.lng, jobs: [] };
    group.jobs.push(job);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Short salary for a map pin, like a rent price tag: "$90K", "$90K+", or "3 jobs". */
export function pinLabel(jobs: Job[]): string {
  if (jobs.length > 1) return `${jobs.length} jobs`;
  const job = jobs[0];
  // 90000 → "$90K".
  const k = (n: number) => `$${Math.round(n / 1000)}K`;
  if (job.salaryMin && job.salaryMax && job.salaryMax > job.salaryMin) return `${k(job.salaryMin)}+`;
  if (job.salaryMin || job.salaryMax) return k((job.salaryMin || job.salaryMax)!);
  return salaryRange(job) ?? 'Job';
}
