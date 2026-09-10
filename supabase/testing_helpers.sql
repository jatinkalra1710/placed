-- ============================================================
-- Thapar Placed — testing helpers
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ---------- 1) Allow specific test emails to sign up ----------
-- A small allowlist so YOU can add personal Gmail addresses for
-- testing, without opening signup to the public. Anyone whose email
-- is in this table can sign in, in addition to any @thapar.edu email.
create table if not exists public.test_allowed_emails (
  email text primary key,
  added_at timestamptz not null default now()
);

-- only accessible via the SQL editor (service role) — no RLS policies
-- are added here on purpose, so it can't be read or written from the
-- app itself, only by you directly in Supabase.
alter table public.test_allowed_emails enable row level security;

create or replace function public.enforce_thapar_domain()
returns trigger as $$
begin
  if new.email !~* '@thapar\.edu$'
     and not exists (select 1 from public.test_allowed_emails where email = new.email) then
    raise exception 'Only @thapar.edu email addresses can sign up';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Add your test Gmail address(es) here — edit and re-run this line
-- any time you want to add another:
insert into public.test_allowed_emails (email) values
  ('your.test.address@gmail.com')
on conflict (email) do nothing;

-- ---------- 2) Re-apply: let admins delete their own account ----------
-- (in case this wasn't run yet from earlier — safe to run again)
alter table public.verifications
  drop constraint if exists verifications_reviewed_by_fkey;

alter table public.verifications
  add constraint verifications_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;
