# Aolbeam AI

An AI-powered learning platform: an exam-prep tutor chat, AI problem generation with
step-by-step evaluation, and AI-generated learning paths (course-like curricula) — built
on Next.js 15, Supabase, and a multi-provider AI fallback chain.

## Features

- **AI tutor chat** — streaming chat with markdown/math (KaTeX) rendering, conversation
  history, context windowing, and a per-session message rail.
- **Problem generation & evaluation** — generate practice problems on any topic, solve
  them with a timer, and get step-by-step AI evaluation of your answer.
- **Learning paths** — AI-generated multi-module courses (6–9 modules) with per-step
  completion tracking and deep links into Practice (problem generator) and Learn (tutor chat).
- **Multi-provider AI fallback** — Groq (`gpt-oss-20b`) → Gemini → OpenAI (`gpt-4o-mini`),
  with hardened JSON extraction and a `json_validate_failed` retry so generation stays
  reliable even when one provider rejects its own output.
- **Auth & plans** — Supabase email + Google OAuth, free/paid tiers with usage limits,
  Cashfree and PayPal payment integration.

## Tech stack

- **Framework:** Next.js 15 (App Router, Turbopack) + React 18 + TypeScript
- **UI:** Tailwind CSS + Radix UI, `next-themes`, `lucide-react`
- **AI:** Genkit + Google AI, OpenAI SDK, Groq (OpenAI-compatible), with a custom
  provider fallback layer
- **Backend:** Supabase (Postgres, Auth, SSR), Row-Level Security
- **Payments:** Cashfree, PayPal

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the keys below
npm run dev                         # http://localhost:9002
```

### Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# AI providers (at least one required; fallback chain uses all it can find)
GROQ_API_KEY=<groq key>
GEMINI_API_KEY=<gemini key>
GEMINI_MODEL=gemini-3.8-flash   # override if your key supports a different model
OPENAI_API_KEY=<openai key>
```

> The Supabase auth cookie name is derived at runtime from `NEXT_PUBLIC_SUPABASE_URL`,
> so swapping Supabase projects needs no code change.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 9002 (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Next.js lint |
| `npm run typecheck` | `tsc --noEmit` |

## How requests are gated — `src/middleware.ts`

Next.js **edge middleware** runs on every request before a page or API route loads. It:

1. **Hides unlaunched features** — redirects "hidden route" paths back to `/`.
2. **Enforces auth** — for any non-public path it checks for the Supabase auth cookie
   (`sb-<project-ref>-auth-token`, derived from `NEXT_PUBLIC_SUPABASE_URL`); if missing,
   it redirects to `/login?redirectedFrom=…`. Public paths (`/`, `/chat`, `/tests`,
   `/pricing`, the auth/API routes, static assets) skip the check.

## Documentation

Deeper notes live in [`docs/`](./docs):

- `docs/RESUME.md` — current project state, what changed, and where to pick up.
- `docs/AI_COST_AND_CAPACITY.md` — provider free-tier limits, cost math, and the
  fallback-chain recommendation.
- `docs/SUPABASE_SETUP.md` — creating a fresh Supabase project and applying migrations.
- `PAYMENT-INTEGRATION.md` — Cashfree/PayPal integration notes.

## Known issues

See `docs/RESUME.md` → Known Issues. In short: a batch of pre-existing `tsc` errors
remain in the payment/subscription stack (documented, not regressions from recent work);
the app runs on the dev server, which is more lenient than strict `tsc`.

## License

**Proprietary — All Rights Reserved.** Copyright © 2026 Karan Sinha.

This is **not** open-source software. The repository is public for reference only.
You may **not** copy, use, deploy, modify, or redistribute any part of it without
the owner's prior written permission. See [`LICENSE`](./LICENSE) for the full terms.
