# Supabase set-up

Two projects are used: the shared NGG user-apps project for production, and a **separate
project for development**. Do every step on the development project first.

Supabase's dashboard and settings change over time. Where a step names a dashboard location,
confirm it against the current Supabase documentation.

## 1. Apply the database scripts

Run the files in `supabase/migrations/` in order, either with the Supabase CLI
(`supabase db push`, if the project's migration history is managed with the CLI) or by pasting
each file into the SQL editor.

| File | Content |
|---|---|
| `…01_pisga_schema.sql` | Schemas `pisga` and `pisga_private`, all tables |
| `…02_pisga_rls.sql` | Privileges and row-level security |
| `…03_pisga_storage.sql` | Private bucket `pisga-materials` and its rules |
| `…04_pisga_reference_data.sql` | The seven gates, twelve session rows, the two known statements, settings |

The scripts create nothing in `public` and touch no other app's objects. They were verified
on a plain local PostgreSQL 16 (`npm run test:db`); they have not yet been run on Supabase.

## 2. Expose the schema to the API

In the project's Data API settings, add `pisga` to the exposed schemas. Do **not** expose
`pisga_private`.

## 3. Authentication settings

- **Disable public sign-up** for the whole project (mandatory; the project is shared).
- Enable the e-mail provider with e-mail and password.
- Set the minimum password length to **10**, to match the app.
- Site URL: the app's production address.
- Redirect URLs: add `https://<domain>/reset-password` for production, for Cloudflare Pages preview
  addresses if they are to be used against the development project, and
  `http://localhost:5173/reset-password` on the development project.
- E-mail delivery: Supabase's built-in sender is intended for testing. Configure a proper
  SMTP service before inviting participants (open item).
- Review the wording of the password-recovery e-mail template; participants receive it in
  order to set their first password.

## 4. API keys

The app needs the project URL and the **publishable** key (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`). The **secret** key is used only by the provisioning script,
on a trusted machine. Never place it in the Cloudflare Pages project's `VITE_*` variables or in the repository.

## 5. Create the accounts

```bash
# 1. Validate the list without touching the project
npm run provision -- participants.csv --dry-run

# 2. Create accounts, memberships and profiles
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run provision -- participants.csv
```

The list has the columns `email, display_name, role` (see `scripts/participants.example.csv`).
Roles: `participant`, `ngg_facilitator`, `maccabi_learning`, `mentor`.

Accounts are created without a password. Each person opens the site, chooses
`שכחתם את הסיסמה?`, and sets a password through the link they receive.

The participant list is personal data. Keep it out of the repository (`.gitignore` blocks
`scripts/*.csv`) and delete local copies after use.

## 6. Enter the content

Sign in with a staff account and open `ניהול תוכן`:

1. **מפגשים** — titles, dates, locations, speakers, documents.
2. **שאלון המיפוי** — the remaining twelve statements and the open question, then publish.
   The questionnaire can be published only when all fourteen statements and the open
   question are in place.
3. **שאלות רפלקציה** — two to four questions per session. They become visible to
   participants on the session's date.
4. **יועץ אישי** — texts only; the advisor stays switched off until it is implemented.

## 7. Who can read personal data

Row-level security prevents every app user, including staff, from reading another person's
journal, mapping answers or advisor summaries. It does **not** restrict people with access
to the Supabase dashboard or the secret key. Restrict that access to the minimum and record
the holders here.

| Name | Access (dashboard / secret key) | Reason | Granted on | Reviewed on |
|---|---|---|---|---|
| | | | | |

## 8. Advisor function

`supabase/functions/pisga-advisor` is a placeholder that fixes the contract and the access
check. It is not implemented and must not be deployed as the advisor. See `docs/open-items.md`.
