// supabase/functions/trello/index.ts
// Server-side Trello access for the estimator: keeps the user's Trello API key and token out of the browser.
// All logic lives in handler.ts (it has no imports, so it also runs under Node for the tests).
//
// Deploy:  supabase functions deploy trello        (verify_jwt stays ON: the gateway then rejects missing and
//          malformed tokens before this code starts; the handler still verifies the user itself, because the public
//          anon key is also a validly signed project JWT and passes the gateway check)
// Env (all three are provided by the Supabase runtime; nothing to set):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Files to deploy together: index.ts, handler.ts

import { handle } from './handler.ts';

Deno.serve((req: Request) =>
  handle(req, {
    env: {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    },
    fetch,
  })
);
