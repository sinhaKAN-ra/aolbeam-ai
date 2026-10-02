import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiProvider, AiRequest } from './types';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

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
};
