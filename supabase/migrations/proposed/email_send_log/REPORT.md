# PROPOSED -- NOT APPLIED: email_send_log

Table for the `send-results` function's daily limits. Hashes only (SHA-256 of the lower-cased recipient and of the IP). Project `rnrzjlfpwxzomupnxikt`.

| File | What |
|---|---|
| `20261029120000_email_send_log.sql` | Creates the table, 3 indexes, RLS on with no policies, revokes everything, grants select/insert/delete to `service_role` |
| `rollback.sql` | Drops the table |
| `rehearse_grants.mjs` | Local rehearsal (see below). `node rehearse_grants.mjs` |

## How the grants were verified

**Rehearsed locally, not on the live database.** `rehearse_grants.mjs` runs the migration (twice, to check it is idempotent) and the rollback in a local PGlite Postgres whose default privileges copy Supabase's (new public tables are granted to `anon`, `authenticated` and `service_role`). 20 checks, all passed:

- `anon` and `authenticated` have no select, insert, update or delete, and a plain `select` as either role is refused with 42501.
- `service_role` has select, insert and delete, and nothing else. (The first run caught that Supabase's default grant left it with UPDATE; the migration now revokes from `service_role` before granting.)
- RLS is enabled, there are no policies, and there are 4 indexes (primary key plus 3).
- `service_role` can insert and read a row, and `kind` defaults to `results`.
- The rollback drops the table.

Not verified: behaviour on the real Supabase database (real default privileges, PostgREST). After applying, check with `select grantee, privilege_type from information_schema.role_table_grants where table_name = 'email_send_log';` that only `service_role` appears, with SELECT, INSERT and DELETE.

Labels: Verified = I ran it (PGlite replica). Everything about the live database is Not verified.

## How the function uses the table (updated with the burst fix)

Limits per rolling 24 h: 3 per recipient, 10 per IP, **25 overall** (lowered from 50). Each request inserts its own row first (with a client-generated `id`), then counts, and the count includes its own row; a request passes only when each count is within its cap. A refused request, or one whose email fails, deletes its own row (`DELETE ... ?id=eq.<id>`, best effort; a failed delete leaves one row, which fails safe). This needs only select, insert and delete, so the grants above are unchanged.

Later tightening (same grants, no schema change): the per-IP count is skipped when no client IP header arrives (rows still carry the hash of "unknown"); when the Resend call times out or fails at the network level the row is kept, because the email may have been sent, and only a definite non-2xx answer from Resend gives the slot back.

## Account-only recipient

`send-results` only emails the signed-in visitor's own confirmed address. Nobody can use it to email a stranger, so the text checks are a second line of defence, not the main one.

- **How the check works:** the request must carry `Authorization: Bearer <access token>`. The function asks Supabase Auth (`GET {SUPABASE_URL}/auth/v1/user`, `apikey` = the service key, `Authorization` = the visitor's token). It needs a 2xx answer with an `email` that passes the address check, a non-empty `email_confirmed_at`, and `is_anonymous` not true. The recipient is that address and nothing else: any `email` in the request body is ignored. The same address feeds the recipient cap and the Brevo double opt-in.
- **Answers:** no or malformed token, a token Auth rejects (4xx, including the anon/publishable key), an unconfirmed or anonymous user -> **401** `Sign in required`. Auth down, slow, 5xx or 429 -> **503** (fail closed). Both happen before the body is read: nothing is logged and nothing is sent. Logs never hold the token, the address or the HTML.
- **Deploy:** two files, `index.ts` and `handler.ts`, with `verify_jwt` false passed explicitly (the function does its own sign-in check; the platform JWT check must stay off because the visitor's token is a user token, and so that preflight requests work).
- **Release order:** deploy the function first, then upload the site. An old site calling the new function without a sign-in gets 401 until the site upload; the new site against the old function would send an address-less body to v3, so do not upload the site first.
