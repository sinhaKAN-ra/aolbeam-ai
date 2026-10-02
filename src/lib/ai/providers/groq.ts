import type { AiProvider, AiRequest } from './types';

/**
 * Groq — optional free/cheap last-resort fallback. OpenAI-compatible REST API,
 * so we call it with fetch (no extra SDK needed). Active only if GROQ_API_KEY
 * is set; otherwise the runner skips it.
 */
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const groqProvider: AiProvider = {
  name: 'groq',

  isConfigured: () => Boolean(process.env.GROQ_API_KEY),

  async generate(req: AiRequest): Promise<string> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set');

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: req.temperature ?? 0.2,
        ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          {
            role: 'system',
            content:
              req.system ||
              'You are an educational AI that provides concise, helpful content.',
          },
          { role: 'user', content: req.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Groq error ${res.status}: ${text}`);
      (err as any).status = res.status;
      throw err;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  },
};
