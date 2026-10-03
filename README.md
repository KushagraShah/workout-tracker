# Workout Tracker

A personal, single-user workout tracker built as a free replacement for a Notion-based
workout setup. It keeps the useful structure of the original system (an exercise catalogue,
machines with setup parameters and reference videos, routines with rounds) while making
workout logging faster and the history more visible.

> **AI-assisted development:** this project is built with AI assistance (planning,
> implementation, review and debugging) under human direction. Product requirements,
> design decisions and final acceptance are guided by the author.

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

Deferred deliberately: Notion import and richer analytics.

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
2. In **Authentication → Users → Add user**, create your single account (email + password,
   *Auto Confirm*). Set a display name via the user's metadata if you want one.
3. In **Authentication → Providers → Email**, turn *Allow new users to sign up* **off** — the
   app is sign-in only and this keeps it single-user.
4. In **Authentication → URL Configuration**, set the Site URL and Redirect URLs to
   `https://<user>.github.io/workout-tracker/` (plus `http://localhost:5173/workout-tracker/`
   for local development).

## Deploy (GitHub Pages)

The workflow at `.github/workflows/deploy.yml` runs lint + build on every push to `main` and
publishes `dist/`.

1. Repository **Settings → Pages → Build and deployment → Source = GitHub Actions**.
2. Repository **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Never commit `.env` — it is git-ignored; `.env.example` documents the keys.

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

- Single user only; there is no sign-up UI.
- Supabase free tier has no automatic backups of its own — JSON export (Phase 3) is the
  safety net, and the free-tier project is kept awake with a manual keepalive ping.
- Offline support is a Phase 3 concern; Phase 1 ships a minimal installable PWA shell.

