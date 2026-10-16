# Resume / Handoff — aolbeam-ai chat & learning rebuild

## Navigation feedback & manual modules — 2026-10-16

- Added immediate route-change feedback (top progress bar plus accessible “Opening page…” status) in `src/components/NavigationProgress.tsx`, root `src/app/loading.tsx` skeletons, and `src/hooks/useAppRouter.ts` for programmatic page changes. Internal links, query changes and back/forward navigation are covered; same-page anchors, downloads, external/new-tab links are excluded. Provider is wired through `components/Providers.tsx`. Throttled Chrome review confirmed feedback appears before the destination changes and clears on completion; network throttling was restored afterward.
- Added `src/components/learning-paths/AddModuleDialog.tsx` to the course roadmap. Learners specify title, coverage, objectives, duration, level, and insertion position (end or after an existing module). Added modules become the selected lesson and are labeled “Added by you”; their AI lesson is generated on demand using the existing lesson flow.
- `POST /api/learning-paths/[id]/modules` validates inputs, checks owner/auth, preserves saved lessons/progress, recalculates ordering, duration and resume position, and uses optimistic updates. Adds no AI usage event. Max course size is centralized as `LEARNING_PATH_MAX_MODULES` in `src/config/limits.ts`. No database migration was needed (modules live in existing steps JSONB).
- Checked local model configuration without exposing keys: Groq uses `openai/gpt-oss-20b`, Gemini defaults to `gemini-3.8-flash` (confirmed listed by the configured key), and OpenAI `gpt-4o-mini` is currently unconfigured. Chat and learning paths use Groq → Gemini → configured OpenAI. Practice/evaluation/insight Genkit flows try Gemini first, then the full shared chain on recoverable errors. Some old source comments describe outdated orders; `getAiProviders()` is authoritative.
- Fallback behavior checks passed for 429/quota/auth/server/model-not-found errors, immediate non-retryable 400 failures, pre-stream fallback, no mid-answer provider switch, and all-provider failure handling. No provider/model order changes were made.
- **Guardrail audit:** learning paths have auth, owner RLS, schema/output bounds, atomic daily generation reservations and saved-lesson reuse. Logged-in chat has daily count checks. Guest chat/practice trials are browser-local and bypassable; legacy AI routes/extras and Genkit server actions do not uniformly enforce server quotas or burst limits. No comprehensive moderation/global spend circuit breaker exists. Do not describe the app as abuse-proof. Hardening every AI entry point is still a priority before public rollout; this follow-up did not change guest access or implement that broader hardening.
- Suggested tutor name: **Beam**. User has not selected a name; branding/system prompt remain unchanged.
- Validation: TypeScript passed, isolated production build passed (kept the user's running dev server intact), manual-module API integration verified append/insertion/order/duration/resume/content preservation, rejection of invalid/unauthenticated/foreign edits and zero AI usage for manual additions. Disposable QA accounts/courses removed. Navigation feedback verified in a throttled browser. Full manual form submission through browser and physical-device QA remain for user review.

## UI & learning-path rebuild — 2026-10-16

- Revamped active pages around one responsive study workspace: sidebar/header/footer, home/practice studio, tutor, login, profile/settings/history/usage, about/contact and policy reading layouts. Hidden features remain gated; payment services/components were not changed.
- **User preference:** offer all visual directions for learners to choose. `src/components/appearance/StudyAppearance.tsx` provides Calm (warm/emerald), Colorful (violet) and Focus (cool blue), plus light/dark/system modes. The palette control is in the header; full controls are in profile settings. Style is saved per browser/device. Shared tokens, reading styles, focus states, restrained entrance/hover motion and reduced-motion support live in `src/app/globals.css`.
- Replaced learning-path placeholders with server-generated curricula (4–9 modules) that honor the goal, context, starting level, focus topics and available hours. No silent local-template fallback. Failed AI generation shows a retryable error.
- `src/components/learning-paths/CreatePathDialog.tsx`: goal → review → generation → saved course. `PathWorkspace.tsx`: roadmap, on-demand saved Markdown lessons/worked examples, MCQ checkpoints, completion/reset, resume, tutor and extra-practice links, completed-course state. Library supports search, status filters, rename and confirmed deletion. Profile links to recent paths.
- API: `src/app/api/learning-paths/generate/route.ts`, `[id]/lesson/route.ts`, `[id]/progress/route.ts`; library GET/rename PUT/delete DELETE remain in `route.ts`. Shared Zod contracts are in `src/lib/learning-paths/schema.ts`; auth/owner scoping, AI validation, optimistic update conflict handling and generation reservations in `server.ts`. Client API wrapper: `src/services/chat-feature/learningPathService.ts`.
- Applied migrations **20261016000000_learning_paths.sql** and **20261016010000_reserve_learning_generation.sql** to the linked Supabase project. Owner-only path RLS; lessons/checkpoints/progress in JSONB steps. Atomic per-learner reservations read limits from `src/config/limits.ts` (server passes the limit to SQL); saved lessons do not spend another generation. New-project setup must apply these migrations too.
- Corrected the missing delete endpoint and duplicate-insert progress bug. Progress is calculated server-side from completed steps. New `/chat/new` route creates a UUID destination; empty tutor sessions now show the welcome screen. Legacy tutor path creation delegates to the same real creator.
- Validation: strict TypeScript passed; full production build passed (existing Genkit/Handlebars/OpenTelemetry dependency warnings remain). Active-page HTTP smoke checks and auth redirects passed. Live AI API test generated/saved a six-module course and a lesson; tested wrong/correct answers, reload persistence, cached lessons, progress reset, rename, delete. Two disposable QA learners verified owner isolation (including direct RLS), full completion, concurrent allowance reservation and limit enforcement. All QA accounts/data were removed. Desktop library/creation dialog visually inspected; mobile home/tutor inspected at 400px in Chrome responsive mode. Verified Colorful/dark theme selection and persistence across reload. Fixed and visually rechecked empty-chat initial scrolling. Analytics only loads on Vercel, avoiding the local script-to-HTML error; final browser console had no JavaScript errors. Physical-device and full authenticated browser lesson QA remain for the user.
- Source edits are uncommitted. No deployment or remote Git push performed.

## Profile update — 2026-10-09

- Rebuilt `src/app/profile/dashboard.tsx` around saved practice, evaluated-answer accuracy, tutor messages and links to the three active features. Removed its dependency on subscription/payment UI and unavailable profile-stat columns.
- Replaced the missing-hook import in `components/usage/SubscriptionStatus.tsx` with the existing `useFeatureAccess` API. Usage limits come from `config/limits.ts`; hidden test usage is gated by feature flags. Removed the pricing-page dependency from the hook.
- Profile settings now edit the supported `full_name` field and support sign-out. Removed unimplemented notifications/account deletion and billing controls from settings. Saving invalidates dashboard data.
- Profile practice history counts the correct table, filters saved practice problems, handles failures with retry, labels unevaluated problems correctly, and reviews answers/feedback inline instead of linking to nonexistent `/practice/:id` pages.
- Verified signed-in dashboard and saved problem in Brave, settings save using the existing name, and history/inline review. Strict typecheck now has 42 remaining pre-existing errors, none in these changed files. No payment-service code changed.

## Supabase setup update — 2026-10-09

- New project: **aolbeam2026**, ref `ooymzqrqlovuhdsghqyq` (Singapore). CLI linked; `.env.local` now uses its URL, project ID, anon key and server-only service-role key. No secrets are stored here.
- Initialized `supabase/config.toml`. Applied the 12 existing migrations plus `20261009000000_complete_interaction_history.sql`.
- Fresh-project migration fixes: generated dates use explicit UTC; UUID defaults use built-in `gen_random_uuid()` so extension search paths do not break setup.
- Added missing problem-history fields and owner-only interaction RLS; removed the per-user/type/day unique constraint so repeated chat/problem events can be recorded.
- Supabase Auth Site URL: `http://localhost:9002`; allowed redirect: `http://localhost:9002/auth/callback`. Fixed app OAuth callback to preserve the incoming port instead of defaulting to 3000.
- Verified core table REST reads with the server key, auth settings with the anon key, homepage HTTP 200, and the logged-out interaction-check response. Full signed-in flow still needs user verification.
- **Google configured:** user entered OAuth credentials and enabled the provider. Verified auth settings report Google enabled and OAuth authorization returns HTTP 302 to accounts.google.com with the new Supabase callback. User confirmed browser Google sign-in works locally. Google Cloud authorized redirect URI must be `https://ooymzqrqlovuhdsghqyq.supabase.co/auth/v1/callback`. Add production app URLs in Supabase when deploying. Old-project data has not been migrated.
- Strict typecheck still has 44 pre-existing errors; payment code was not modified.

_Session: 2026-10-04. Branch `feat/ai-fallback-and-simplify`, merged into `master` (local only, NOT pushed)._

## TL;DR — where we are

The chat, problem-generation, and learning-path features were rebuilt and hardened. Everything is committed on **`master`** (local). The app runs on a **multi-provider AI fallback chain** so it survives one provider being down/over-quota. Login was removed for testing then **restored**, with generous free/paid limits.

**Not done yet / next up:** see "Open items" at the bottom. The big pending decision is the AI cost/model restructure — see `docs/AI_COST_AND_CAPACITY.md`.

## Environment prerequisites (to run locally)

```bash
cd /Users/ksmac/karanDev/aolbeam-ai
npm run dev            # port 9002
```
`.env.local` needs at least ONE AI key (chain skips unconfigured providers):
- `GROQ_API_KEY` — free, no card: console.groq.com/keys (currently primary)
- `GEMINI_API_KEY` + **`GEMINI_MODEL`** — the hardcoded models were retired by Google (404). Set `GEMINI_MODEL` to a model your key supports (we defaulted `gemini-3.8-flash`; **verify it works for your key** or set e.g. `gemini-2.5-flash`).
- `OPENAI_API_KEY` (optional, fallback) + optional `OPENAI_MODEL` (default `gpt-4o-mini`).
- Supabase: `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY`. **The Supabase project was frozen** (inactivity) — un-pause it or create a new one. If new, note `user_profiles` has NO migration (see "Known issues").

## What changed this session (by area)

### 1. AI provider layer (`src/lib/ai/`)
- New multi-provider fallback: `runWithFallback.ts` (generate + `streamWithFallback`), providers in `providers/{groq,gemini,openai}.ts`, shared types + `extractJsonString` + `isFallbackError` in `providers/types.ts`.
- Order: **Groq (`gpt-oss-20b`) → Gemini → OpenAI**.
- Robust JSON extraction (string-aware brace scanner; ignores ```` ```python ```` fences embedded in JSON string values).
- Groq: retry WITHOUT strict `response_format` on a 400 `json_validate_failed`.
- Gemini/Genkit model made env-configurable (dead hardcoded model fixed).
- Genkit flows fall through to the chain via `src/ai/runGenkitWithFallback.ts`.

### 2. Chat (rebuilt as modern 2026 UI)
- `/api/chat/stream` — SSE streaming endpoint, full-history context, server-side limit (single authority for logged-in users), usage recorded.
- `useChat.ts` — streaming send, running transcript, context windowing (`src/lib/ai/contextWindow.ts`), auto-title from first message, guest trial gate.
- UI: `ChatMessage.tsx` (ONE borderless renderer — no bubbles), `ChatHistoryRail.tsx` (grouped history, rename/delete/new), `ChatInterface.tsx` (two-column, single internal scrollbar, stick-to-bottom + jump button), `ChatMarkdown.tsx` (GFM + KaTeX).
- Deleted dead renderers: MessageBubble, EnhancedMessageBubble, EnhancedMessageSections, StreamingText.
- Markdown `.md` download per answer (`src/lib/downloadResponse.ts`). PDF/print was removed (Firefox-flaky).
- Scoped double-scrollbar fix: `src/app/chat/[sessionId]/layout.tsx` + `h-[calc(100dvh-4rem)]` on the page; app menu sidebar kept.

### 3. Problem generation
- Timer now STOPS on submit + guards double-submit (`ProblemDisplay.tsx`).
- Evaluation UI modernized via `ChatMarkdown` (`EvaluationResult.tsx`).
- JSON parse bugs fixed (see AI layer).

### 4. Learning Paths (`/learning-paths`, reached from the menu)
- Menu creator now generates REAL AI course steps (6–9 modules) via the robust chain, local-template fallback (`learningPathService.createCustomLearningPath`).
- Step completion fixed (composite id `path-{id}-step-{id}`, regex-parsed in the page).
- Practice button → `/?topic=X&generate=1` (home auto-generates); Learn → `/chat/<uuid>?q=...` (chat auto-sends the seed).

### 5. Limits & auth (`src/config/limits.ts`)
- Single source of truth; fixed a DRIFT where `/api/interactions/check` hardcoded its own paid numbers.
- Current: guest 50 (chat trial + problem gen), free 100/day, paid tiers 300–2000. See the file.
- Login guards restored after guest-testing (middleware, learning-paths wall, service).

## Known issues / gotchas
- **Pre-existing `tsc` errors: ~44 remain** (down from 63 this session). They are NOT from this session's features. Fixed the safe/mechanical ones (searchParams null-guards, TestProblem casing, LearningSidebar props, type re-exports). The REMAINING ~44 are higher-risk and were left deliberately:
  - **Payment/subscription stack (~22):** `src/services/cashfree.ts`, `src/hooks/useSubscription.ts`, `src/components/SubscriptionPlans.tsx`, `CashfreePayment.tsx`, `PayPalButton.tsx`, `src/components/checkout/*`. Missing module exports (`loadCashfree`, `initializePayment`, `ConvertedPlan`, `useSubscriptionStatus`) + a conflicting global `Cashfree` type. Looks like a refactor where callers weren't updated — fix WITH a working payment test path, not blind, because wrong guesses silently break billing.
  - **Type-model cleanup (rest):** `TestProblem` (src/types/testTypes.ts) has duplicate camel+snake fields and a second definition in `custom.d.ts`; `ProblemType` has `mcq`/`random`/`practical_mcq` mismatches across page.tsx / profile/history / HistoryView; `AuthContextType.session` missing; a few implicit-any params. Needs one deliberate pass.
  - The app runs regardless — Next's dev build is more lenient than strict `tsc`. But `npm run build` may surface some of these.
- **`useSearchParams` without Suspense**: the home page and chat page read `useSearchParams`. Works in dev; `npm run build` may require wrapping the page in `<Suspense>`. Fix if build complains.
- **Nothing is runtime-tested by the agent** — host was memory-critical all session; all changes verified via `tsc --noEmit` only. The USER ran it live and confirmed chat / problems / learning paths work.
- **New Supabase project needs**: `user_profiles` table has no migration (code reads it in `/api/interactions/check`); re-do Google OAuth; `supabase init && db push` for the 11 existing migrations.
- Not pushed to remote; `master` is ahead of `origin/master`.

## Open items (take it forward here)
1. **AI cost/model restructure** (pending decision) — make Gemini-flash primary + trim tokens. Full analysis + exact file locations in `docs/AI_COST_AND_CAPACITY.md`.
2. Fix `src/types/supabase-schema.ts` (regenerate from Supabase or delete if unused).
3. Add `<Suspense>` boundaries if `npm run build` flags `useSearchParams`.
4. Un-pause Supabase (or new project + `user_profiles` migration + OAuth).
5. Image/file upload to the tutor (multimodal) — provider abstraction is ready; see earlier analysis (change `ChatTurn.content` to parts, add upload UI).

## Commit trail (this session, on `master`)
Range `9f5a123..HEAD` (31 commits). Key ones:
`9f5a123` multi-provider fallback · `d3d8fe3` streaming chat · `e5bb53d`/`f260b9d` chat UI rebuild ·
`8494f19`/`4de57d7` JSON + model fixes · `502b14f` problem timer/eval · `0feebe5`/`7440b13` learning-path buttons ·
`7d03d9d` merge · `bb62c01` restore login · `6465b08` raise limits + drift fix.
