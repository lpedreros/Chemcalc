-- ============================================================================
-- PROPOSED -- NOT APPLIED. Project rnrzjlfpwxzomupnxikt.
-- Send log for the `send-results` Edge Function's daily limits (3 per recipient, 10 per IP, 50 overall, rolling 24 h).
--
-- What it stores: one row per results email, with SHA-256 HASHES of the lower-cased recipient address and of the caller's IP.
-- No address, no IP, no email content. The function deletes rows older than 30 days.
--
-- Who can touch it: the service role only. Row level security is ON with NO policies, so the browser keys (anon,
-- authenticated) are denied twice: no policy, and no table privilege (Supabase's default privileges grant new public
-- tables to anon and authenticated, so they are revoked explicitly below).
--
-- Idempotent (IF NOT EXISTS; REVOKE/GRANT/ENABLE can be repeated) and one transaction. Undo with rollback.sql.
-- ============================================================================
begin;

create table if not exists public.email_send_log (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  recipient_hash text        not null,
  ip_hash        text        not null,
  kind           text        not null default 'results'
);

create index if not exists email_send_log_created_at_idx   on public.email_send_log (created_at);
create index if not exists email_send_log_recipient_idx    on public.email_send_log (recipient_hash, created_at);
create index if not exists email_send_log_ip_idx           on public.email_send_log (ip_hash, created_at);

alter table public.email_send_log enable row level security;
-- Deliberately no policies: nothing but the service role (which bypasses RLS) can read or write.

-- service_role is revoked too: the default privileges give it ALL, and the function only needs select, insert and delete.
revoke all on table public.email_send_log from anon, authenticated, public, service_role;
grant select, insert, delete on table public.email_send_log to service_role;

commit;
