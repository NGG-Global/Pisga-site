#!/usr/bin/env node
/**
 * Build step for the Cloudflare Worker deployment. It makes sure dist/ exists whichever
 * command Cloudflare runs, without depending on a build command set in the dashboard.
 *
 * It is called from two places:
 *   1. `postinstall` in package.json, with --postinstall. Cloudflare's builder installs the
 *      dependencies itself and sets WORKERS_CI; only there does this build the site. On a
 *      developer's machine the postinstall call does nothing.
 *   2. "build" in wrangler.jsonc, which Wrangler runs before `wrangler deploy` reads dist/.
 *      Here it also installs the dependencies when they are missing (a bare checkout).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const run = (command) => execSync(command, { stdio: 'inherit' });
const postinstall = process.argv.includes('--postinstall');

if (postinstall && !process.env.WORKERS_CI) process.exit(0);

if (!postinstall && (!existsSync('node_modules/vite') || !existsSync('node_modules/typescript'))) {
  // Development dependencies are needed for the build (TypeScript, Vite).
  run('npm ci --include=dev --no-audit --no-fund');
}
run('npm run build');
