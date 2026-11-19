// Pisga advisor · Supabase Edge Function (placeholder)
//
// STATUS: NOT IMPLEMENTED AND NOT TESTED. The advisor is waiting for three open decisions:
// voice, text or both; the provider (ElevenLabs Agents is the working assumption); and the
// retention of conversations at the provider. This file fixes only the contract between the
// app and the function, and the access check, so that the provider call can be added in one
// place. Verify the Deno and Supabase APIs used here against the current Supabase
// documentation before deploying.
//
// Contract
//   request  POST { "messages": [{ "role": "user" | "advisor", "text": string }, ...] }
//   response 200  { "text": string, "sources": string[] }
//            `sources` lists the titles the answer is grounded in. When the advisor has no
//            grounded answer it must say so in `text`, refer the participant to the
//            facilitators, and return an empty `sources` array.
//
// The provider API key belongs in the function's secrets (never in the browser):
//   supabase secrets set ADVISOR_API_KEY=...   PISGA_APP_ORIGIN=https://<the app's domain>

import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('PISGA_APP_ORIGIN') ?? '';

const cors = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Act as the calling user, so that row-level security applies to everything read here.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    db: { schema: 'pisga' },
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return json({ error: 'unauthorized' }, 401);

  const { data: membership } = await supabase
    .from('app_memberships')
    .select('role')
    .eq('user_id', auth.user.id)
    .eq('app', 'pisga')
    .maybeSingle();
  if (membership?.role !== 'participant') return json({ error: 'forbidden' }, 403);

  // TODO (after the open decisions): call the provider with the conversation and the programme
  // knowledge base, and return its grounded answer with the source titles.
  return json({
    text: 'היועץ האישי טרם הופעל. לשאלות על תכני התוכנית אפשר לפנות למנחי התוכנית.',
    sources: [],
  });
});
