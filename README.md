# Pisga · companion web app

The companion site of **פסגה (Pisga)**, the leadership programme NGG runs for Maccabi Healthcare.
A mobile-first, Hebrew, right-to-left single-page app for programme participants, with a
content-management area for programme staff.

| Area | Choice |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend | Supabase (authentication, Postgres with row-level security, file storage) |
| Hosting | Vercel (static build; see `docs/deployment-vercel.md`) |

## Current status

| Part | Status |
|---|---|
| All participant screens from the design hand-off | Built. Checked visually against the design screenshots, in demo mode |
| Content management for staff (sessions, documents, questionnaire, reflection questions, advisor texts) | Built. No design existed; it follows the design system |
| Database schema, row-level security, storage rules | Written. **Verified on a local PostgreSQL** with permission tests for every role (`npm run test:db`) |
| Connection to Supabase (`src/data/supabaseApi.ts`) | Written and type-checked. **Not yet run against a Supabase project**, because no project credentials were available during the build |
| Account provisioning script | Written. Only the list validation (`--dry-run`) has been run |
| Advisor | Screen and contract built; the advisor itself waits for open decisions (see `docs/open-items.md`). Switched off by default |
| Project space | Empty state, by decision. Tables for teams and stages are prepared |
| Vercel configuration | Written (`vercel.json`). **Not yet deployed** |

The first run against the development Supabase project is the next step, and is expected to
surface small adjustments. `docs/open-items.md` lists every assumption made during the build
and every decision still required.

## Run it locally

```bash
npm install
npm run dev          # demo mode: sample data in the browser, no backend needed
```

In demo mode the login screen accepts any address and password, and offers a role and a
date to preview with. Demo data lives only in the browser's local storage.

To work against a Supabase project, create `.env.local` from `.env.example`.

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Type check and production build into `dist/` |
| `npm test` | Unit tests of the programme logic (dates, session status, mapping averages) |
| `npm run test:db` | Applies the migrations to a throw-away local PostgreSQL and runs the permission tests |
| `npm run provision -- <list.csv> [--dry-run]` | Creates accounts from the participant list |

## Structure

```
src/
  theme/brand.ts        The single place for branding: names, logos, every brand colour
  theme/tokens.css      Spacing, shape, motion and type tokens of the design system
  content/strings.ts    Every piece of interface copy (Hebrew), in one place
  data/                 Backend interface, Supabase implementation, demo implementation
  lib/                  Dates (Israel time), programme rules, autosave
  components/           Shell, tab bar, journey mountain, radar chart
  screens/              One file per screen; screens/admin is the staff area
public/brand/           Logos, graphics and icons from the design hand-off, unchanged
public/fonts/           Place for the licensed Ploni files (not in the repository)
supabase/migrations/    Schema, row-level security, storage, reference data
supabase/tests/         Permission tests and the local test runner
supabase/teardown/      Removal script for programme end
supabase/functions/     Advisor Edge Function (placeholder)
scripts/                Account provisioning
docs/                   Set-up, deployment, data deletion, open items
```

## Principles the code keeps to

- **Branding in one file.** Maccabi has not yet approved the final branding. Colours, logo
  paths and names are only in `src/theme/brand.ts`.
- **Content is data.** Session details, mapping statements, reflection questions and advisor
  texts are managed by staff in the app. Only the content supplied at hand-off is seeded.
- **Privacy by database rule, not by interface.** Journal entries, mapping answers,
  north-star sentences and advisor summaries are readable only by the participant who owns
  them. Staff roles have no database policy on those tables.
- **Shared Supabase project.** All tables are in the `pisga` schema, every policy checks
  membership of the Pisga app, and a user of another NGG app who signs in sees nothing.
- **Missing details say so.** Anything not yet determined is shown as `טרם נקבע`.

## Documentation

- `docs/supabase-setup.md` — preparing the Supabase projects and accounts
- `docs/deployment-vercel.md` — deploying on Vercel
- `docs/data-deletion.md` — removing all Pisga data at programme end
- `docs/open-items.md` — assumptions made, wording awaiting approval, open decisions
