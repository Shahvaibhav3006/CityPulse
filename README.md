# CityPulse AI — Supabase Production Edition

## What works
- Supabase email/password registration and login
- New users default to PENDING
- Approval-based RBAC
- Persistent incidents, fleets, coverage, work orders, verifications and audit trail
- SLA countdown/overdue UI
- Recurring defect intelligence
- Repair re-verification: resolve or reopen
- Responsive command-center UI
- Vercel-ready Vite deployment

## 1. Supabase
1. Create a Supabase project.
2. SQL Editor -> New query -> paste `supabase/schema.sql` -> Run.
3. Project Settings / API: copy Project URL and Publishable key (or anon key on older UI).
4. Authentication -> URL Configuration: set Site URL to your final Vercel URL after deployment. Add `http://localhost:5173/**` for local testing.
5. Authentication -> Providers -> Email: keep email/password enabled. For hackathon demo you may disable Confirm Email; for a real deployment keep verification enabled.

### First admin
Register your own account once. In Supabase Table Editor -> profiles -> your row:
- status = APPROVED
- role = COMMAND_CENTER
This bootstraps the first administrator. After that, approve other users inside CityPulse -> User Approvals.

## 2. Local run
Copy `.env.example` to `.env` and fill:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```
Then:
```
npm install
npm run dev
```
Open http://localhost:5173

## 3. GitHub
Create an empty GitHub repository. From this project root:
```
git init
git add .
git commit -m "CityPulse AI Supabase production app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```
Never commit `.env`.

## 4. Vercel
- Add New -> Project -> Import your GitHub repository.
- Framework should detect Vite.
- Build Command: `npm run build`
- Output Directory: `dist`
- Add Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Deploy.
- Copy the generated `https://...vercel.app` URL.
- Return to Supabase Authentication -> URL Configuration and set Site URL to it; add the same URL with `/**` to Redirect URLs.

## Security
The publishable Supabase key is intentionally used in the browser. Access is protected by Supabase Auth + Row Level Security policies in `schema.sql`. Never put a Supabase service-role/secret key in a `VITE_` variable.

## AI service
This package does not fake a trained YOLO pothole model. The operational workflow is production-backed; a Python/OpenCV/YOLO inference service can later insert observations/incidents through a protected server endpoint.
