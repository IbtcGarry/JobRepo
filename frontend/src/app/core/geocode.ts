/** A street address confirmed to exist, with coordinates for future map features. */
export interface VerifiedAddress {
  /** Exactly what the employer entered (trimmed) — paste-able into Google Maps. */
  address: string;
  /** Short "City, State" / "City, Country" form for job cards. */
  location: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  address: Record<string, string>;
}

/**
 * Check an address with OpenStreetMap's free geocoder. Google's own API needs a paid key;
 * any address OpenStreetMap can place at street level will also resolve on Google Maps.
 */
export async function verifyAddress(input: string): Promise<VerifiedAddress> {
  const address = input.trim().replace(/\s+/g, ' ');
  if (!address) throw new Error('Add the job’s street address.');

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: address, format: 'jsonv2', addressdetails: '1', limit: '1' }).toString();

  let results: NominatimResult[];
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error();
    results = await res.json();
  } catch {
    throw new Error('Couldn’t check the address right now. Please try again.');
  }

  const hit = results[0];
  if (!hit) throw new Error('We couldn’t find that address. Copy it exactly as it appears on Google Maps.');
  const a = hit.address;
  if (!a['road']) {
    throw new Error('That looks like an area, not a street address. Include the street, e.g. "1600 Amphitheatre Parkway, Mountain View, CA 94043".');
  }

  const city = a['city'] || a['town'] || a['village'] || a['hamlet'] || a['suburb'] || a['county'] || '';
  const region = a['country_code'] === 'us' ? a['state'] : a['country'];
  return {
    address,
    location: [city, region].filter(Boolean).join(', ') || address,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
  };
}

export function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
  /** [south, north, west, east] area to zoom to. */
  bbox: [number, number, number, number] | null;
}

/**
 * Find places (cities, ZIP codes, neighborhoods, addresses) for the map search box.
 * Called on Enter, not on every keystroke, to stay within OpenStreetMap's usage policy.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q, format: 'jsonv2', limit: '5', addressdetails: '1' }).toString();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Place search is unavailable right now.');
  const results: {
    lat: string;
    lon: string;
    name?: string;
    display_name: string;
    boundingbox?: string[];
    address?: Record<string, string>;
  }[] = await res.json();
  const seen = new Set<string>();
  return results
    .map((r) => ({
      label: placeLabel(r.name, r.display_name, r.address ?? {}),
      lat: Number(r.lat),
      lng: Number(r.lon),
      bbox: r.boundingbox?.length === 4 ? (r.boundingbox.map(Number) as [number, number, number, number]) : null,
    }))
    .filter((p) => !seen.has(p.label) && seen.add(p.label));
}

/** "Chicago, Illinois", "10001, New York", "350 5th Ave, New York" — short enough for a chip. */
function placeLabel(name: string | undefined, displayName: string, a: Record<string, string>): string {
  const street = a['road'] ? [a['house_number'], a['road']].filter(Boolean).join(' ') : '';
  const city = a['city'] || a['town'] || a['village'] || a['hamlet'] || a['suburb'] || '';
  const region = a['state'] || a['country'] || '';
  const first = street || name || city || displayName.split(', ')[0];
  const second = street ? city || region : first === region ? a['country'] ?? '' : region;
  return [...new Set([first, second].filter(Boolean))].join(', ');
}
