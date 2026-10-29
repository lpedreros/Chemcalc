-- ============================================================================
-- PROPOSED -- NOT APPLIED. Rollback for 20261029120000_email_send_log.sql.
-- Drops the send log (its indexes and grants go with it). Deploy the old function, or none, first: the hardened
-- send-results function fails closed (503, nothing sent) while this table is missing.
-- ============================================================================
begin;
drop table if exists public.email_send_log;
commit;
