# Thapar Placed

A private community board for placed Thapar (@thapar.edu) students, grouped by
job city. Sign in with your college email, submit a screenshot of your
accepted offer, get verified by an admin, then see your batchmates in the
same city and post/browse flat, PG and roommate listings.

Stack: **Next.js 14 (App Router) + Tailwind**, **Supabase** (auth, Postgres,
storage) — both free-tier, deployed on **Vercel** (free tier).

## 1. Create the Supabase project

1. Go to https://supabase.com → New project (free tier is enough).
2. Once it's ready, open **SQL Editor** → paste the entire contents of
   `supabase/schema.sql` from this repo → **Run**.
   This creates all tables, the domain-lock trigger (blocks any sign-up that
   isn't `@thapar.edu`, regardless of which sign-in method is used), row-level
   security policies, and the private `offer-screenshots` storage bucket.

## 2. Set up Google sign-in

Thapar's student email runs on Google Workspace, so students sign in with the
same Google account they already use for `@thapar.edu` mail — no email
sending, no SMTP, no rate limits.

1. Go to https://console.cloud.google.com → create a new project (any name).
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in
   an app name (e.g. "Thapar Placed"), your email as support contact, and
   save through the remaining steps (you can leave scopes/test users at
   defaults — publishing isn't required for this).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: add
     `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
     (find your project ref in Supabase → Project Settings → API → Project URL)
   - Click Create, then copy the **Client ID** and **Client secret**.
4. In Supabase → **Authentication → Providers → Google**: toggle it on,
   paste the Client ID and Client secret, Save.
5. In Supabase → **Authentication → URL Configuration**, set Site URL and
   add a Redirect URL for `/auth/callback` (see step 6 below).

That's it — no SMTP provider needed at all.

## 3. Get your API keys

Go to **Project Settings → API** and copy:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Make yourself admin

After you sign in to the app once with your own `@thapar.edu` Google account
(so a profile row exists), go to Supabase → **SQL Editor** and run:

```sql
update public.profiles set role = 'admin' where email = 'you@thapar.edu';
```

Now `/admin` on the site will show you the verification queue.

## 5. Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

Visit http://localhost:3000.

## 6. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. On https://vercel.com → **Add New → Project** → import the repo.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Then go back to Supabase → Auth → URL Configuration and update the
   Site URL to your real `*.vercel.app` domain, and add
   `https://your-app.vercel.app/auth/callback` as a Redirect URL. Also add
   that same `*.vercel.app` domain's callback URL back in the Google Cloud
   OAuth client's Authorized redirect URIs if you skipped it in step 2 —
   though pointing it at the Supabase callback URL (not your Vercel domain)
   is what's actually required there, since Supabase is what talks to Google.

Both Supabase and Vercel free tiers are plenty for a single-college
community app.

## How the verification flow works

- `/login` — "Continue with Google". Anyone can start the OAuth flow, but
  Postgres itself rejects the account creation if the email isn't
  `@thapar.edu` (a trigger on `auth.users`), so it can't be bypassed by
  calling the API directly. A non-Thapar account gets bounced back to
  `/login` with a clear message.
- `/onboarding` — student enters company + city, uploads a screenshot of
  their accepted offer. This uploads to a **private** storage bucket
  (`offer-screenshots/<user-id>/...`) and creates a `pending` row in
  `verifications`.
- `/pending` — polls their own verification status.
- `/admin` — visible only to profiles with `role = 'admin'`. Lists pending
  verifications with a signed, time-limited link to view the screenshot,
  and Approve / Reject buttons.
- Once approved, Postgres row-level security automatically unlocks:
  - the **directory** for that city (name, branch, batch year, company —
    powered by the `city_members` view)
  - the **flat / PG / roommate board** for that city (`posts` table)

Nobody can read another city's directory or board — RLS checks that the
reader has an `approved` verification for that exact city on every query.

## Updating your existing (already-deployed) database

If you already ran the original `schema.sql` on a live Supabase project,
**don't re-run the whole file** — it'll error on tables that already exist.
Instead, run `supabase/migration_social_features.sql` once in the SQL
Editor. It adds: bios, post tags, public/private post replies, direct
messages, and widens the directory from "same city only" to "search the
whole batch."

## What's new: visual overhaul

- **Light/dark theme** — toggle in the navbar (sun/moon icon), remembers your
  choice, and respects system preference on first visit. No flash of the
  wrong theme on load.
- **Glassmorphism** — cards, inputs, and the navbar now use frosted-glass
  panels (blur + translucency) instead of flat borders, on both themes.
- **Welcome moment** — the first time you land on your city board each
  session, a congratulations overlay appears with your name and company.
- **Batch-specific branding** — this build is labeled for the **2027 batch**
  specifically (not a year range) across the title, meta description, and
  in-app copy. Change `BATCH_LABEL` in `lib/config.ts` if you fork this for
  a different batch.

## What's new: social features

- **Bio** — students can add a short (200-word) bio, editable anytime from
  `/profile`, shown in the directory and search results.
- **Batch-wide search** (`/directory`) — find anyone in the verified batch by
  name or company, regardless of which city they're headed to. City boards
  (`/dashboard/[city]`) still have their own local directory + search too.
- **Direct messages** (`/messages`) — any two verified batchmates can message
  each other. Message a person from their directory card or from a post.
- **Post tags & replies** — posts can carry a few tags (e.g. `sector-49`,
  `girls-only`) and are filterable by tag. Replies on a post can be public
  (visible thread under the post) or private (sends a DM to the poster
  instead).
- **Delete your own posts** from the board.
- **Admin gets both views** — an admin lands on `/admin` right after signing
  in, but the "Board" nav link always takes them to their own student
  dashboard too, so nothing is hidden behind the admin queue.

## About the "…supabase.co" text on the Google sign-in screen

When someone clicks "Continue with Google," Google's own consent dialog
shows something like *"to continue, Google will share your info with
abcdxyz.supabase.co."* That domain comes from your OAuth redirect URI, and
there's no free-tier way to swap it for your own domain — Supabase's
**custom auth domain** feature (which would fix this) is part of their paid
Pro plan (currently $25/mo), since it requires them to provision and manage
a certificate for a domain you own, sitting in front of their auth service.

It's not a bug and it's not something wrong with your setup — every free
Supabase project shows its own `*.supabase.co` domain there. Students can
still trust it because they're signing into an actual Google account picker,
not a fake page; it just won't say "thapar-placed.vercel.app" specifically
unless you upgrade Supabase later.

## Extending it

- **Multiple offers / city changes**: currently one active verification per
  user (unique index in the schema). If someone gets a better offer in a
  different city, an admin can reject the old one so they can resubmit.
- **Email notifications on approval**: add a Supabase Edge Function trigger
  on `verifications` update, or check for `status = 'approved'` in the
  `/pending` polling and show a toast (already effectively done via
  redirect).
- **Batch-wide directory across all cities**: relax the `city_members` RLS
  policy if you want all verified students to see each other regardless of
  city — not recommended if the whole point is per-city grouping.
