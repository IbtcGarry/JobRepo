import { salaryRange } from './job-format';
import { Job } from './jobs';

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

export const RADIUS_OPTIONS = [0, 5, 10, 25, 50, 100];

const EARTH_RADIUS_MILES = 3958.8;

export function hasCoords(job: Job): job is Job & { lat: number; lng: number } {
  return job.lat !== null && job.lng !== null;
}

/** Great-circle distance in miles. */
export function distanceMiles(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function inBounds(point: LatLng, b: Bounds): boolean {
  const inLat = point.lat >= b.south && point.lat <= b.north;
  // A view that crosses the antimeridian has west > east.
  const inLng = b.west <= b.east ? point.lng >= b.west && point.lng <= b.east : point.lng >= b.west || point.lng <= b.east;
  return inLat && inLng;
}

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
  const k = (n: number) => `$${Math.round(n / 1000)}K`;
  if (job.salaryMin && job.salaryMax && job.salaryMax > job.salaryMin) return `${k(job.salaryMin)}+`;
  if (job.salaryMin || job.salaryMax) return k((job.salaryMin || job.salaryMax)!);
  return salaryRange(job) ?? 'Job';
}
