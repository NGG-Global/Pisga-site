import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env';

/** All Pisga tables live in the dedicated `pisga` schema of the shared NGG project. */
export const PISGA_SCHEMA = 'pisga';
export const MATERIALS_BUCKET = 'pisga-materials';
export const ADVISOR_FUNCTION = 'pisga-advisor';

export function createSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    db: { schema: PISGA_SCHEMA },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
