-- ============================================================
-- Thapar Placed — migration: bio, tags, replies, direct messages,
-- and a batch-wide (not just same-city) directory search.
-- Run this ONCE in Supabase → SQL Editor on your EXISTING project.
-- Safe to run even if some pieces already exist (uses IF NOT EXISTS
-- / OR REPLACE / DROP..IF EXISTS guards throughout).
-- ============================================================

-- ---------- new columns ----------
alter table public.profiles add column if not exists bio text not null default '';
alter table public.posts add column if not exists tags text[] not null default '{}';

-- ---------- new tables ----------
create table if not exists public.post_replies (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx
  on public.messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at);

-- ---------- new helper functions ----------
create or replace function public.is_verified_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications
    where user_id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.user_is_verified(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications
    where user_id = target_user and status = 'approved'
  );
$$;

-- ---------- widen directory from "same city only" to "whole verified batch" ----------
drop policy if exists "profiles: readable by fellow city-group members" on public.profiles;
create policy "profiles: readable by fellow verified batchmates"
  on public.profiles for select
  using (
    public.is_verified_member()
    and public.user_is_verified(profiles.id)
  );

drop policy if exists "verifications: approved members can read approved rows in their city" on public.verifications;
create policy "verifications: verified batchmates read all approved rows"
  on public.verifications for select
  using (
    status = 'approved'
    and public.is_verified_member()
  );

-- ---------- RLS: post_replies ----------
alter table public.post_replies enable row level security;

drop policy if exists "post_replies: read public replies on visible posts" on public.post_replies;
create policy "post_replies: read public replies on visible posts"
  on public.post_replies for select
  using (
    (is_public and exists (
      select 1 from public.posts p
      where p.id = post_replies.post_id
        and public.is_approved_in_city(p.city)
    ))
    or user_id = auth.uid()
    or exists (
      select 1 from public.posts p
      where p.id = post_replies.post_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "post_replies: insert if verified and can see the post" on public.post_replies;
create policy "post_replies: insert if verified and can see the post"
  on public.post_replies for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.posts p
      where p.id = post_replies.post_id
        and public.is_approved_in_city(p.city)
    )
  );

drop policy if exists "post_replies: delete own" on public.post_replies;
create policy "post_replies: delete own"
  on public.post_replies for delete
  using (auth.uid() = user_id);

-- ---------- RLS: messages ----------
alter table public.messages enable row level security;

drop policy if exists "messages: read own conversations" on public.messages;
create policy "messages: read own conversations"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "messages: send to a verified batchmate" on public.messages;
create policy "messages: send to a verified batchmate"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_verified_member()
    and public.user_is_verified(receiver_id)
  );
