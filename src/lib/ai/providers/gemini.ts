import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiProvider, AiRequest, ChatRequest } from './types';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const geminiProvider: AiProvider = {
  name: 'gemini',

  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),

  async generate(req: AiRequest): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = req.system ? `${req.system}\n\n${req.prompt}` : req.prompt;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.2,
        ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
      },
    });

    const response = await result.response;
    return response.text();
  },

  async *stream(req: ChatRequest): AsyncIterable<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      ...(req.system ? { systemInstruction: req.system } : {}),
    });

    // Gemini uses 'model' for assistant and only user/model roles in contents.
    const contents = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const result = await model.generateContentStream({
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.4,
        ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  },
};
