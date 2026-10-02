import type { z } from 'genkit';
import { runWithFallback } from '@/lib/ai/runWithFallback';
import { isFallbackError, extractJsonString } from '@/lib/ai/providers/types';

/**
 * Robustness adapter for Genkit flows.
 *
 * Genkit here is bound to Google (gemini-2.0-flash). When Google is over quota
 * or its key expires, the Genkit prompt throws. Rather than hard-fail (as the
 * flows did before), we fall through to the SAME multi-provider chain the chat
 * uses (OpenAI -> Groq -> ...), asking the next provider to produce the same
 * JSON shape and validating it against the flow's Zod output schema.
 *
 * Usage inside a flow:
 *   const output = await runGenkitWithFallback({
 *     genkit: () => prompt(input),              // the primary Genkit call
 *     schema: MyOutputSchema,                   // the flow's output schema
 *     buildPrompt: () => `...full prompt text`, // text the fallback provider sees
 *   });
 */
export interface GenkitFallbackArgs<T> {
  /** The primary Genkit prompt call; must resolve to `{ output }`. */
  genkit: () => Promise<{ output: T | null | undefined }>;
  /** The Zod schema used to validate a fallback provider's JSON. */
  schema: z.ZodType<T>;
  /** Builds the plain-text prompt handed to a fallback provider. */
  buildPrompt: () => string;
  /** Optional system instruction for the fallback provider. */
  system?: string;
  temperature?: number;
}

export async function runGenkitWithFallback<T>(args: GenkitFallbackArgs<T>): Promise<T> {
  const { genkit, schema, buildPrompt, system, temperature } = args;

  try {
    const { output } = await genkit();
    if (output) return output;
    // Empty output from Genkit — treat as a soft failure, try the chain.
    throw new Error('Genkit returned empty output');
  } catch (primaryError) {
    const recoverable =
      isFallbackError(primaryError) ||
      /empty output/i.test(String((primaryError as Error)?.message));

    if (!recoverable) throw primaryError;

    console.warn(
      '[genkit-fallback] primary Genkit call failed, trying provider chain:',
      (primaryError as Error)?.message
    );

    // The fallback providers only start AFTER Gemini in the chain, because the
    // Gemini provider will fail the same way. runWithFallback skips to the next
    // configured provider automatically on a fallback error.
    const { text } = await runWithFallback({
      prompt: `${buildPrompt()}\n\nRespond with ONLY a valid JSON object matching the required schema. No prose, no markdown fences.`,
      system,
      temperature: temperature ?? 0.2,
      json: true,
    });

    const parsed = JSON.parse(extractJsonString(text));
    // Validate/coerce against the flow's own schema so callers get a real T.
    return schema.parse(parsed);
  }
}
