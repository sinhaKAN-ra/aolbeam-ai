# Resume / Handoff — aolbeam-ai chat & learning rebuild

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
- **`src/types/supabase-schema.ts` is broken** — contains CLI text, not TypeScript. It throws ~10 `tsc` errors (pre-existing, unrelated). We filtered it in every typecheck. `npm run dev` tolerates it; **`npm run build` may not** — fix or delete this file before a production build.
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
