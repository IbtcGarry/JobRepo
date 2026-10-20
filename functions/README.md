# Appwrite Functions (Node.js backend)

JobTest's frontend talks to Appwrite directly. Server-side work lives here as **Appwrite
Functions written in Node.js** (runtime `node-22`), one folder per function.

## `notifier/`

| Trigger | What it does |
| --- | --- |
| `applications` row created | Notifies the company's owners and managers: "X applied to Y" |
| `applications` row updated | Notifies the applicant: "Your application for Y is now: Interview" |
| `jobs` row created / updated (status `open`) | Notifies users whose job alerts match the job — once per job (`alertsSentAt`) |
| `invites` row created | Notifies the invited user |
| Every 60 minutes (interval) | Closes open jobs whose `expiresAt` has passed |
| Manual run with body `{"task": "close-expired"}` | The same clean-up, on demand (Console → Functions → notifier → Execute) |

It writes to the `notifications` table, which the website's bell reads live.

- `src/main.js` — entry point: picks the job to do from the trigger / event headers.
- `src/match.js` — job alert matching (mirrors `frontend/src/app/data/job-filters.ts`).
- `test/match.test.js` — tests: `cd functions/notifier && npm install && npm test`.

### Deploying a change

The function is configured in Appwrite (see `appwrite.json` → `functions`). To deploy new code,
package the folder without `node_modules` and upload it as a new deployment:

```bash
cd functions/notifier
tar --exclude node_modules -czf code.tar.gz package.json package-lock.json src
# Appwrite Console → Functions → notifier → Deployments → Create deployment → upload code.tar.gz
# (entrypoint: src/main.js, build command: npm install)
```

Or with the Appwrite CLI: `appwrite push functions` from the repo root.
