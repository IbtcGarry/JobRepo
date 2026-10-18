# JobTest Roadmap

Stack: **Angular (TypeScript) → Appwrite (Auth, Database, Storage, Functions) → Vercel**

## Step 1 — Project setup
- [x] Create GitHub repo (`JobRepo`)
- [x] Scaffold Angular app in `frontend/`
- [x] Install Appwrite SDK and shared client (`frontend/src/app/core/appwrite.ts`)
- [x] Add `appwrite.json` and `functions/` folder
- [x] Add Vercel config (`vercel.json`)
- [x] Create Appwrite Cloud project (JobTesting, Frankfurt) and add its ID to `environment.ts` / `appwrite.json`
- [x] Add Vercel domain as a Web platform in Appwrite
- [x] Deploy to Vercel as **JobTest** (https://jobtest-beta.vercel.app)

## Front page
- [x] YC-style landing page + job board layout (ported from Lovable "Startup Career Hub")
- [x] Search, remote-only filter, role filters (on sample jobs)
- [ ] Swap sample jobs for the Appwrite `jobs` table (Steps 4–5)

## Step 2 — Login system
- [x] `AuthService` (current user signal, login, signup, logout)
- [x] `/signup` and `/login` pages
- [x] Email verification (`/verify-email`)
- [x] Password reset (`/forgot-password`)
- [ ] OAuth: Google, GitHub, LinkedIn (buttons built — enable providers in Appwrite console)
- [x] Route guards: `authGuard`, `guestGuard`
- [ ] `employerGuard` (needs roles from Step 3)

## Step 3 — Accounts (seeker / employer / both)
- [ ] `/onboarding` — choose role(s)
- [ ] `profiles` table + seeker profile editor
- [ ] Resume upload (Storage bucket)
- [ ] Public profile page `/profile/:id`
- [ ] `companies` table + Appwrite Teams for company members
- [ ] Company create / edit / public page `/company/:slug`
- [ ] Invite recruiters to a company team
- [ ] `/settings`

## Step 4 — Job posting (employer)
- [ ] `jobs` table + permissions
- [ ] `/employer/jobs/new` — post form with preview
- [ ] `/employer/jobs` — list with view / applicant counts
- [ ] Draft / open / closed status

## Step 5 — Job board (seeker)
- [ ] `/jobs` — search + filters (role, location, remote, salary, level, skills)
- [ ] `/jobs/:id` — job details page
- [ ] Saved jobs

## Step 6 — Applications
- [ ] `applications` table + permissions
- [ ] Easy Apply with saved profile / resume
- [ ] `/me/applications` — applicant status tracker
- [ ] `/employer/jobs/:id/applicants` — pipeline board

## Step 7 — Polish & functions
- [ ] YC-style minimal design pass (typography, white space)
- [ ] Function: email employer on new application
- [ ] Function: auto-close expired jobs

## Later
- [ ] Messaging
- [ ] Job alerts
- [ ] Admin / moderation
