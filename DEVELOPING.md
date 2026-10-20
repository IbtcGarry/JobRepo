# Developing JobTest

A short guide for developers joining the project. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for a diagram of how everything connects. Every source file starts with a comment explaining it,
every function has a doc comment, and every HTML template labels its sections.

## Stack

| Part | Tech | Where |
| --- | --- | --- |
| Website | Angular 21, TypeScript, SCSS | `frontend/` |
| Accounts, database, file storage | Appwrite Cloud, project **JobTesting** | `appwrite.json` lists every table, column and bucket |
| Server code | Node.js 22 Appwrite Function `notifier` | `functions/notifier/` |
| Hosting | Vercel (deploys `main` automatically) | `vercel.json` |
| Maps | Leaflet + OpenStreetMap (address lookup: Nominatim) | `frontend/src/app/pages/map`, `core/geocode.ts` |

## Run it

```bash
cd frontend
npm install
npm start                      # http://localhost:4200, reloads on save
npx ng test --watch=false      # unit tests (data/*.spec.ts)
npx ng build                   # production build — must pass before pushing

cd ../functions/notifier
npm install && npm test        # function tests
```

## How the frontend is organised (`frontend/src/app/`)

| Folder | What goes there | Rule |
| --- | --- | --- |
| `pages/` | One component per page (`.ts` logic, `.html` layout, optional `.scss`) | Pages never call Appwrite directly — they use a service |
| `shared/` | Components used on several pages (`<app-job-card>`, `<app-save-job>`, …) | Inputs in, events out; no page-specific logic |
| `core/` | Services that talk to Appwrite (one per table) + route guards | Convert rows to plain types in a `toX()` function |
| `data/` | Pure functions and types (filters, distances, formatting) | No Angular, no Appwrite — easy to unit test |
| `../styles/` | Site-wide styles split by area; `_tokens.scss` holds every colour | Component-only styles go in the component's `.scss` |

Conventions used everywhere:
- **Every function has a doc comment** saying what it does and which button or event runs it.
- **Template actions call one named method** (`(click)="remove(job)"`), never inline logic.
- **State is signals**: `signal()` for values, `computed()` for derived values, `resource()` to load data.
- **Pages are lazy-loaded** in `app.routes.ts`, grouped by who can open them.

## Recipes

**Add a page**
1. Create `pages/<name>/<name>.ts` + `.html` (copy a small page such as `pages/saved/`).
2. Add a route in `app.routes.ts` under the right group, with the right guard.
3. Link to it (header links live in `app.html`).

**Add a column to a table**
1. Add it in the Appwrite Console (JobTesting → Databases → `main` → table → Columns).
2. Record it in `appwrite.json`.
3. Add it to the type in `data/` or `core/` and to the service's `toX()` function.

**Add a notification**
Notifications are written by `functions/notifier/src/main.js` (add a branch for the new event and
subscribe the function to that event in Appwrite), or from the frontend for user-driven events.

**Add a filter**
Add the field to `JobFilters` in `data/job-filters.ts`, handle it in `filterJobs()` (with a test),
add a dropdown in `shared/job-filter-bar.html`, and — for job alerts — mirror it in
`data/map-search.ts` and `functions/notifier/src/match.js`.

## Deploying

- **Website:** commit and push to `main`; Vercel builds `frontend/` and deploys in about a minute.
- **Function:** see `functions/README.md`.
- **Appwrite schema:** changes are made in the Appwrite Console; keep `appwrite.json` in sync.

## Security note

JobTest is a dummy site: permissions are deliberately loose (any signed-in user can read profiles,
resumes and applications). The guards only hide pages. Tighten table / bucket permissions before
using it for real data.
