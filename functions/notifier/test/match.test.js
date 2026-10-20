// Tests for job alert matching. Run: npm test (from functions/notifier).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceMiles, matchesAlert } from '../src/match.js';

const job = {
  title: 'Senior Virologist',
  companyName: 'Umbrella Corporation',
  role: 'Engineering',
  description: 'Lab work',
  skills: ['Virology', 'Python'],
  workplace: 'On-site',
  type: 'Full-time',
  level: 'Senior',
  companySize: '200+',
  salaryMin: 120000,
  salaryMax: 160000,
  equity: null,
  visaSponsorship: true,
  lat: 41.8789,
  lng: -87.6359,
};

test('an empty search matches everything', () => {
  assert.equal(matchesAlert(job, {}), true);
});

test('keyword, role and skills', () => {
  assert.equal(matchesAlert(job, { q: 'virologist umbrella', role: 'Engineering|Design', skills: 'python' }), true);
  assert.equal(matchesAlert(job, { q: 'designer' }), false);
  assert.equal(matchesAlert(job, { role: 'Sales' }), false);
  assert.equal(matchesAlert(job, { skills: 'Rust' }), false);
});

test('salary, equity and visa', () => {
  assert.equal(matchesAlert(job, { sal: '150000' }), true);
  assert.equal(matchesAlert(job, { sal: '200000' }), false);
  assert.equal(matchesAlert(job, { equity: '1' }), false);
  assert.equal(matchesAlert({ ...job, equity: '0' }, { equity: '1' }), false);
  assert.equal(matchesAlert({ ...job, equity: '0.5%' }, { equity: '1' }), true);
  assert.equal(matchesAlert(job, { visa: '1' }), true);
});

test('distance from a place', () => {
  assert.equal(matchesAlert(job, { near: '41.88,-87.63', r: '10' }), true);
  assert.equal(matchesAlert(job, { near: '40.71,-74.00', r: '50' }), false);
  assert.ok(distanceMiles({ lat: 41.8781, lng: -87.6298 }, { lat: 40.7128, lng: -74.006 }) > 700);
});
