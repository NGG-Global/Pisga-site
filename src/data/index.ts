import { DEMO_MODE } from '../lib/env';
import type { Api } from './api';
import { createDemoApi } from './demoApi';
import { createSupabaseApi } from './supabaseApi';

let instance: Api | null = null;

/** The backend in use: the demo store when demo mode is switched on, Supabase otherwise. */
export function api(): Api {
  instance ??= DEMO_MODE ? createDemoApi() : createSupabaseApi();
  return instance;
}
