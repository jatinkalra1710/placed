-- Fixes "infinite recursion detected in policy for relation city_memberships"
-- Same root cause as the earlier verifications/profiles recursion bugs:
-- this policy queried city_memberships from inside a policy on
-- city_memberships. Routing it through the existing is_city_member()
-- security-definer function breaks the loop.
-- Run once in Supabase SQL Editor.

drop policy if exists "city_memberships: read fellow city members" on public.city_memberships;
create policy "city_memberships: read fellow city members"
  on public.city_memberships for select
  using (public.is_city_member(city));
