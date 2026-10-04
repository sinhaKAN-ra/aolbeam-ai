# Supabase Setup — new project

_The original project was suspended (free-tier inactivity). This is how to stand up a fresh one so all DB/auth features work. Written 2026-10-04._

## 1. Create the project
- [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**. Save the DB password somewhere safe.
- Wait for it to finish provisioning (~2 min).

## 2. Keys → `.env.local`
Project Settings → **API**:
```
NEXT_PUBLIC_SUPABASE_URL=https://<new-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>   # server-only, never ship to client
```
`<new-ref>` is the subdomain of the project URL.

## 3. Apply migrations
There was no `supabase/config.toml`, so initialise the CLI first:
```bash
cd /Users/ksmac/karanDev/aolbeam-ai
npx supabase init          # creates supabase/config.toml (commit it)
npx supabase link --project-ref <new-ref>   # prompts for the DB password
npx supabase db push       # applies all migrations in supabase/migrations/
```
This runs all 12 migrations, **including** `20251004000000_create_user_profiles.sql` (added this session — the app reads `user_profiles` but no migration existed; without it `/api/interactions/check` 500s).

## 4. Google OAuth (NOT in migrations — must redo)
Dashboard → **Authentication → Providers → Google**:
- Enable it, paste your Google **Client ID** + **Client Secret** (from Google Cloud Console → OAuth credentials).
- Authorised redirect URLs must include:
  - `http://localhost:9002/auth/callback`
  - your production URL's `/auth/callback` when you deploy
- In Google Cloud Console, add the same redirect URIs to the OAuth client.

## 5. ⚠️ Update the hardcoded project ref in middleware
`src/middleware.ts` checks for the auth cookie by name, and the OLD project ref is hardcoded:
```ts
const cookieBaseName = 'sb-jfgaaboxjjkbxjnqtzln-auth-token';
```
Change `jfgaaboxjjkbxjnqtzln` to your **new** project ref, or the middleware won't detect logged-in users and will redirect everyone to /login.
_(Better: make it env-driven from `NEXT_PUBLIC_SUPABASE_URL` — see RESUME.md open items.)_

## 6. Storage buckets (only if used)
Migrations don't create storage buckets. If any feature uploads files, recreate the bucket(s) under Dashboard → Storage with the same names/policies.

## 7. Restart & verify
```bash
# fresh terminal so .env.local reloads
npm run dev
```
- Sign in with Google → a `user_profiles` row is auto-created by the signup trigger.
- Confirm `/api/interactions/check` returns 200 (no 500) once signed in.

## What migrations DO and DON'T cover
- **Covered** (in `supabase/migrations/`): user_profiles (new), chat_sessions + chat_messages, user_interactions, user_usage, subscriptions, payment_orders, test_series (+ shared), usage functions/triggers, RLS policies.
- **NOT covered** (manual): auth provider config (Google OAuth), redirect URLs, storage buckets, the project-ref in middleware, and any secrets/env.
