-- Fixes "Database error deleting user" when trying to delete an admin
-- account that has approved/rejected verifications (reviewed_by pointed
-- at them with no ON DELETE behavior, so Postgres blocked the cascade).
-- Run once in Supabase SQL Editor.

alter table public.verifications
  drop constraint if exists verifications_reviewed_by_fkey;

alter table public.verifications
  add constraint verifications_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;
