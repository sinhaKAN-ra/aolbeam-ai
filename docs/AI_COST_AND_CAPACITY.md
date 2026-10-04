# AI Cost & Capacity Planning

_Last updated: 2026-10-04. Figures verified against provider rate-limit docs (Aug 2026); re-check before relying on them — free tiers change often._

## Current provider stack

Fallback chain (in `src/lib/ai/runWithFallback.ts` → `getAiProviders()`):

| Order | Provider | Model (default, env-overridable) | Role today |
|-------|----------|----------------------------------|------------|
| 1 | Groq | `gpt-oss-20b` (`GROQ_MODEL`) | primary — free tier |
| 2 | Gemini | `gemini-3.8-flash` (`GEMINI_MODEL`) | fallback 1 |
| 3 | OpenAI | `gpt-4o-mini` (`OPENAI_MODEL`) | fallback 2 |

The chain falls through automatically on a fallback-class error (429 / quota / 401 expired / 5xx / network). A 400 (bad request) is surfaced, not retried.

## The scenario: 50 DAU × 20–30 queries/day

A "query" = one chat turn OR one problem/path generation. Token sizing used:
`in ≈ 1,200` (prompt + history + system), `out ≈ 700` (answer / problem JSON).

| Load | Requests/day | Tokens/day | Requests/mo | Tokens/mo |
|------|-------------|-----------|-------------|-----------|
| 20 q/user | 1,000 | 1.9 M | 30,000 | 57 M |
| 30 q/user | 1,500 | 2.85 M | 45,000 | 85.5 M |

## Can the FREE tiers support this? — No (token quota is the wall)

- **Groq free (`gpt-oss-20b`)**: ~30 RPM, **~1,000 requests/day**, **200K tokens/day**.
  → Our load is **~10–14× over the 200K token/day cap**. The request cap is also hit at 30 q/user.
- **Gemini free**: ~15 RPM, **~20 requests/day/model** — far too small to be a primary; fine only as a rare fallback.
- **Rate (RPM) is NOT the problem**: even 30 q/user concentrated in a 4-hour window averages ~6 RPM, well under every cap. Only the **daily token quota** matters.

**Conclusion:** free tier is fine for prototyping, not for 50 real DAU. You will exhaust the Groq free token quota within a fraction of the day.

## Cost if we pay (this scale is cheap)

`gpt-oss-20b` on Groq = $0.10 / $0.50 per M (in/out). Estimated monthly cost:

| Provider (model) | @ 20 q/user | @ 30 q/user |
|------------------|------------|------------|
| **Gemini 2.5-flash** (~$0.075/$0.30) | **~$9** | **~$14** |
| Groq `gpt-oss-20b` | ~$14 | ~$21 |
| OpenAI `gpt-4o-mini` (~$0.15/$0.60) | ~$18 | ~$27 |

**≈ $10–25/month for 50 DAU.** Cost is trivial; the free-tier *limits* are the real constraint.

## Recommendation (NOT yet implemented — decision pending)

1. **Make Gemini 2.5-flash the primary.** Cheapest (~$9/mo) AND the most reliable structured-JSON output (it fixed the problem-gen JSON bugs). New order: **Gemini → Groq → OpenAI**.
2. **Cut token usage — this is the biggest lever** (halves cost, stretches any free quota):
   - Keep the context window tight (last 8–10 turns, not 12+) — see `src/lib/ai/contextWindow.ts` (`RECENT_TURNS_KEPT`, `SUMMARY_TRIGGER`).
   - Trim the long tutor/problem system prompts.
   - Cap `max_tokens` on problem generation (don't need 700+ out).
   - Expected 30–50% token reduction.
3. **Optional "free-first with paid overflow":** route to Groq's free tier until its daily quota trips (429), then fail over to paid. The fallback mechanism already supports this via automatic fall-through.

### Where to implement each
- Chain order: `src/lib/ai/runWithFallback.ts` → `getAiProviders()`.
- Models: `src/lib/ai/providers/{gemini,groq,openai}.ts` + `src/ai/genkit.ts` (all env-overridable).
- Token window: `src/lib/ai/contextWindow.ts`.
- Prompts: `src/app/api/chat/stream/route.ts` (TUTOR_SYSTEM), `src/ai/flows/generate-practice-problem.ts`, `src/app/api/gemini/route.ts`.
- Limits (per-tier daily caps, enforced): `src/config/limits.ts`.

## Open decision
Reorder to Gemini-primary + tighten tokens? (user deferred on 2026-10-04 — revisit).
