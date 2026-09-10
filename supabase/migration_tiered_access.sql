-- ============================================================
-- Thapar Placed — migration: tiered access.
--
-- OLD MODEL: nothing worked until an admin approved your offer.
-- NEW MODEL, two tiers:
--   1) JOINED a city (just picking it, no offer needed) →
--      can use that city's chatroom, can see NAMES ONLY of who
--      else is in that city. Cannot DM. Cannot post on the board.
--   2) SUBMITTED an offer (upload happens instantly, no admin
--      wait) → full access: post on the board, DM anyone else
--      who has also submitted, see full batch directory
--      (name + company + bio) across all cities.
--
-- Admin approve/reject still exists, but is now a "✓ Verified"
-- badge only — it no longer blocks or grants access. This is a
-- real trust trade-off: someone could self-declare a fake company
-- and immediately get full posting/DM access before an admin
-- ever looks at it. Flagging this clearly — it's the deliberate
-- cost of removing the approval gate.
--
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ---------- lightweight city membership (tier 1) ----------
create table if not exists public.city_memberships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  city city_slug not null,
  created_at timestamptz not null default now(),
  primary key (user_id, city)
);

alter table public.city_memberships enable row level security;

drop policy if exists "city_memberships: insert own" on public.city_memberships;
create policy "city_memberships: insert own"
  on public.city_memberships for insert
  with check (auth.uid() = user_id);

drop policy if exists "city_memberships: read own" on public.city_memberships;
create policy "city_memberships: read own"
  on public.city_memberships for select
  using (auth.uid() = user_id);

-- anyone who is a member of a city can see the membership rows for
-- that same city (needed to build the "names only" list)
drop policy if exists "city_memberships: read fellow city members" on public.city_memberships;
create policy "city_memberships: read fellow city members"
  on public.city_memberships for select
  using (
    exists (
      select 1 from public.city_memberships mine
      where mine.user_id = auth.uid() and mine.city = city_memberships.city
    )
  );

-- ---------- helper functions ----------
create or replace function public.is_city_member(target_city city_slug)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.city_memberships
    where user_id = auth.uid() and city = target_city
  );
$$;

-- "has submitted an offer for this specific city" — any status, no
-- admin approval required. This is what unlocks that city's board.
create or replace function public.has_offer_for_city(target_city city_slug)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications
    where user_id = auth.uid() and city = target_city
  );
$$;

-- "has submitted an offer anywhere" — unlocks DMs + the batch-wide directory
create or replace function public.has_submitted_any_offer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications where user_id = auth.uid()
  );
$$;

create or replace function public.user_has_submitted_any_offer(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications where user_id = target_user
  );
$$;

-- ---------- re-point existing policies at the new, looser gates ----------

-- city chatroom: open to anyone who has JOINED the city (tier 1)
drop policy if exists "city_chat: read if approved member of that city" on public.city_chat_messages;
create policy "city_chat: read if member of that city"
  on public.city_chat_messages for select
  using (public.is_city_member(city));

drop policy if exists "city_chat: insert if approved member of that city" on public.city_chat_messages;
create policy "city_chat: insert if member of that city"
  on public.city_chat_messages for insert
  with check (auth.uid() = user_id and public.is_city_member(city));

-- 10-second undo: sender can delete their own message only in the
-- first ~15s after sending (a few extra seconds of buffer for latency)
drop policy if exists "city_chat: sender can undo briefly" on public.city_chat_messages;
create policy "city_chat: sender can undo briefly"
  on public.city_chat_messages for delete
  using (auth.uid() = user_id and created_at > now() - interval '15 seconds');

-- flat/roommate board: now requires having SUBMITTED an offer for
-- that city (not admin approval)
drop policy if exists "posts: read if approved member of that city" on public.posts;
create policy "posts: read if offer submitted for that city"
  on public.posts for select
  using (public.has_offer_for_city(city));

drop policy if exists "posts: insert if approved member of that city" on public.posts;
create policy "posts: insert if offer submitted for that city"
  on public.posts for insert
  with check (auth.uid() = user_id and public.has_offer_for_city(city));

-- DMs: both people must have submitted an offer somewhere
drop policy if exists "messages: send to a verified batchmate" on public.messages;
create policy "messages: send if both have submitted an offer"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.has_submitted_any_offer()
    and public.user_has_submitted_any_offer(receiver_id)
  );

-- batch-wide directory (verifications table): only visible to people
-- who have themselves submitted an offer somewhere
drop policy if exists "verifications: verified batchmates read all approved rows" on public.verifications;
create policy "verifications: submitters read all submitted rows"
  on public.verifications for select
  using (public.has_submitted_any_offer());

-- profiles: readable if you share a city membership (tier-1, names
-- only in practice — the UI just won't show company/bio for these)
-- OR you've both submitted offers somewhere (tier-2, full directory)
drop policy if exists "profiles: readable by fellow verified batchmates" on public.profiles;
create policy "profiles: readable by city members or fellow submitters"
  on public.profiles for select
  using (
    exists (
      select 1 from public.city_memberships theirs
      join public.city_memberships mine on mine.city = theirs.city
      where theirs.user_id = profiles.id and mine.user_id = auth.uid()
    )
    or (
      public.has_submitted_any_offer()
      and public.user_has_submitted_any_offer(profiles.id)
    )
  );
