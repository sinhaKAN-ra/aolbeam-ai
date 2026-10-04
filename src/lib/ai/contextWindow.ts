import type { ChatTurn } from '@/lib/ai/providers/types';

/**
 * Context-window management for long conversations.
 *
 * The chat sends the FULL transcript to the model every turn so follow-ups and
 * "summarise everything" work. That is correct but unbounded — a very long chat
 * eventually exceeds the model's token window. This helper keeps the most
 * recent turns verbatim and folds everything older into ONE compact running
 * summary turn, so context stays bounded while continuity is preserved.
 *
 * Dependency-free and deterministic (no extra model call): the "summary" is an
 * extractive digest of the older turns. It is injected as a leading system turn
 * the model treats as prior context. If you later want a higher-quality
 * abstractive summary, swap buildExtractiveSummary for a cached model call —
 * the call sites here do not change.
 */

/** Keep this many of the most recent turns verbatim. */
export const RECENT_TURNS_KEPT = 12;
/** Only summarise once the history is longer than this (avoids churn on short chats). */
export const SUMMARY_TRIGGER = 16;

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Build a compact extractive digest of older turns: a bulleted list of what the
 * user asked and what the assistant covered, clipped per line and overall.
 */
export function buildExtractiveSummary(older: ChatTurn[]): string {
  const lines: string[] = [];
  for (const t of older) {
    if (t.role === 'user') lines.push(`- User asked: ${clip(t.content, 160)}`);
    else if (t.role === 'assistant') lines.push(`- You explained: ${clip(t.content, 200)}`);
  }
  // Cap total size so the summary itself can't balloon.
  let digest = lines.join('\n');
  if (digest.length > 2000) digest = `${digest.slice(0, 1999)}…`;
  return digest;
}

/**
 * Given the full transcript, return the turns to actually send: a leading
 * summary turn (only when the chat is long enough) + the recent verbatim tail.
 */
export function windowedHistory(full: ChatTurn[]): ChatTurn[] {
  if (full.length <= SUMMARY_TRIGGER) return full;

  const recent = full.slice(-RECENT_TURNS_KEPT);
  const older = full.slice(0, full.length - RECENT_TURNS_KEPT);
  const summary = buildExtractiveSummary(older);

  // NOTE: use a USER-role turn, not system. The Gemini provider drops any
  // system-role turn found mid-array (it only accepts user/model in contents),
  // so a system summary would silently vanish on the Gemini fallback. A user
  // turn is preserved by every provider. We label it clearly as recap context.
  const summaryTurn: ChatTurn = {
    role: 'user',
    content:
      '[Recap of our earlier conversation, condensed to stay within context limits — this is context you already know, do not respond to it directly]\n' +
      summary,
  };

  return [summaryTurn, ...recent];
}
