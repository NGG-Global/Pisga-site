#!/usr/bin/env node
/**
 * Build step for the Cloudflare Worker deployment, run by Wrangler before it reads dist/
 * (see "build" in wrangler.jsonc).
 *
 * Cloudflare's build installs the project's dependencies only when a build command is set
 * in the dashboard. This script installs them when they are missing, so that
 * `npx wrangler deploy` works from a bare checkout as well.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const run = (command) => execSync(command, { stdio: 'inherit' });

if (!existsSync('node_modules/vite') || !existsSync('node_modules/typescript')) {
  // Development dependencies are needed for the build (TypeScript, Vite).
  run('npm ci --include=dev --no-audit --no-fund');
}
run('npm run build');
