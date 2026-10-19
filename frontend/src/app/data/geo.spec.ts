import { describe, expect, it } from 'vitest';

import { distanceMiles, formatMiles, groupByPlace, inBounds, pinLabel } from './geo';
import { Job } from './jobs';
import { EMPTY_SEARCH, searchFromParams, searchToParams } from './map-search';

const CHICAGO = { lat: 41.8781, lng: -87.6298 };
const NYC = { lat: 40.7128, lng: -74.006 };

const job = (o: Partial<Job>) => ({ id: 'x', lat: 1, lng: 2, salaryMin: null, salaryMax: null, ...o }) as Job;

describe('geo', () => {
  it('measures distance in miles', () => {
    expect(distanceMiles(CHICAGO, NYC)).toBeGreaterThan(705);
    expect(distanceMiles(CHICAGO, NYC)).toBeLessThan(720);
    expect(distanceMiles(CHICAGO, CHICAGO)).toBe(0);
  });

  it('checks bounds, including views across the antimeridian', () => {
    const b = { south: 40, west: -90, north: 43, east: -85 };
    expect(inBounds(CHICAGO, b)).toBe(true);
    expect(inBounds(NYC, b)).toBe(false);
    expect(inBounds({ lat: 0, lng: 179 }, { south: -10, west: 170, north: 10, east: -170 })).toBe(true);
  });

  it('formats miles', () => {
    expect(formatMiles(3.24)).toBe('3.2 mi');
    expect(formatMiles(42.6)).toBe('43 mi');
  });

  it('groups jobs at the same spot and skips jobs without coordinates', () => {
    const groups = groupByPlace([job({ id: 'a' }), job({ id: 'b' }), job({ id: 'c', lat: 5 }), job({ id: 'd', lat: null })]);
    expect(groups.map((g) => g.jobs.map((j) => j.id))).toEqual([['a', 'b'], ['c']]);
  });

  it('labels pins like price tags', () => {
    expect(pinLabel([job({ salaryMin: 90_000, salaryMax: 130_000 })])).toBe('$90K+');
    expect(pinLabel([job({ salaryMin: 90_000 })])).toBe('$90K');
    expect(pinLabel([job({}), job({})])).toBe('2 jobs');
    expect(pinLabel([job({})])).toBe('Job');
  });
});

describe('map search params', () => {
  it('round-trips a full search', () => {
    const search = {
      filters: {
        ...EMPTY_SEARCH.filters,
        query: 'virologist',
        roles: ['Engineering', 'Data'],
        workplaces: ['Remote'],
        minSalary: 100_000,
        skills: ['Python', 'C++'],
        postedWithinDays: 7,
        visaOnly: true,
        sort: 'distance',
      },
      near: { lat: 41.87, lng: -87.63, label: 'Chicago, Illinois' },
      radius: 25,
      view: { lat: 41.9, lng: -87.6, zoom: 11 },
    } as const;
    expect(searchFromParams(searchToParams(search as never))).toEqual(search);
  });

  it('leaves defaults out of the URL', () => {
    expect(searchToParams(EMPTY_SEARCH)).toEqual({});
  });

  it('ignores junk and drops distance sort without a place', () => {
    const s = searchFromParams({ role: 'Engineering|Hacker', sal: '123', posted: '3', sort: 'distance', near: 'abc', v: '1,2' });
    expect(s.filters.roles).toEqual(['Engineering']);
    expect(s.filters.minSalary).toBe(0);
    expect(s.filters.postedWithinDays).toBe(0);
    expect(s.filters.sort).toBe('newest');
    expect(s.near).toBeNull();
    expect(s.view).toBeNull();
  });
});
