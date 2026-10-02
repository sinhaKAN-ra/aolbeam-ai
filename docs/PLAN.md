# Exam Prep AI — Hardening & Simplification Plan

Status: living document. Updated as we build.
Owner: Karan. Last updated: 2026-10-02.

## Goal of this phase
Make the **AI Chat Tutor** the focused, robust core of the product. Hide the
half-finished features so the app feels simple, and fix the real bugs in the
chat + usage-limit path. Everything hidden is kept in the codebase to build
later.

---

## 1. Robust multi-provider AI fallback  (TOP PRIORITY)

**Problem today**
- The chat tutor's "main content" never actually reaches a live model — the
  client `src/services/chat-feature/geminiService.ts` returns **hardcoded
  canned text** for 2 topics and a generic template for everything else.
- The real model call is in `src/app/api/gemini/route.ts`, using a single
  `gemini-2.0-flash-exp` key. When that key **expires or hits its quota**, the
  route throws and the UI shows an error — there is **no fallback**.
- `src/app/api/openai/route.ts` is **entirely commented out** (dead fallback).
- Bug: `useChat.ts` calls `/api/brave-search`, but the route is `/api/brave`.
  That search call silently fails every time.

**Design — a provider registry (append-to-extend)**
A provider is a small object:

```ts
interface AiProvider {
  name: string;
  isConfigured: () => boolean;          // key present in env?
  generate: (req: AiRequest) => Promise<AiResult>;
}
```

A single runner walks an ordered list and falls through on
quota / rate-limit / expiry / 5xx errors:

```
try Gemini -> on quota/429/401/5xx -> try OpenAI -> try Groq -> ... -> graceful error
```

- Adding a provider later = **append one entry** to the array. No other change.
- Non-retryable errors (bad request, 400) do NOT fall through — they surface,
  so we don't burn every provider on a malformed prompt.
- Each provider reports *why* it was skipped (not configured / quota / error)
  for logging, so we can see which key is dying.

**Files**
- `src/lib/ai/providers/types.ts`      — the interface + error classification
- `src/lib/ai/providers/gemini.ts`     — wraps current Gemini call
- `src/lib/ai/providers/openai.ts`     — revive the commented route logic
- `src/lib/ai/providers/groq.ts`       — optional free/cheap last resort
- `src/lib/ai/runWithFallback.ts`      — the ordered runner
- `src/app/api/gemini/route.ts`        — swap internals to use the runner
                                          (keep the route path for compat)

**Search fallback (same shape, for Brave)**
- `src/lib/search/providers/*`  — Brave first, then a fallback (e.g. SerpAPI
  / DuckDuckGo). Same runner, same "append to add" rule.
- Fix the `/api/brave-search` -> `/api/brave` path bug in `useChat.ts`.

**Env (document, don't commit keys)**
```
GEMINI_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=          # optional
BRAVE_API_KEY=
SEARCH_FALLBACK_KEY=   # optional
```
Provider is active only if its key is set — missing keys are skipped silently.

---

## 2. Unify + loosen usage limits (logged-in users only)

**Problem today — three disagreeing limit systems:**
| Source | Free limit | Notes |
|---|---|---|
| `src/app/api/interactions/check/route.ts` | 15 | server |
| `src/app/api/chat/messages/route.ts` | 15 (`free`) | server, daily |
| `src/hooks/useFeatureAccess.ts` | chat 15 / ai_gen 20 | **client — the real gate** |

They can disagree; the client hook is what actually blocks chat.

**Plan**
- One shared limits config: `src/config/limits.ts` (single source of truth).
- Raise the logged-in free chat limit from **15 -> 50/day** (final number TBD
  with Karan). Keep per-user daily tracking via the existing
  `user_interactions` table (no schema change needed).
- Guests stay gated to the login modal (already the behavior) — the loosened
  limit applies ONLY to logged-in users.
- Point `useFeatureAccess`, `interactions/check`, and `chat/messages` all at
  `src/config/limits.ts` so they can never drift again.

---

## 3. Hide not-yet-focused features (keep code, flip a flag)

Hide from nav + guard the routes; **do not delete**. Controlled by one config.

**File:** `src/config/features.ts`
```ts
export const FEATURES = {
  chat: true,            // focus
  problemGenerator: true,// focus (home)
  mathDiagrams: true,    // focus
  learningPaths: true,
  tests: false,          // hidden
  testSeries: false,     // hidden
  blog: false,           // hidden (public + admin authoring)
  studyResources: false, // hidden (optional — decide)
};
```
- `SidebarContent.tsx` filters its nav arrays by `FEATURES`.
- Hidden routes get a lightweight guard (redirect home) so a deep link to a
  hidden page can't 404/leak a half-built screen.
- Flip a flag to `true` to bring a feature back when we build it.

**User's option mapping (from the request):**
- Hide: 4 (tests), 5 (test series), 6 (study resources?), 8 (blog/content).
- Improve: 1 (problem generation), 2 (answer evaluation), 7 (math/diagrams).
- Make better: AI chat tutor (the focus).

---

## 4. Build into a proper tool, incrementally

Order of work:
1. Plan doc + feature flags + limits config  (safe, no live-path risk) ✅ this step
2. AI provider registry + fallback runner, wire into `/api/gemini`
3. Search provider fallback + fix `/api/brave-search` path bug
4. Unify limit sources -> `src/config/limits.ts`, raise logged-in limit
5. Apply feature flags to nav + route guards
6. Audit & fix bugs in problem generation, answer evaluation, math/diagram
   rendering (options 1, 2, 7) ✅ done 2026-10-02

### Phase 6 — what was fixed (2026-10-02)
- **Genkit flows now have fallback.** `generate-practice-problem`,
  `evaluate-theory-answer`, `generate-problem-insights` were a SEPARATE
  single-provider path (Genkit -> googleai/gemini-2.0-flash only), NOT covered
  by the chat fallback. Added `src/ai/runGenkitWithFallback.ts`: tries Genkit
  first, and on quota/expiry/5xx falls through to the same provider chain
  (OpenAI -> Groq), validating the result against the flow's Zod schema.
- `evaluate-theory-answer`: removed the unguarded `output!` (opaque crash on
  empty response) — now routed through the adapter.
- `generate-problem-insights`: fixed `z` imported from `'zod'` -> `'genkit'`.
- **Mermaid (#7):** the digital-electronics "fixer" fired on any diagram
  CONTAINING the substrings "OR"/"AND" (e.g. "word", "brand"), corrupting
  unrelated diagrams, and the gate rewrite double-mangled valid syntax. Both
  `mermaidHelper.ts` and `mermaidFormatter.ts` now require a real gate NODE
  (`OR(` / `AND(` ...) before touching the diagram.
- Still TODO (noted, not yet done): the two Mermaid util files still DUPLICATE
  `fixDigitalElectronicsDiagram` with divergent impls — collapse into one
  module in a later pass. The Map-based rebuild also still drops edge labels.

Each step is independently shippable and reversible.

---

## Known bugs found during audit (2026-10-02)
- `useChat.ts` -> `/api/brave-search` (wrong path; should be `/api/brave`).
- `geminiService.ts` client is canned responses, not a live model.
- `package.json`: `isomorphic-dompurify` listed twice (duplicate key).
- Leftover `src/hooks/useFeatureAccess.ts.bak`.
- `README.md` still the Firebase Studio starter text.
- Three independent, disagreeing limit definitions (see §2).
