/**
 * AI provider abstraction.
 *
 * Robustness goal: when one provider's key expires or hits its quota/rate
 * limit, the runner falls through to the next provider automatically. Adding a
 * new provider later = append one entry to the array in `getAiProviders()`.
 */

export interface AiRequest {
  /** The fully-built prompt text. */
  prompt: string;
  /** Optional system instruction. */
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** If true, the caller expects a JSON payload back (we strip code fences). */
  json?: boolean;
}

/** One turn in a multi-message conversation. */
export interface ChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** A conversational request carrying full history for context. */
export interface ChatRequest {
  messages: ChatTurn[];
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiResult {
  text: string;
  /** Which provider actually answered. */
  provider: string;
}

export interface AiProvider {
  name: string;
  /** True only when the provider's API key is present in env. */
  isConfigured: () => boolean;
  /** Throws on failure; the runner classifies the error. */
  generate: (req: AiRequest) => Promise<string>;
  /**
   * Optional streaming conversational call. Yields text chunks as they arrive.
   * Providers that don't implement this are skipped by the streaming runner.
   */
  stream?: (req: ChatRequest) => AsyncIterable<string>;
}

/**
 * Should the runner fall through to the NEXT provider on this error?
 * Yes for the things that mean "this key/provider is unavailable right now":
 * quota exhausted, rate limited (429), auth/expiry (401/403), server errors
 * (5xx), and network failures. No for a 400 (bad prompt) — that would fail on
 * every provider, so we surface it instead of burning the whole chain.
 */
export function isFallbackError(error: unknown): boolean {
  const e = error as any;
  const status: number | undefined =
    e?.status ?? e?.statusCode ?? e?.response?.status;

  if (typeof status === 'number') {
    if (status === 429) return true;              // rate limit
    if (status === 401 || status === 403) return true; // expired / forbidden key
    if (status >= 500) return true;               // provider down
    if (status === 404) return true;              // model/endpoint not available on this account
    if (status === 400) return false;             // bad request — do not retry
  }

  const msg = String(e?.message ?? e ?? '').toLowerCase();
  const fallbackSignals = [
    'quota',
    'rate limit',
    'rate-limit',
    'exhausted',
    'exceeded',
    'resource has been exhausted',
    'expired',
    'invalid api key',
    'api key not valid',
    'model_not_found',
    'does not exist or you do not have access',
    'permission denied',
    'overloaded',
    'unavailable',
    'timeout',
    'timed out',
    'econnreset',
    'fetch failed',
  ];
  return fallbackSignals.some((s) => msg.includes(s));
}

/** Strip ```json ... ``` fences and surrounding prose from a model reply. */
export function extractJsonString(raw: string): string {
  const trimmed = raw.trim();

  // 1) Prefer a fenced block ONLY when it actually contains JSON. The model may
  //    legitimately return a ```json { ... } ``` block, but it may ALSO embed a
  //    ```python ...``` code fence INSIDE a JSON string value — matching the
  //    first fence blindly would extract that code and fail to parse. So accept
  //    a fence only if its body starts with { or [; otherwise fall through to
  //    the depth-scanner below, which finds the real JSON object around it.
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenceMatch?.[1]) {
    const body = fenceMatch[1].trim();
    if (body.startsWith('{') || body.startsWith('[')) return body;
  }

  // 2) Otherwise, extract the OUTERMOST JSON value by scanning for the first
  //    opening bracket and matching its true close via depth counting (string-
  //    aware). This is critical: a naive /\[.*\]/ would grab the inner array of
  //    an object like {"options":[...]} and drop the rest, producing a parse
  //    error ("unexpected non-whitespace after JSON"). Objects win ties.
  const firstObj = trimmed.indexOf('{');
  const firstArr = trimmed.indexOf('[');
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return trimmed;

  const open = trimmed[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  // Unbalanced — return from the first bracket onward and let the caller fail
  // loudly rather than silently truncating.
  return trimmed.slice(start);
}
