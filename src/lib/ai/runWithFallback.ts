import {
  type AiProvider,
  type AiRequest,
  type AiResult,
  isFallbackError,
} from './providers/types';
import { geminiProvider } from './providers/gemini';
import { openaiProvider } from './providers/openai';
import { groqProvider } from './providers/groq';

/**
 * The ORDERED provider chain. The runner tries each in turn.
 *
 * ====================================================================
 *  TO ADD A NEW PROVIDER LATER: write a wrapper under ./providers/ that
 *  implements AiProvider, import it, and add it to this array. Nothing
 *  else needs to change.
 * ====================================================================
 */
export function getAiProviders(): AiProvider[] {
  return [
    geminiProvider, // primary
    openaiProvider, // fallback 1
    groqProvider, // fallback 2 (free/cheap last resort)
    // nextProvider,  <-- append new providers here
  ];
}

export interface RunOptions {
  /** Override the default ordered chain (mainly for tests). */
  providers?: AiProvider[];
}

/**
 * Run an AI request through the provider chain. Tries each CONFIGURED provider
 * in order; on a fallback-class error (quota, 429, expired key, 5xx, network)
 * it moves to the next. A non-fallback error (e.g. 400 bad prompt) is thrown
 * immediately so we don't burn the whole chain on an unfixable request.
 *
 * Throws AllProvidersFailedError only when every configured provider failed.
 */
export async function runWithFallback(
  req: AiRequest,
  opts: RunOptions = {}
): Promise<AiResult> {
  const all = opts.providers ?? getAiProviders();
  const configured = all.filter((p) => p.isConfigured());

  if (configured.length === 0) {
    throw new AllProvidersFailedError(
      'No AI provider is configured. Set at least one of GEMINI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY.',
      []
    );
  }

  const attempts: ProviderAttempt[] = [];

  for (const provider of configured) {
    try {
      const text = await provider.generate(req);
      if (!text || !text.trim()) {
        // Empty answer — treat as a soft failure and fall through.
        attempts.push({ provider: provider.name, error: 'empty response' });
        continue;
      }
      return { text, provider: provider.name };
    } catch (error) {
      attempts.push({
        provider: provider.name,
        error: (error as Error)?.message ?? String(error),
      });

      if (isFallbackError(error)) {
        console.warn(
          `[ai] provider "${provider.name}" unavailable, falling through:`,
          (error as Error)?.message
        );
        continue; // try the next provider
      }

      // Non-fallback error (e.g. malformed request) — would fail everywhere.
      throw error;
    }
  }

  throw new AllProvidersFailedError(
    'All configured AI providers failed.',
    attempts
  );
}

export interface ProviderAttempt {
  provider: string;
  error: string;
}

export class AllProvidersFailedError extends Error {
  attempts: ProviderAttempt[];
  constructor(message: string, attempts: ProviderAttempt[]) {
    super(message);
    this.name = 'AllProvidersFailedError';
    this.attempts = attempts;
  }
}

/**
 * Streaming variant of the fallback runner. Yields { chunk } objects as text
 * arrives. Falls through to the next provider ONLY if the failure happens
 * before any chunk was emitted — once the client has seen tokens we can't
 * silently switch providers mid-answer. Providers without a `stream` method
 * are skipped.
 */
export async function* streamWithFallback(
  req: import('./providers/types').ChatRequest,
  opts: RunOptions = {}
): AsyncGenerator<{ chunk: string; provider: string }> {
  const all = (opts.providers ?? getAiProviders()).filter(
    (p) => p.isConfigured() && typeof p.stream === 'function'
  );

  if (all.length === 0) {
    throw new AllProvidersFailedError(
      'No streaming AI provider is configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY.',
      []
    );
  }

  const attempts: ProviderAttempt[] = [];

  for (const provider of all) {
    let emitted = false;
    try {
      for await (const chunk of provider.stream!(req)) {
        emitted = true;
        yield { chunk, provider: provider.name };
      }
      return; // completed successfully
    } catch (error) {
      attempts.push({
        provider: provider.name,
        error: (error as Error)?.message ?? String(error),
      });
      // If tokens already streamed to the client, we cannot switch providers.
      if (emitted) throw error;
      if (isFallbackError(error)) {
        console.warn(
          `[ai-stream] provider "${provider.name}" unavailable pre-stream, falling through:`,
          (error as Error)?.message
        );
        continue;
      }
      throw error;
    }
  }

  throw new AllProvidersFailedError('All configured streaming providers failed.', attempts);
}
