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
