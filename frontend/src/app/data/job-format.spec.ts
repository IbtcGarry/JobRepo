import { describe, expect, it } from 'vitest';

import { hasEquity, isExpired, postedAgo, salaryRange, slugify } from './job-format';

describe('job-format', () => {
  it('formats salary ranges', () => {
    expect(salaryRange({ salaryMin: 90_000, salaryMax: 130_000 })).toBe('$90K – $130K');
    expect(salaryRange({ salaryMin: 90_000, salaryMax: null })).toBe('$90K+');
    expect(salaryRange({ salaryMin: null, salaryMax: 130_000 })).toBe('Up to $130K');
    expect(salaryRange({ salaryMin: null, salaryMax: null })).toBeNull();
  });

  it('says how long ago a job was posted', () => {
    const now = Date.parse('2026-10-20T12:00:00Z');
    expect(postedAgo('2026-10-20T11:30:00Z', now)).toBe('just now');
    expect(postedAgo('2026-10-20T07:00:00Z', now)).toBe('5h ago');
    expect(postedAgo('2026-10-17T12:00:00Z', now)).toBe('3d ago');
  });

  it('knows when a job has expired', () => {
    const now = Date.parse('2026-10-20T12:00:00Z');
    expect(isExpired({ expiresAt: null }, now)).toBe(false);
    expect(isExpired({ expiresAt: '2026-10-21T00:00:00Z' }, now)).toBe(false);
    expect(isExpired({ expiresAt: '2026-10-19T23:59:59Z' }, now)).toBe(true);
  });

  it('treats blank, zero and "none" equity as no equity', () => {
    expect(hasEquity({ equity: '0.5% – 1%' })).toBe(true);
    expect(hasEquity({ equity: '0.05%' })).toBe(true);
    for (const e of [null, '', '0', '0%', '0.0 %', 'none', 'N/A']) expect(hasEquity({ equity: e })).toBe(false);
  });

  it('turns company names into address-safe IDs', () => {
    expect(slugify('Umbrella Corporation')).toBe('umbrella-corporation');
    expect(slugify('  Acme & Sons, Inc. ')).toBe('acme-sons-inc');
    expect(slugify('Café Noir')).toBe('cafe-noir');
    expect(slugify('!!!')).toBe('');
  });
});
