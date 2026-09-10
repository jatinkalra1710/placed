-- ============================================================
-- Thapar Placed — bug fixes
-- Run once in Supabase SQL Editor.
-- ============================================================

-- Bug 1: uploading an offer with no screenshot fails because the
-- column still requires NOT NULL from the original schema.
alter table public.verifications
  alter column screenshot_path drop not null;

-- Bug 2: only admins could update a ticket's status, so a user
-- could never close/resolve their own ticket.
drop policy if exists "support_tickets: owner can close own" on public.support_tickets;
create policy "support_tickets: owner can close own"
  on public.support_tickets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
