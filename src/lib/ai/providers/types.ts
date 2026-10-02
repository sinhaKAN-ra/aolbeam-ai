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
  const arrayMatch = raw.match(/\[\s*[\s\S]*\]/);
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  const fenceMatch = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  if (arrayMatch) return arrayMatch[0];
  if (objectMatch) return objectMatch[0];
  return raw.trim();
}
