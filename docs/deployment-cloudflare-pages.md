# Deployment on Cloudflare Pages

The app is a static single-page build. Cloudflare Pages serves the files; the browser talks to
Supabase directly. No participant data passes through or is stored on Cloudflare.

The points below were checked against Cloudflare's Pages documentation in November 2026.
Dashboard labels change; confirm them in the dashboard as you go.

## How the repository is prepared

| File | Purpose |
|---|---|
| `public/_headers` | Security headers on every response, and long-term caching for the hashed files under `/assets/` |
| `.node-version` | Pins the build to Node.js 22. Pages does not read the `engines` field of `package.json` |
| No `404.html` | Deliberate. Pages treats a project without a top-level `404.html` as a single-page app and serves the root for every path that is not a file, which is what makes links such as `/sessions/3` work. **Do not add a top-level `404.html`** |

No `_redirects` file and no Wrangler configuration file are needed.

## 1. Before the first deployment

- [ ] Complete `docs/supabase-setup.md` on the development project and run the app against it.
- [ ] Decide the domain (open item).
- [ ] Decide who holds the Cloudflare account and who may deploy.

## 2. Create the Pages project

1. In the Cloudflare dashboard, open **Workers & Pages**, create a **Pages** project and
   connect the GitHub repository.
2. Production branch: `main`.
3. Build settings: framework preset **React (Vite)**, build command `npm run build`, build
   output directory `dist`. Root directory: leave empty.
4. Add the variables below under **Settings > Variables and Secrets**, separately for the
   Production and Preview environments.
5. Deploy.

| Variable | Production | Preview |
|---|---|---|
| `VITE_SUPABASE_URL` | Production project URL | Development project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production publishable key | Development publishable key |
| `VITE_DEMO_MODE` | `false` | `false`, or `true` for a preview without a backend |

These values are read when the site is built and are embedded in the files sent to the
browser. Only the publishable key belongs here; the secret key must never be given a
`VITE_` name. A change to a variable takes effect at the next deployment.

If neither a backend nor demo mode is configured, the site shows a "not configured" notice
instead of the login screen.

## 3. Addresses the site is reachable at

| Address | What it serves | Public |
|---|---|---|
| The custom domain | Production | Yes |
| `<project>.pages.dev` | Production | Yes. It stays active alongside the custom domain |
| `<hash>.<project>.pages.dev` and `<branch>.<project>.pages.dev` | Preview deployments of other branches and pull requests | **Yes, by default** |

Preview deployments are public unless restricted. To restrict them, enable the access
policy under **Settings > General** of the Pages project. According to Cloudflare's
documentation this protects preview deployments only, not `<project>.pages.dev` or the
custom domain. Every address still requires a sign-in to show any programme content, and
the site sends `X-Robots-Tag: noindex` everywhere.

For that reason, point preview deployments at the **development** Supabase project or run
them in demo mode, never at production data.

## 4. After the first deployment

- [ ] Add the custom domain to the Pages project.
- [ ] In Supabase, set the Site URL to the custom domain and add
      `https://<domain>/reset-password` to the redirect URLs.
- [ ] Open a deep link directly, for example `https://<domain>/sessions/1`, and confirm it
      loads the app and not an error page.
- [ ] Check the response headers (`curl -I https://<domain>/`) for the content-security
      policy and the other headers in `public/_headers`.
- [ ] Sign in with a test account of each role and walk through the screens.
- [ ] Request a password link and confirm that the e-mail arrives and the link opens the
      password screen.

## 5. The brand typeface

The licensed Ploni files are not in the repository, so a build from GitHub is set in Heebo,
the approved fallback. A copy marked "free for personal use" must not be used; a web licence
from the foundry is required. Once licensed files are available there are two routes:

- **Private repository:** if the licence permits, commit the four WOFF2 files to
  `public/fonts/` (remove the two font lines from `.gitignore`). Never do this while the
  repository is public.
- **Upload a locally built site:** place the files in `public/fonts/` on a trusted machine,
  run `npm run build`, and upload the result with Wrangler
  (`npx wrangler pages deploy dist`). Note the restriction in Cloudflare's documentation:
  a Pages project created by direct upload cannot later be switched to Git integration, so
  decide the route before creating the project. Confirm the command in the current Wrangler
  documentation.

## 6. Security headers

`public/_headers` sets a content-security policy, forbids framing, disables indexing by
search engines, and disables camera, microphone and location.

- The policy allows connections to `*.supabase.co`. If Supabase is given a custom domain,
  add it to `connect-src`.
- If the advisor becomes a voice conversation, `microphone=()` in `Permissions-Policy` and
  the provider's addresses in `connect-src` must be changed deliberately at that point.
- The `_headers` file applies to static files only. If Pages Functions are ever added,
  their responses need the headers set in code.
- If Cloudflare cache rules are added on the custom domain, exclude `index.html`, so that a
  new deployment is not hidden behind a stale copy.

## 7. Checking the configuration locally

```bash
npm run build
npx wrangler pages dev dist
```

This serves `dist/` with the same header and single-page rules as Pages. It was used during
the build to confirm the headers, the long-term caching of `/assets/` and the deep links.
