import type { AiProvider, AiRequest, ChatRequest } from './types';

/**
 * Groq — optional free/cheap last-resort fallback. OpenAI-compatible REST API,
 * so we call it with fetch (no extra SDK needed). Active only if GROQ_API_KEY
 * is set; otherwise the runner skips it.
 */
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const groqProvider: AiProvider = {
  name: 'groq',

  isConfigured: () => Boolean(process.env.GROQ_API_KEY),

  async generate(req: AiRequest): Promise<string> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set');

    const call = async (useJsonMode: boolean) => {
      const sys =
        req.system ||
        'You are an educational AI that provides concise, helpful content.';
      return fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: req.temperature ?? 0.2,
          ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
          ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            {
              role: 'system',
              // When we drop strict JSON mode on retry, instruct the model to
              // still return raw JSON so our extractor can parse it.
              content: useJsonMode
                ? sys
                : `${sys}\n\nReturn ONLY a single valid JSON object. No prose, no markdown fences.`,
            },
            { role: 'user', content: req.prompt },
          ],
        }),
      });
    };

    let res = await call(Boolean(req.json));

    // Groq's strict json_object mode sometimes rejects the model's OWN output
    // with 400 json_validate_failed (empty failed_generation). That's not a bad
    // request on our side — retry once WITHOUT the strict mode and let our own
    // extractJsonString handle the parsing.
    if (!res.ok && req.json && res.status === 400) {
      const peek = await res.clone().text().catch(() => '');
      if (peek.includes('json_validate_failed') || peek.includes('Failed to validate JSON')) {
        res = await call(false);
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Groq error ${res.status}: ${text}`);
      (err as any).status = res.status;
      throw err;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  },

  async *stream(req: ChatRequest): AsyncIterable<string> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set');

    const messages = [
      ...(req.system ? [{ role: 'system', content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: req.temperature ?? 0.4,
        ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
        stream: true,
        messages,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Groq stream error ${res.status}: ${text}`);
      (err as any).status = res.status;
      throw err;
    }

    // Parse the OpenAI-style SSE stream.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // ignore keep-alive / partial lines
        }
      }
    }
  },
};
