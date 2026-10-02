import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runWithFallback } from '@/lib/ai/runWithFallback';
import { extractJsonString } from '@/lib/ai/providers/types';
import { searchWithFallback } from '@/lib/search/searchWithFallback';

export const dynamic = 'force-dynamic';

/**
 * On-demand "learning extras" for a chat answer. This is the Phase-B
 * replacement for the old blocking dossier: the chat answer streams fast
 * (via /api/chat/stream), and the user clicks "Expand" to lazily fetch
 * suggestions + learning path + resources + practice problems HERE.
 *
 * Everything is best-effort and parallel; a failing part returns [] rather
 * than failing the whole response. Runs through the AI + search fallback
 * chains, so a dead Gemini key doesn't break it.
 */
export async function POST(request: Request) {
  // Auth optional — guests can expand too (chat itself is guest-allowed).
  const supabase = createSupabaseServerClient();
  await supabase.auth.getUser().catch(() => null);

  const { topic } = await request.json().catch(() => ({ topic: '' }));
  if (!topic || typeof topic !== 'string') {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }

  const [suggestions, learningPath, resources, practiceProblems] = await Promise.all([
    getSuggestions(topic),
    getLearningPath(topic),
    getResources(topic),
    getPracticeProblems(topic),
  ]);

  return NextResponse.json({ suggestions, learningPath, resources, practiceProblems });
}

async function getSuggestions(topic: string) {
  try {
    const { text } = await runWithFallback({
      prompt: `Generate exactly 4 related learning topics about "${topic}". Return ONLY a JSON array: [{"title","description","difficulty":"beginner|intermediate|advanced"}].`,
      json: true,
    });
    const parsed = JSON.parse(extractJsonString(text));
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

async function getLearningPath(topic: string) {
  try {
    const { text } = await runWithFallback({
      prompt: `Create a learning path for "${topic}". Return ONLY JSON: {"title","steps":[{"id":1,"title","description","difficulty","estimatedTime"}]}. 3-5 steps.`,
      json: true,
    });
    return JSON.parse(extractJsonString(text));
  } catch {
    return null;
  }
}

async function getResources(topic: string) {
  try {
    const { results } = await searchWithFallback(topic, 5);
    return results.map((r, i) => ({
      id: `res-${i}`,
      title: r.title,
      url: r.url,
      type: 'web_page' as const,
    }));
  } catch {
    return [];
  }
}

async function getPracticeProblems(topic: string) {
  try {
    const { text } = await runWithFallback({
      prompt: `Generate 5 concise practice problems about "${topic}". Return ONLY a JSON array of strings.`,
      temperature: 0.7,
      maxOutputTokens: 500,
    });
    let problems = JSON.parse(extractJsonString(text));
    if (!Array.isArray(problems)) problems = [];
    return problems
      .map((p: any) => (typeof p === 'string' ? p : JSON.stringify(p)))
      .map((question: string) => ({ question }));
  } catch {
    return [];
  }
}
