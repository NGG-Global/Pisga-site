# Brand typeface (Ploni)

The licensed Ploni files are not kept in this repository. Obtain them from NGG and place
the WOFF2 versions here, using exactly these names:

| Weight | File |
|---|---|
| 300 | `PloniLight.woff2` |
| 400 | `PloniRegular.woff2` |
| 600 | `PloniDBold.woff2` |
| 700 | `PloniBold.woff2` |

The build detects the files and declares them automatically (see `vite.config.ts`).
Until they are present the interface is set in Heebo, the approved fallback.

Because these files are excluded by `.gitignore`, a Vercel build from GitHub will not
include them. See `docs/deployment-vercel.md` for the two ways of supplying them.
