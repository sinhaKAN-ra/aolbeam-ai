import OpenAI from 'openai';
import type { AiProvider, AiRequest, ChatRequest } from './types';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const openaiProvider: AiProvider = {
  name: 'openai',

  isConfigured: () => Boolean(process.env.OPENAI_API_KEY),

  async generate(req: AiRequest): Promise<string> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');

    const openai = new OpenAI({ apiKey: key });

    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: req.temperature ?? 0.2,
      ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
      ...(req.json ? { response_format: { type: 'json_object' as const } } : {}),
      messages: [
        {
          role: 'system',
          content:
            req.system ||
            'You are an educational AI that provides concise, helpful content.',
        },
        { role: 'user', content: req.prompt },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  },

  async *stream(req: ChatRequest): AsyncIterable<string> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');

    const openai = new OpenAI({ apiKey: key });
    const messages = [
      ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const streamResp = await openai.chat.completions.create({
      model: MODEL,
      temperature: req.temperature ?? 0.4,
      ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
      stream: true,
      messages,
    });

    for await (const part of streamResp) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },
};
