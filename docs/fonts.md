# Brand typeface (Ploni)

The licensed Ploni files are not kept in this repository. A copy marked "free for personal
use" must not be used for this site; a web licence from the foundry is required.

Place the licensed WOFF2 files in `public/fonts/` (create the folder), using exactly these
names:

| Weight | File |
|---|---|
| 300 | `PloniLight.woff2` |
| 400 | `PloniRegular.woff2` |
| 600 | `PloniDBold.woff2` |
| 700 | `PloniBold.woff2` |

The build detects the files and declares them automatically (see `vite.config.ts`).
Until they are present the interface is set in Heebo, the approved fallback.

Because these files are excluded by `.gitignore`, a Cloudflare Pages build from GitHub will
not include them. See `docs/deployment-cloudflare-pages.md` for how to supply them.

This note is kept in `docs/` and not in `public/fonts/`, because everything under `public/`
is published with the site.
