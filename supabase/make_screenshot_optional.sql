-- Make the offer screenshot optional instead of required.
-- Run once in Supabase → SQL Editor.

alter table public.verifications
  alter column screenshot_path drop not null;
