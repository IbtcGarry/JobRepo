# JobRepo — Checklist

Live site: https://jobtest-beta.vercel.app · Detailed plan: [ROADMAP.md](ROADMAP.md)

Docs: [Architecture diagram](docs/ARCHITECTURE.md) · [Developer guide](DEVELOPING.md) · [Roadmap](ROADMAP.md) · [Backend function](functions/README.md)

## ✅ Finished

**Setup**
- [x] GitHub repo `JobRepo`
- [x] Angular app connected to the Appwrite project **JobTesting** (Frankfurt)
- [x] Hosted on Vercel; every push to `main` goes live automatically
- [x] Vercel address allowed to talk to Appwrite

**Login system**
- [x] Sign up, log in, log out with **username + password** (no email; this is a dummy site)
- [x] Logged-out people can't open private pages; logged-in people skip the login page
- [x] `/account` page

**Front page**
- [x] Lovable "Startup Career Hub" layout rebuilt in Angular
- [x] Same look across the whole site: off-white, orange, square corners, Space Grotesk + DM Sans fonts
- [x] Header with logo and links, which changes when you're logged in
- [x] Top section with headline and Get started / Log in buttons
- [x] Job board — **empty for now** (no fake jobs; shows "No jobs posted yet")
- [x] In-depth job filters: keyword + location search, role, workplace (remote / hybrid / on-site), job type, experience level, company size, minimum salary, skills, date posted, equity, visa sponsorship, sort by newest or salary, "Clear all" — each filter is its own dropdown menu

**Accounts**
- [x] Account page with **Profile** and **Company** tabs
- [x] Profile: occupation, bio, resume upload (PDF / Word), profile picture (also shown in the header)

**Companies**
- [x] Company pages (`/company/:id`): logo, name, locations, bio
- [x] Edit company page: name, bio, add / remove locations, upload logo
- [x] Companies list (`/companies`, linked from the header)
- [x] Users can be a company's owner, manager or member; owners and managers get an "Edit company page" button
- [x] Sample company: **Umbrella Corporation** (owned by `garry`)

**Jobs**
- [x] Company tab → **Job listings**: post, edit and remove jobs; each job shows its applicant count
- [x] Required for every job: **title, role, salary, full street address, description**
- [x] Address must be a real street address (checked with OpenStreetMap) that can be pasted into Google Maps; stored with lat/lng for future map features, and each job links to Google Maps
- [x] Optional details (workplace, job type, experience, company size, equity, skills, visa) power the board's filters
- [x] Jobs appear on the job board, the company page and a job details page (`/jobs/:id`)

**Job map search (apartment-site style, `/map`)**
- [x] "View map" button next to the front page headline
- [x] Split view: job list on the left, map on the right; phones get a Map / List toggle
- [x] Salary "price tag" pins (e.g. `$90K+`); jobs at one address share a pin ("2 jobs"); nearby pins merge into numbered clusters that zoom in when clicked
- [x] Place search (city, ZIP code or address), "Near me" (browser location), distance radius (5–100 mi) drawn as a circle
- [x] Distance on every card, "Closest" sort, plus Newest / Highest salary
- [x] Same filters as the job board (role, workplace, job type, experience, company size, salary, skills, date posted, perks) + keyword search
- [x] "Search as I move the map" (list shows only jobs in view), or turn it off and use "Search this area"; "Show all N" zooms out to every match
- [x] Hovering a card highlights its pin; clicking a pin highlights and scrolls to its card and opens a popup (title, salary, address, Open in Google Maps); "Show on map" on each card
- [x] The whole search is saved in the page address, so it can be bookmarked or shared and survives a reload

**Company admin**
- [x] Admin page per company (`/company/:id/admin`), linked from the Company tab and the company page; only owners / managers see it
- [x] Totals: jobs, open, closed, applicants, posters
- [x] Table of every job under the company: title, posted by, date, salary, **View applicants (count)** button, screening questions (count + must-haves, or "Add questions"), status
- [x] Close / reopen jobs — closed jobs leave the job board and company page and can't be applied to, but stay in admin
- [x] View / edit / remove from each row; All / Open / Closed tabs

**Applications**
- [x] Apply button works: log in, add an optional note, send your profile + resume; shows "✓ You applied" afterwards
- [x] **Applicants** page per job: each applicant's picture, username, occupation, bio preview, resume status
- [x] **View application** page: resume (opens the file), note, and the applicant's bio
- [x] **Interview** / **Reject** buttons next to View application; the choice shows as a badge (click again to undo)
- [x] **View applicants** button for company owners / managers on the job page, the company page's job cards, and the Company tab

**Screening questions (like Indeed / LinkedIn)**
- [x] Employers add up to 10 questions when posting or editing a job: Yes / No, Number, Short answer, Multiple choice
- [x] One-click common questions (work authorization, visa sponsorship, years of experience, commute, education, salary expectations, start date, driver's license)
- [x] Each question can be required, and Yes/No, Number and Multiple-choice questions can be a **must-have** with an ideal answer / minimum
- [x] Applicants answer them on the apply page; required ones must be answered
- [x] Applicants list shows "Meets must-haves" / "Missed N must-haves"; View application shows every answer with ✓ / ✗

**Accounts & roles**
- [x] Onboarding after sign-up: looking for a job, hiring, or both; employers can create their company there
- [x] Public profiles (`/profile/:id`) with a public / private setting
- [x] Settings (`/settings`): change username or password, roles, profile visibility, job alerts
- [x] Create a company from the site; owners invite recruiters by username (manager / member); invites accepted on the account page
- [x] Employer-only pages (`employerGuard`) and a moderator-only page (`moderatorGuard`)

**Jobs**
- [x] Save as draft, **Preview** before posting, Publish; optional closing date ("Closes on")
- [x] View counts and drafts on the company admin page
- [x] Expired jobs leave the board straight away and are closed by the hourly function
- [x] **☆ Save** jobs (board, job page) and a Saved jobs page (`/saved`)
- [x] Removing a job also removes its applications
- [x] Job cards show the company's logo (the same one as on the company page)
- [x] Example listings: one Umbrella Corporation job per role, covering every filter option

**Applications**
- [x] My applications (`/applications`): every application with its stage; Withdraw
- [x] Pipeline board for employers: New → Reviewing → Interview → Offer → Hired / Rejected (drag and drop, or the stage menu)

**Notifications, messaging, alerts, moderation**
- [x] Notifications (new applicants, stage changes, invites, job alerts) are created by the Node.js function; there's no bell in the header (removed on request)
- [x] Messages (`/messages`, live): message an employer from a job, an applicant from the applicants page, anyone from their profile
- [x] Job alerts: **Alert me** on the map saves the search; you're notified when a matching job is posted
- [x] Report a job, company or profile; moderators review reports at `/admin`

**Backend (Node.js)**
- [x] Appwrite Function `notifier` (Node.js 22, `functions/notifier/`) — notifications, job alerts, closing expired jobs; unit tested

**Developer experience**
- [x] Every page / component split into `.ts`, `.html` (and `.scss`); every function documented
- [x] Styles split by area in `frontend/src/styles/`; all pages lazy-loaded
- [x] `DEVELOPING.md` — how the code is organised, how to run, test, deploy, and common recipes

## ⬜ Not finished

- [ ] Real permissions — right now any signed-in user can read profiles / resumes / applications and edit any company's data; the guards only hide pages (fine for a dummy site)
- [ ] Draw-your-own-area search on the map
- [ ] Optional: switch the map to Google Maps (needs a Google Maps API key)
