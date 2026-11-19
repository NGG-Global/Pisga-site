# Deployment on Vercel

The app is a static single-page build. Vercel serves the files; the browser talks to Supabase
directly. No participant data passes through or is stored on Vercel.

`vercel.json` already defines the build, the single-page routing and the security headers.
The steps below follow Vercel's standard Git workflow; confirm menu names against the current
Vercel documentation.

## 1. Before the first deployment

- [ ] Decide the repository's visibility. The repository is currently **public**. Vercel
      deploys from private repositories as well.
- [ ] Complete `docs/supabase-setup.md` on the development project and run the app against it.
- [ ] Decide the domain (open item).

## 2. Create the Vercel project

1. In Vercel, add a new project and import the GitHub repository.
2. Framework preset: Vite (taken from `vercel.json`). Build command `npm run build`, output
   directory `dist`. Node.js 20 or later.
3. Add the environment variables below.
4. Deploy.

| Variable | Production | Preview |
|---|---|---|
| `VITE_SUPABASE_URL` | Production project URL | Development project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production publishable key | Development publishable key |
| `VITE_DEMO_MODE` | `false` | `false`, or `true` for a preview without a backend |

Only the publishable key belongs here. `VITE_*` values are embedded in the files sent to the
browser, so the secret key must never be given such a name.

If neither a backend nor demo mode is configured, the site shows a "not configured" notice
instead of the login screen.

## 3. After the first deployment

- [ ] Add the custom domain in Vercel and point DNS to it.
- [ ] In Supabase, set the Site URL and add `https://<domain>/reset-password` to the redirect
      URLs.
- [ ] Sign in with a test account of each role and walk through the screens.
- [ ] Request a password link and confirm that the e-mail arrives and the link opens the
      password screen.

## 4. The brand typeface

The licensed Ploni files are not in the repository, so a build from GitHub is set in Heebo,
the approved fallback. To ship Ploni there are two routes:

- **Private repository:** if the licence permits, commit the four WOFF2 files to
  `public/fonts/` (remove the two font lines from `.gitignore`).
- **Local build:** place the files in `public/fonts/` on a trusted machine and deploy a
  locally built output with the Vercel CLI (`vercel build`, then `vercel deploy --prebuilt`;
  verify the commands in the Vercel CLI documentation).

Never commit the files to a public repository.

## 5. Security headers

`vercel.json` sets a content-security policy, forbids framing, disables indexing by search
engines, and disables camera, microphone and location.

- The policy allows connections to `*.supabase.co`. If Supabase is given a custom domain,
  add it to `connect-src`.
- If the advisor becomes a voice conversation, `microphone=()` in `Permissions-Policy` and
  the provider's addresses in `connect-src` must be changed deliberately at that point.

## 6. A note on the hosting decision

The design hand-off records Cloudflare as the agreed host. This repository is prepared for
Vercel as requested. Nothing in the code depends on the host: the build output in `dist/`
can be served by either. The change should be confirmed with whoever agreed the original
decision, including Maccabi's requirements on data location (open item).
