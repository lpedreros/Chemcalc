// send-results — emails calculator results (Resend) and starts a marketing double opt-in (Brevo).
// All logic lives in handler.ts (no imports, so the tests run it unchanged under Node); this file only wires in Deno's environment.
// Deployed with --no-verify-jwt (the calculators call it from the browser), so the protections are inside the handler.
import { handle } from './handler.ts';

Deno.serve((req: Request) =>
  handle(req, {
    env: {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      RESEND_API_KEY: Deno.env.get('RESEND_API_KEY') ?? '',
      BREVO_API_KEY: Deno.env.get('BREVO_API_KEY') ?? undefined,
      BREVO_DOI_TEMPLATE_ID: Deno.env.get('BREVO_DOI_TEMPLATE_ID') ?? undefined,
      BREVO_DOI_REDIRECT_URL: Deno.env.get('BREVO_DOI_REDIRECT_URL') ?? undefined,
    },
    fetch,
  }),
);
