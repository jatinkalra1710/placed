-- ============================================================
-- Thapar Placed — migration: city chatroom, post reporting,
-- and letting admins delete reported posts.
-- Run once in Supabase → SQL Editor.
-- ============================================================

-- ---------- city chatroom ----------
create table if not exists public.city_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  city city_slug not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists city_chat_messages_city_idx
  on public.city_chat_messages (city, created_at);

alter table public.city_chat_messages enable row level security;

drop policy if exists "city_chat: read if approved member of that city" on public.city_chat_messages;
create policy "city_chat: read if approved member of that city"
  on public.city_chat_messages for select
  using (public.is_approved_in_city(city));

drop policy if exists "city_chat: insert if approved member of that city" on public.city_chat_messages;
create policy "city_chat: insert if approved member of that city"
  on public.city_chat_messages for insert
  with check (auth.uid() = user_id and public.is_approved_in_city(city));

-- enable realtime (live updates) for the chatroom — safe to re-run
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'city_chat_messages'
  ) then
    alter publication supabase_realtime add table public.city_chat_messages;
  end if;
end $$;

-- ---------- post reporting ----------
create table if not exists public.post_reports (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.post_reports enable row level security;

drop policy if exists "post_reports: insert if can see the post" on public.post_reports;
create policy "post_reports: insert if can see the post"
  on public.post_reports for insert
  with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.posts p
      where p.id = post_reports.post_id
        and public.is_approved_in_city(p.city)
    )
  );

drop policy if exists "post_reports: admins read all" on public.post_reports;
create policy "post_reports: admins read all"
  on public.post_reports for select
  using (public.is_admin());

-- ---------- let admins delete any post (e.g. after a report) ----------
drop policy if exists "posts: admins delete any" on public.posts;
create policy "posts: admins delete any"
  on public.posts for delete
  using (public.is_admin());
