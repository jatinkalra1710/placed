-- ============================================================
-- Thapar Placed — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor (once, on a fresh project)
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
create type city_slug as enum (
  'chandigarh','delhi_ncr','pune','bangalore','hyderabad','kolkata','chennai','mumbai'
);
create type verification_status as enum ('pending','approved','rejected');
create type post_type as enum ('roommate','flat','pg');
create type user_role as enum ('student','admin');

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  batch_year int,
  branch text,
  bio text not null default '',        -- up to ~200 words, enforced client-side
  role user_role not null default 'student',
  created_at timestamptz not null default now()
);

-- ---------- verifications (offer-letter screenshots) ----------
create table public.verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  city city_slug not null,
  screenshot_path text not null,       -- path inside the 'offer-screenshots' storage bucket
  status verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  review_note text,
  created_at timestamptz not null default now()
);

-- one active verification per user (resubmission overwrites via app logic)
create unique index one_verification_per_user on public.verifications(user_id)
  where status in ('pending','approved');

-- ---------- board posts (roommate / flat / pg hunting) ----------
create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city city_slug not null,
  type post_type not null,
  title text not null,
  description text not null,
  contact_info text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- replies to board posts (public thread OR private note) ----------
create table public.post_replies (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- direct messages between verified batchmates ----------
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at);

-- ============================================================
-- Restrict signups to @thapar.edu addresses at the database level
-- (defense in depth — also enforce this client-side before sending OTP)
-- ============================================================
create or replace function public.enforce_thapar_domain()
returns trigger as $$
begin
  if new.email !~* '@thapar\.edu$' then
    raise exception 'Only @thapar.edu email addresses can sign up';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_thapar_domain_trigger
  before insert on auth.users
  for each row execute procedure public.enforce_thapar_domain();

-- auto-create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Helper function used by RLS policies below.
-- Must be SECURITY DEFINER so its inner query bypasses RLS on
-- verifications — otherwise a policy on verifications that queries
-- verifications triggers the same policy again, forever (infinite
-- recursion error). This function breaks that loop.
-- ============================================================
create or replace function public.is_approved_in_city(check_city city_slug)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications
    where user_id = auth.uid()
      and city = check_city
      and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- true if the CURRENT user has at least one approved verification, in any city.
-- powers the batch-wide directory (search by name/company across all cities).
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

-- true if TARGET_USER has at least one approved verification, in any city.
-- security definer so it can be safely called from policies on profiles/messages
-- without re-triggering RLS on verifications.
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

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.verifications enable row level security;
alter table public.posts enable row level security;

-- ---- profiles ----
create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: admins read all"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id);

-- any verified batchmate can see the basic profile of any other verified
-- batchmate (name, branch, batch year, bio) — this is what powers the
-- batch-wide "find people at company X" / "find user by name" search,
-- and lets someone view a profile before messaging them.
create policy "profiles: readable by fellow verified batchmates"
  on public.profiles for select
  using (
    public.is_verified_member()
    and public.user_is_verified(profiles.id)
  );

-- ---- verifications ----
create policy "verifications: insert own"
  on public.verifications for insert
  with check (auth.uid() = user_id);

create policy "verifications: read own"
  on public.verifications for select
  using (auth.uid() = user_id);

create policy "verifications: admins read all"
  on public.verifications for select
  using (public.is_admin());

create policy "verifications: admins update"
  on public.verifications for update
  using (public.is_admin());

-- ---- posts ----
-- only users with an APPROVED verification for a city can read/write that city's board
-- (uses the is_approved_in_city() helper defined further down, before city_members)
create policy "posts: read if approved member of that city"
  on public.posts for select
  using (public.is_approved_in_city(city));

create policy "posts: insert if approved member of that city"
  on public.posts for insert
  with check (
    auth.uid() = user_id
    and public.is_approved_in_city(city)
  );

create policy "posts: delete own"
  on public.posts for delete
  using (auth.uid() = user_id);

-- any verified batchmate can see everyone's approved verification row
-- (city + company), regardless of which city it's for — powers batch-wide search
create policy "verifications: verified batchmates read all approved rows"
  on public.verifications for select
  using (
    status = 'approved'
    and public.is_verified_member()
  );

-- ---- post_replies ----
alter table public.post_replies enable row level security;

-- public replies are visible to anyone who can see the parent post's city board;
-- a user's own replies (public or private) are always visible to them
create policy "post_replies: read public replies on visible posts"
  on public.post_replies for select
  using (
    (is_public and exists (
      select 1 from public.posts p
      where p.id = post_replies.post_id
        and public.is_approved_in_city(p.city)
    ))
    or user_id = auth.uid()
    or exists ( -- the post's author can always see replies to their own post
      select 1 from public.posts p
      where p.id = post_replies.post_id and p.user_id = auth.uid()
    )
  );

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

create policy "post_replies: delete own"
  on public.post_replies for delete
  using (auth.uid() = user_id);

-- ---- messages (direct messages between verified batchmates) ----
alter table public.messages enable row level security;

create policy "messages: read own conversations"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages: send to a verified batchmate"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_verified_member()
    and public.user_is_verified(receiver_id)
  );

-- ============================================================
-- City directory view — name + company only, scoped to one city
-- (still used on each city's board page; the batch-wide search
-- queries verifications + profiles directly instead of this view)
-- ============================================================
create or replace view public.city_members as
  select v.city, p.id as user_id, p.full_name, p.branch, p.batch_year, v.company_name
  from public.verifications v
  join public.profiles p on p.id = v.user_id
  where v.status = 'approved';

alter view public.city_members set (security_invoker = true);

-- ============================================================
-- Storage: bucket for offer-letter screenshots (private)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('offer-screenshots', 'offer-screenshots', false)
on conflict (id) do nothing;

-- users can upload only into a folder named after their own uid
create policy "screenshots: users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'offer-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "screenshots: users read own"
  on storage.objects for select
  using (
    bucket_id = 'offer-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "screenshots: admins read all"
  on storage.objects for select
  using (
    bucket_id = 'offer-screenshots'
    and public.is_admin()
  );

-- ============================================================
-- Make yourself an admin after signing up once, e.g.:
-- update public.profiles set role = 'admin' where email = 'you@thapar.edu';
-- ============================================================
