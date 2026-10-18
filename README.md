# JobRepo — Checklist

Live site: https://jobtest-beta.vercel.app · Detailed plan: [ROADMAP.md](ROADMAP.md)

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
- [x] Job board with search, "Remote only" and role filters — **empty for now** (no fake jobs; shows "No jobs posted yet")

## ⬜ Not finished

**Login system**
- [ ] Employer-only pages (needs the roles from Step 3)

**Front page leftovers**
- [ ] "Companies" and "For founders" links just scroll to the job list

**Step 3: Accounts**
- [ ] Choose a role: job seeker, employer or both
- [ ] Profiles and a profile editor
- [ ] Resume upload
- [ ] Public profile page
- [ ] Companies, company pages, inviting recruiters
- [ ] Settings page

**Step 4: Job posting (employers)**
- [ ] Jobs table in Appwrite
- [ ] Post-a-job form with preview
- [ ] Employer's job list with views and applicant counts
- [ ] Draft / open / closed status

**Step 5: Job board (seekers)**
- [ ] Real search and filters (location, salary, level, skills)
- [ ] A details page for each job
- [ ] Saved jobs

**Step 6: Applications**
- [ ] One-click apply with your saved profile and resume
- [ ] "My applications" status tracker
- [ ] A board where employers can move applicants through stages

**Step 7: Polish**
- [ ] Final design pass
- [ ] Email the employer when someone applies
- [ ] Automatically close expired jobs

**Later**
- [ ] Messaging
- [ ] Job alerts
- [ ] Admin tools for moderating posts
