-- ============================================================
-- Thapar Placed — CRITICAL FIX: full access now requires BOTH
-- an admin-approved verification AND a screenshot on file.
--
-- Previously "submitted an offer" (any status, screenshot
-- optional) was enough to unlock posting/DMs/full directory —
-- which meant anyone could type a fake company name with no
-- proof and get full access instantly, and even a REJECTED
-- submission still counted as "submitted" so rejection didn't
-- actually revoke anything. Both are fixed here.
--
-- This only changes the three gate FUNCTIONS below — every RLS
-- policy across posts/messages/profiles/verifications already
-- calls these by name, so they all automatically pick up the
-- stricter check without needing to be touched individually.
--
-- Run once in Supabase SQL Editor.
-- ============================================================

create or replace function public.has_offer_for_city(target_city city_slug)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications
    where user_id = auth.uid()
      and city = target_city
      and status = 'approved'
      and screenshot_path is not null
  );
$$;

create or replace function public.has_submitted_any_offer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.verifications
    where user_id = auth.uid()
      and status = 'approved'
      and screenshot_path is not null
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
    select 1 from public.verifications
    where user_id = target_user
      and status = 'approved'
      and screenshot_path is not null
  );
$$;

-- HEADS UP: run this to see who was approved without ever having a
-- screenshot on file — under the new rule they'll drop back to
-- restricted access until they submit one and get re-reviewed.
-- This is just informational, not something you need to act on
-- immediately.
select v.id, p.full_name, p.email, v.company_name, v.city
from public.verifications v
join public.profiles p on p.id = v.user_id
where v.status = 'approved' and v.screenshot_path is null;
