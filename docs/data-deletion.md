# Removing all Pisga data at programme end

By decision, the site and all personal data are removed when the programme ends. This is the
procedure. It is destructive and cannot be undone. Rehearse it on the development project
before the programme ends.

**Owner of the procedure:** _to be named_ · **Planned date:** _to be set_

## What exists and where

| Data | Location |
|---|---|
| Journal entries, north-star versions, mapping answers, advisor summaries | Supabase, schema `pisga` |
| Session content, statements, questions, settings | Supabase, schema `pisga` |
| Session documents | Supabase Storage, bucket `pisga-materials` |
| Accounts (e-mail addresses, password hashes) | Supabase `auth.users`, shared with other NGG apps |
| Advisor conversations | At the advisor provider, once the advisor exists (retention is an open item) |
| The site | Vercel project and its domain |
| Participant list used for provisioning | Wherever it was kept locally; not in the repository |

The app stores nothing on participants' devices apart from the sign-in session, which ends
when the account is deleted. Documents that participants downloaded or exported are outside
the system's reach; tell participants in advance that the journal will be removed, so that
they can export it first.

## Steps

1. **Announce.** Give participants a date and remind them of the export in `יומן מסע`.
2. **Take the site offline.** Remove the domain from the Vercel project or delete the project.
3. **Run `supabase/teardown/pisga_teardown.sql` step by step.** It is written to be run one
   step at a time:
   1. Record the number of accounts per role.
   2. List the accounts that belong to Pisga only. The project is shared: an account that
      also belongs to another NGG app keeps existing and only loses its Pisga data. The
      query must be extended with the other apps' membership tables before it is trusted.
   3. Delete the files and the bucket `pisga-materials`.
   4. Delete the Pisga-only accounts.
   5. Drop the storage policies and the schemas `pisga` and `pisga_private`.
   6. Verify that nothing remains.
4. **Advisor provider.** Delete conversations, the knowledge base and the agent at the
   provider, and revoke its API key.
5. **Backups.** Supabase keeps database backups for a period that depends on the plan.
   Establish that period and record the date on which the last backup containing Pisga
   data expires. Until then the data is not fully gone.
6. **Other copies.** Delete the participant list, any exports made for support purposes,
   and the Vercel environment variables. Remove the redirect URLs from Supabase.
7. **Record.** Note who carried out each step and when, and keep the record with the
   programme file.

## Removing one person during the programme

Deleting the person's row in `auth.users` removes their membership, profile, journal,
mapping answers and advisor summary through cascading deletes. If the person also uses
another NGG app, delete their rows in the `pisga` tables instead and leave the account.
