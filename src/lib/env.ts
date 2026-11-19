const env = import.meta.env;

export const DEMO_MODE = env.VITE_DEMO_MODE === 'true';
export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY: string = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

/** True when the deployment has neither a backend configuration nor demo mode. */
export const NOT_CONFIGURED = !DEMO_MODE && (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY);
