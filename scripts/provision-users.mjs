#!/usr/bin/env node
/**
 * Creates the programme's accounts from a participant list. Public sign-up stays disabled;
 * this script is the only way accounts and memberships come into being.
 *
 * STATUS: written against the documented supabase-js admin API but NOT yet run against a
 * Supabase project. Run it first with --dry-run, then against the development project.
 *
 *   SUPABASE_URL=...  SUPABASE_SECRET_KEY=...  node scripts/provision-users.mjs participants.csv [--dry-run]
 *
 * CSV columns (header row required): email, display_name, role
 *   role is one of: participant, ngg_facilitator, maccabi_learning, mentor
 *
 * - The secret key bypasses row-level security. Use it only on a trusted machine, never
 *   commit it, and never commit the participant list (personal data).
 * - Accounts are created without a password. Each person sets one through
 *   "שכחתם את הסיסמה?" on the login screen, which e-mails a set-up link.
 * - The Supabase project is shared with other NGG apps: a person who already has an account
 *   there is not duplicated; they only receive the Pisga membership and profile.
 * - Safe to run again: existing memberships and profiles are updated to match the list.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROLES = ['participant', 'ngg_facilitator', 'maccabi_learning', 'mentor'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A small CSV reader that supports quoted fields containing commas. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  return rows;
}

function readList(path) {
  const [header, ...lines] = parseCsv(readFileSync(path, 'utf8'));
  const columns = header.map((h) => h.trim().toLowerCase());
  for (const required of ['email', 'display_name', 'role']) {
    if (!columns.includes(required)) throw new Error(`Missing column "${required}" in ${path}`);
  }
  const people = lines.map((line, i) => {
    const value = (name) => (line[columns.indexOf(name)] ?? '').trim();
    const person = { line: i + 2, email: value('email').toLowerCase(), displayName: value('display_name'), role: value('role') };
    if (!EMAIL.test(person.email)) throw new Error(`Line ${person.line}: invalid e-mail address`);
    if (!person.displayName) throw new Error(`Line ${person.line}: display_name is empty`);
    if (!ROLES.includes(person.role)) throw new Error(`Line ${person.line}: role must be one of ${ROLES.join(', ')}`);
    return person;
  });
  const seen = new Set();
  for (const p of people) {
    if (seen.has(p.email)) throw new Error(`Line ${p.line}: duplicate e-mail address`);
    seen.add(p.email);
  }
  return people;
}

async function existingUsersByEmail(supabase) {
  const byEmail = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) if (user.email) byEmail.set(user.email.toLowerCase(), user.id);
    if (data.users.length < 1000) return byEmail;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) throw new Error('Usage: node scripts/provision-users.mjs <participants.csv> [--dry-run]');

  const people = readList(file);
  const counts = Object.fromEntries(ROLES.map((r) => [r, people.filter((p) => p.role === r).length]));
  console.log(`${people.length} people in the list:`, counts);
  if (dryRun) return console.log('Dry run: the list is valid. Nothing was created.');

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const pisga = supabase.schema('pisga');

  const existing = await existingUsersByEmail(supabase);
  let created = 0;
  for (const person of people) {
    let userId = existing.get(person.email);
    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({ email: person.email, email_confirm: true });
      if (error) throw new Error(`Line ${person.line}: could not create the account (${error.message})`);
      userId = data.user.id;
      created++;
    }
    const membership = await pisga.from('app_memberships').upsert({ user_id: userId, app: 'pisga', role: person.role }, { onConflict: 'user_id,app' });
    if (membership.error) throw new Error(`Line ${person.line}: membership failed (${membership.error.message})`);
    const profile = await pisga.from('profiles').upsert({ user_id: userId, display_name: person.displayName }, { onConflict: 'user_id' });
    if (profile.error) throw new Error(`Line ${person.line}: profile failed (${profile.error.message})`);
  }
  // No personal data is written to the log.
  console.log(`Done. ${created} accounts created, ${people.length - created} existing accounts linked.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}
