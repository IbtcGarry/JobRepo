# JobTest Roadmap

Stack: **Angular 21 (TypeScript) frontend → Appwrite Cloud (Auth, Database, Storage) + a Node.js
Appwrite Function → Vercel**. Every step below is finished; see `README.md` for the full checklist.

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
- [x] Search and filter dropdowns, shared with the map
- [x] Real jobs from the Appwrite `jobs` table (no sample jobs)

## Step 2 — Login system
- [x] `AuthService` — username + password only, no email (dummy site); change username / password in Settings
- [x] `/signup` and `/login` pages
- [x] Route guards: `authGuard`, `guestGuard`
- [x] `employerGuard` (company owners / managers) and `moderatorGuard` (site moderators)

## Step 3 — Accounts (seeker / employer / both)
- [x] `/onboarding` — choose role(s); employers can create their company right away
- [x] `profiles` table + profile editor (occupation, bio, picture)
- [x] Resume upload (Storage bucket `uploads`)
- [x] Public profile page `/profile/:id` (public / private setting)
- [x] `companies` table + company members (owner / manager / member) — invites are rows, because Appwrite Teams needs real email invitations
- [x] Company create / edit / public page `/company/:id`
- [x] Invite recruiters to a company by username; accept / decline on the account page
- [x] `/settings`

## Step 4 — Job posting (employer)
- [x] `jobs` table (required: title, role, salary, verified Google-Maps address, description)
- [x] `/company/:id/jobs/new` — post form with **Preview**, screening questions, closing date
- [x] Company admin `/company/:id/admin` — every job with views and applicant counts
- [x] Draft / open / closed status (Save as draft, Publish, Close / Reopen)

## Step 5 — Job board (seeker)
- [x] Board search + filters (role, location, workplace, salary, level, skills, …)
- [x] `/jobs/:id` — job details page
- [x] `/map` — apartment-site style map search
- [x] Saved jobs (`/saved`)

## Step 6 — Applications
- [x] `applications` table
- [x] Easy Apply with saved profile / resume + screening questions
- [x] `/applications` — applicant status tracker (withdraw too)
- [x] `/company/:id/jobs/:jobId/applicants` — list + **pipeline board** (New → Reviewing → Interview → Offer → Hired / Rejected, drag and drop)

## Step 7 — Polish & functions
- [x] YC-style minimal design pass (typography, white space, focus states)
- [x] Function: notify the employer of a new application — **in-app notifications** (the site has no real emails)
- [x] Function: auto-close expired jobs (hourly)

## Later
- [x] Messaging (`/messages`, live)
- [x] Job alerts (save a map search; notified when a matching job is posted)
- [x] Admin / moderation (report jobs, companies, profiles; `/admin` for moderators)
