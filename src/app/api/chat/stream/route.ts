import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { streamWithFallback } from '@/lib/ai/runWithFallback';
import type { ChatTurn } from '@/lib/ai/providers/types';
import { chatLimitFor } from '@/config/limits';

export const dynamic = 'force-dynamic';

const TUTOR_SYSTEM = `You are "A", a friendly, patient AI tutor for exam preparation.
- Hold a real conversation: use the prior turns for context and answer follow-ups directly.
- Explain clearly and concisely; use analogies when helpful.
- Use LaTeX for math ($...$ inline, $$...$$ block), Markdown fenced code blocks for code, and Mermaid code blocks for diagrams (no semicolons in Mermaid).
- If the student asks to continue or references "the above", rely on the conversation so far.`;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  // --- Auth ---
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Parse ---
  let body: { messages?: ChatTurn[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter(
    (m) => m && typeof m.content === 'string' && m.content.trim()
  );
  if (messages.length === 0) {
    return Response.json({ error: 'messages is required' }, { status: 400 });
  }

  // --- Limit check (single server authority) ---
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const planId = subscription?.plan_id || 'free';
  const limit = chatLimitFor(planId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from('user_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('interaction_type', 'chat')
    .gte('created_at', todayStart.toISOString());

  if ((count ?? 0) >= limit) {
    return Response.json(
      { error: 'Chat limit reached', code: 'CHAT_LIMIT_REACHED', limit, remaining: 0 },
      { status: 403 }
    );
  }

  // Record this interaction (best-effort; don't block the stream on it).
  supabaseAdmin
    .from('user_interactions')
    .insert({
      user_id: user.id,
      interaction_type: 'chat',
      created_at: new Date().toISOString(),
      topic: messages[messages.length - 1].content.substring(0, 100),
    })
    .then(({ error }) => {
      if (error) console.error('Failed to record chat usage:', error.message);
    });

  // --- Stream ---
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        for await (const { chunk, provider } of streamWithFallback({
          messages,
          system: TUTOR_SYSTEM,
          temperature: 0.5,
        })) {
          send('token', { t: chunk, provider });
        }
        send('done', { ok: true });
      } catch (error) {
        console.error('Chat stream failed:', error);
        send('error', {
          message:
            "I'm having trouble reaching the AI service right now. Please try again in a moment.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
