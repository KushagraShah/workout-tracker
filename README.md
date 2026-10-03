# Workout Tracker

A personal workout tracker: an exercise catalogue, machines with their setup parameters and
reference videos, and routines with rounds — built so that logging a session is quick and the
history is easy to read.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) |
| Routing | React Router (HashRouter, GitHub Pages friendly) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Mobile | Installable PWA |

## Roadmap (3 phases)

- **Phase 1 — Foundation, data model & catalogue:** project scaffold, auth, full database
  schema with RLS, and management of exercises, machines, machine links and muscle groups.
  *(current)*
- **Phase 2 — Routine setup & workout execution:** routines/days/items with rounds
  (Fixed / Round-N), the Home workout screen, and the full set-logging runner
  (weight × reps, notes, machine switching, substitution, out-of-order, done/skip, advance).
- **Phase 3 — History, data portability & polish:** per-exercise history, JSON/CSV
  export & restore, keepalive ping, PWA offline caching, sync/retry.

Deliberately out of scope for now: importing existing data from other tools, and richer
analytics.

## Concepts

- **Muscle group → muscle → exercise.** A "Delts" group contains "Rear Delts", which
  exercises target.
- **Machine** = a specific physical apparatus. **Exercise ↔ machine** links carry the
  setup parameters (seat height, handle/grip), a reference video and notes for that
  exercise *on that machine*.
- **Routine → routine day → routine item (slot).** A slot has an order and — mirroring the
  original system — a round membership: **Fixed** (every round), **Round 1/2/…** (only that
  round) or **Hidden** (not in that day). Rounds are the "variants".
- **Session → session exercises → sets.** Sessions snapshot the routine so later edits never
  rewrite history.

## Local development

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
npm run dev               # http://localhost:5173/workout-tracker/
npm run lint
npm run build
npm run preview
```

## Supabase setup

1. Create a project, then in the SQL editor run **`scripts/001_schema.sql`** once. It creates
   every table, indexes, the `updated_at` triggers and the Row Level Security policies
   (scoped to `auth.uid() = user_id`). It is safe to re-run.
   - **Set the SQL Editor's "Run as" dropdown (top-right) to `postgres`** first. It defaults
     to `authenticated`, which lacks `CREATE` on the `public` schema and fails with
     `42501: permission denied for schema public`.
2. In **Authentication → Providers → Email**, turn **Confirm email** *off* so a newly created
   account can be used straight away. Leave *Allow new users to sign up* **on**.
   - With *Confirm email* on, `signUp` returns a user but no session, and the app asks the user
     to check their inbox instead. Following a confirmation link would also need
     `detectSessionInUrl` enabled in `src/lib/supabase.ts`, which the HashRouter setup avoids.
3. In **Authentication → URL Configuration**, set the Site URL and Redirect URLs to
   `https://<user>.github.io/workout-tracker/` (plus `http://localhost:5173/workout-tracker/`
   for local development).
4. Create accounts through the app's **Sign up** form. It asks for a name, which is stored as the
   `display_name` user metadata and shown in the header and on the home screen.

## Deploy (GitHub Pages)

The workflow at `.github/workflows/deploy.yml` runs lint + build on every push to `main` and
publishes `dist/`.

1. Repository **Settings → Pages → Build and deployment → Source = GitHub Actions**.
2. Repository **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Never commit `.env` — it is git-ignored; `.env.example` documents the keys.

**Why not a `gh-pages` branch?** GitHub's *Deploy from a branch* mode only runs Jekyll (or a
plain passthrough with `.nojekyll`) — it cannot run `npm run build`. Publishing this app from a
branch would therefore mean committing the compiled `dist/` output into git on every deploy
(and, for a local deploy script, losing the lint/build gate on push). The GitHub Actions
artifact flow used here is the documented approach when you need a real build step and don't
want a dedicated branch holding compiled files. `deploy-pages` also ties each deployment to the
exact source commit, visible under the repository's **Deployments**. The `VITE_SUPABASE_*`
values are not sensitive — `VITE_SUPABASE_ANON_KEY` ships in the client bundle by design, and
row-level security is what actually protects the data.

## Project structure

```
src/
  components/     Layout, Modal and small UI primitives
  contexts/       auth context / provider / hook
  lib/supabase.ts Supabase client + configuration check
  pages/          Auth, Home, Exercises, Exercise detail, Machines, Muscles
  services/       all Supabase reads/writes (UI never talks to the DB directly)
  types/          shared domain types and option lists
scripts/          001_schema.sql (run in the Supabase SQL editor)
public/           PWA manifest, icon, minimal service worker
```

## Known limits

- Every row is scoped to its owning account by Row Level Security (`auth.uid() = user_id`), so
  accounts never see each other's data. There are no shared or team features.
- Supabase free tier has no automatic backups of its own — JSON export (Phase 3) is the
  safety net, and the free-tier project is kept awake with a manual keepalive ping.
- Offline support is a Phase 3 concern; Phase 1 ships a minimal installable PWA shell.

