# Deployment on Cloudflare

The app is a static single-page build. Cloudflare serves the files; the browser talks to
Supabase directly. No participant data passes through or is stored on Cloudflare.

Cloudflare offers two products that can serve this site, and the repository is prepared for
both. **Use one, not both.**

| | A. Worker with static assets | B. Pages project |
|---|---|---|
| State on 19.11.2026 | **Connected to this repository** (Workers Builds, Worker `pisga-site`) | Not created |
| Configuration in the repository | `wrangler.jsonc`, `public/_headers` | `public/_headers`, `.node-version` |
| Single-page routing | `not_found_handling` in `wrangler.jsonc` | Automatic while there is no top-level `404.html`. **Do not add one** |

The statements below were checked against Cloudflare's documentation in November 2026 and
with Wrangler's local emulation of both products. Dashboard labels change; confirm them in
the dashboard as you go.

## Before the first deployment

- [ ] Complete `docs/supabase-setup.md` on the development project and run the app against it.
- [ ] Decide the domain (open item).
- [ ] Decide who holds the Cloudflare account and who may deploy.

## Variables needed at build time (both routes)

| Variable | Production | Non-production branches |
|---|---|---|
| `VITE_SUPABASE_URL` | Production project URL | Development project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production publishable key | Development publishable key |
| `VITE_DEMO_MODE` | `false` | `false`, or `true` for a preview without a backend |

These values are read when the site is built and are embedded in the files sent to the
browser. Only the publishable key belongs here; the secret key must never be given a
`VITE_` name. A change takes effect at the next build.

If neither a backend nor demo mode is configured, the site shows a "not configured" notice
instead of the login screen.

## A. Worker with static assets (currently connected)

`wrangler.jsonc` describes a Worker that has no server code and serves `dist/`.

In the Cloudflare dashboard, open the Worker `pisga-site` and its build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` (recommended). As a safety net, `wrangler.jsonc` also names this command, and Wrangler runs it before deploying; this was confirmed with the Wrangler command line, but Cloudflare's documentation says Workers Builds does not honour that setting, so do not rely on it alone. With both in place the site is simply built twice |
| Deploy command | `npx wrangler deploy` (the default) |
| Root directory | empty |
| Build variables and secrets | The three `VITE_*` variables above. They are available to the build only, which is what is needed |

- The `name` in `wrangler.jsonc` must stay equal to the Worker's name in the dashboard.
- A build that ends with "Could not detect a directory containing static files" was run on
  a commit without `wrangler.jsonc`. A build that ends with "The directory specified by the
  assets.directory field does not exist" has the file but did not run the build step.
- Workers Builds uses the Wrangler version pinned in `package.json`.
- Commits to other branches run the preview command and produce a preview address.
  Production is also reachable at the Worker's `workers.dev` address unless that is switched
  off. Review both under the Worker's domain settings, and treat any such address as public.

## B. Pages project (alternative)

1. In **Workers & Pages**, create a **Pages** project and connect the GitHub repository.
2. Production branch `main`; framework preset **React (Vite)**; build command
   `npm run build`; build output directory `dist`; root directory empty.
3. Add the variables above under **Settings > Variables and Secrets**, separately for
   Production and Preview.

- `.node-version` pins the build to Node.js 22; Pages does not read `engines` in `package.json`.
- Pages should ignore `wrangler.jsonc`, because it has no `pages_build_output_dir` key.
  Confirm this in the first build log.
- Production is served at the custom domain and at `<project>.pages.dev`. Preview
  deployments (`<hash>.<project>.pages.dev`, `<branch>.<project>.pages.dev`) are **public
  by default**. The access policy under **Settings > General** restricts previews only, not
  `<project>.pages.dev` or the custom domain.
- If Pages is chosen, disconnect the Worker from the repository, so that the same commit is
  not built and published twice.

## Preview addresses and data

Whichever route is used, preview and default Cloudflare addresses are reachable by anyone
who has the link. Every address still requires a sign-in to show programme content, and the
site sends `X-Robots-Tag: noindex` everywhere. Even so, builds of non-production branches
should use the **development** Supabase project or demo mode, never production data.

## After the first deployment

- [ ] Add the custom domain.
- [ ] In Supabase, set the Site URL to the custom domain and add
      `https://<domain>/reset-password` to the redirect URLs.
- [ ] Open a deep link directly, for example `https://<domain>/sessions/1`, and confirm it
      loads the app and not an error page.
- [ ] Check the response headers (`curl -I https://<domain>/`) for the content-security
      policy and the other headers in `public/_headers`.
- [ ] Sign in with a test account of each role and walk through the screens.
- [ ] Request a password link and confirm that the e-mail arrives and the link opens the
      password screen.

## The brand typeface

The licensed Ploni files are not in the repository, so a build from GitHub is set in Heebo,
the approved fallback. A copy marked "free for personal use" must not be used; a web licence
from the foundry is required. Once licensed files are available there are two routes:

- **Private repository:** if the licence permits, commit the four WOFF2 files to
  `public/fonts/` (remove the two font lines from `.gitignore`). Never do this while the
  repository is public.
- **Deploy a locally built site:** place the files in `public/fonts/` on a trusted machine,
  run `npm run build`, then `npx wrangler deploy` (Worker) or
  `npx wrangler pages deploy dist` (Pages). Note for Pages: a project created by direct
  upload cannot later be switched to Git integration. Confirm the commands in the current
  Wrangler documentation.

## Security headers

`public/_headers` is read by both products. It sets a content-security policy, forbids
framing, disables indexing by search engines, and disables camera, microphone and location.

- The policy allows connections to `*.supabase.co`. If Supabase is given a custom domain,
  add it to `connect-src`.
- If the advisor becomes a voice conversation, `microphone=()` in `Permissions-Policy` and
  the provider's addresses in `connect-src` must be changed deliberately at that point.
- The file applies to static files only. If server code is ever added (a Worker script or
  Pages Functions), its responses need the headers set in code.
- If cache rules are added on the custom domain, exclude `index.html`, so that a new
  deployment is not hidden behind a stale copy.

## Checking the configuration locally

```bash
npm run build
npx wrangler deploy --dry-run    # validates wrangler.jsonc; deploys nothing
npx wrangler dev                 # serves dist/ as the Worker would
npx wrangler pages dev dist      # serves dist/ as Pages would
```

Both emulations were used during the build to confirm the headers, the long-term caching of
`/assets/` and the deep links.
