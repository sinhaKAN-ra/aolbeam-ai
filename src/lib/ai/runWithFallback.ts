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
