-- ============================================================
-- Thapar Placed — migration: unread message tracking.
-- Run once in Supabase SQL Editor.
-- ============================================================

alter table public.messages add column if not exists read_at timestamptz;

-- the receiver of a message is allowed to mark it read (and only that field,
-- enforced by the app — RLS just checks they own the receiving side)
drop policy if exists "messages: receiver marks read" on public.messages;
create policy "messages: receiver marks read"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);
