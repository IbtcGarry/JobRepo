// Job alert matching: does a newly posted job fit a saved search?
// `params` is the search exactly as the map stores it in its page address
// (frontend/src/app/data/map-search.ts): q, role, wp, type, lvl, size, sal, skills, equity, visa, near, r.
// Keep this in step with filterJobs() in frontend/src/app/data/job-filters.ts.

/** Miles between two { lat, lng } points (great-circle distance). */
export function distanceMiles(a, b) {
  // Degrees to radians.
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "Engineering|Design" → ['Engineering', 'Design']; missing → []. */
function list(value) {
  return (value ?? '').split('|').map((v) => v.trim()).filter(Boolean);
}

/** True when the job is in the list, or the list is empty (no filter). A job missing the field fails. */
function inList(selected, value) {
  return selected.length === 0 || (value != null && selected.includes(value));
}

/** True when an open job matches every filter in the saved search. */
export function matchesAlert(job, params) {
  const text = [job.title, job.companyName, job.role, job.description, ...(job.skills ?? [])].join(' ').toLowerCase();
  const words = (params.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((w) => text.includes(w))) return false;

  if (!inList(list(params.role), job.role)) return false;
  if (!inList(list(params.wp), job.workplace)) return false;
  if (!inList(list(params.type), job.type)) return false;
  if (!inList(list(params.lvl), job.level)) return false;
  if (!inList(list(params.size), job.companySize)) return false;

  const minSalary = Number(params.sal) || 0;
  if (minSalary && (job.salaryMax ?? job.salaryMin ?? 0) < minSalary) return false;

  // Every skill in the search must be one of the job's skills (case-insensitive).
  const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase());
  if (!list(params.skills).every((s) => jobSkills.includes(s.toLowerCase()))) return false;

  // "0", "0%" or "none" counts as no equity (same rule as hasEquity in data/job-format.ts).
  const equity = String(job.equity ?? '').trim().toLowerCase();
  const offersEquity = !!equity && !/^(0+(\.0+)?\s*%?|none|no|n\/a)$/.test(equity);
  if (params.equity === '1' && !offersEquity) return false;
  if (params.visa === '1' && !job.visaSponsorship) return false;

  // Distance: "near" is "lat,lng"; "r" is miles (0 / missing = any distance).
  const radius = Number(params.r) || 0;
  if (params.near && radius) {
    const [lat, lng] = params.near.split(',').map(Number);
    if (job.lat == null || job.lng == null) return false;
    if (distanceMiles({ lat, lng }, { lat: job.lat, lng: job.lng }) > radius) return false;
  }
  return true;
}
