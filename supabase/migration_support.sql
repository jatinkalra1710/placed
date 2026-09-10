-- ============================================================
-- Thapar Placed — migration: support tickets.
-- Deliberately NOT gated by is_verified_member()/is_approved_in_city() —
-- anyone who is logged in (even pending/rejected) can reach support,
-- since that's often exactly when someone needs help.
-- Run once in Supabase SQL Editor.
-- ============================================================

create type ticket_status as enum ('open', 'resolved');

create table if not exists public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status ticket_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.support_replies (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_replies enable row level security;

-- any logged-in profile can open a ticket, and read/see only their own
drop policy if exists "support_tickets: insert own" on public.support_tickets;
create policy "support_tickets: insert own"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

drop policy if exists "support_tickets: read own" on public.support_tickets;
create policy "support_tickets: read own"
  on public.support_tickets for select
  using (auth.uid() = user_id);

drop policy if exists "support_tickets: admins read all" on public.support_tickets;
create policy "support_tickets: admins read all"
  on public.support_tickets for select
  using (public.is_admin());

drop policy if exists "support_tickets: admins update status" on public.support_tickets;
create policy "support_tickets: admins update status"
  on public.support_tickets for update
  using (public.is_admin());

-- replies: the ticket owner or an admin can post; either can read
drop policy if exists "support_replies: insert if owner or admin" on public.support_replies;
create policy "support_replies: insert if owner or admin"
  on public.support_replies for insert
  with check (
    auth.uid() = user_id
    and (
      public.is_admin()
      or exists (
        select 1 from public.support_tickets t
        where t.id = support_replies.ticket_id and t.user_id = auth.uid()
      )
    )
  );

drop policy if exists "support_replies: read if owner or admin" on public.support_replies;
create policy "support_replies: read if owner or admin"
  on public.support_replies for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.support_tickets t
      where t.id = support_replies.ticket_id and t.user_id = auth.uid()
    )
  );
