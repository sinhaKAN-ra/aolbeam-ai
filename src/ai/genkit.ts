import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Model is env-configurable: the previously hardcoded gemini-2.0-flash was
// retired by Google (404 "no longer available"). Set GEMINI_MODEL in .env to
// whatever your key supports (e.g. gemini-3.8-flash). Default kept current.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

export const ai = genkit({
  plugins: [googleAI()],
  model: `googleai/${GEMINI_MODEL}`,
});
