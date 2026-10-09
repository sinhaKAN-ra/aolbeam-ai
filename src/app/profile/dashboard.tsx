"use client";

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, MessageSquare, ArrowRight, RefreshCw, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import ChatMarkdown from '@/components/chat-feature/ChatMarkdown';

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const chatHref = useMemo(() => `/chat/${crypto.randomUUID()}`, [user?.id]);
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?redirect=/profile');
  }, [authLoading, user, router]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['profile-overview', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const userId = user!.id;
      const practices = () => supabase.from('user_interactions').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('interaction_type', 'problem_generation').not('problem_statement', 'is', null);
      const results = await Promise.all([
        supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
        practices(),
        practices().not('evaluation_is_correct', 'is', null),
        practices().eq('evaluation_is_correct', true),
        supabase.from('user_interactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('interaction_type', 'chat'),
        supabase.from('user_interactions').select('id, topic, problem_statement, created_at, evaluation_is_correct')
          .eq('user_id', userId).eq('interaction_type', 'problem_generation').not('problem_statement', 'is', null)
          .order('created_at', { ascending: false }).limit(5),
      ]);
      for (const result of results) if (result.error) throw new Error(result.error.message);
      return { name: results[0].data?.full_name, generated: results[1].count ?? 0,
        evaluated: results[2].count ?? 0, correct: results[3].count ?? 0,
        chats: results[4].count ?? 0, recent: results[5].data ?? [] };
    },
  });
  if (authLoading || !user) return <div className="py-12 text-center text-muted-foreground">Loading your profile…</div>;
  const name = data?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner';
  const accuracy = data?.evaluated ? `${Math.round(data.correct / data.evaluated * 100)}%` : '—';
  const metrics = [
    { label: 'Problems generated', value: data?.generated, detail: 'Saved practice problems' },
    { label: 'Answers evaluated', value: data?.evaluated, detail: 'Submitted practice answers' },
    { label: 'Accuracy', value: accuracy, detail: 'Correct answers / evaluated answers' },
    { label: 'Tutor messages', value: data?.chats, detail: 'Messages sent to your AI tutor' },
  ];
  return <div className="mx-auto max-w-6xl space-y-8 pb-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14"><AvatarImage src={user.user_metadata?.avatar_url} alt="" /><AvatarFallback>{String(name).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
        <div><p className="text-sm text-muted-foreground">Your learning space</p><h1 className="text-2xl font-semibold">{name}</h1><p className="text-sm text-muted-foreground">{user.email}</p></div>
      </div>
      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh</Button><Button variant="outline" size="sm" asChild><Link href="/profile/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></Button></div>
    </header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm">Could not load your learning activity. <Button variant="link" onClick={() => refetch()}>Try again</Button></div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(metric => <Card key={metric.label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{metric.label}</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-semibold">{error ? '—' : metric.value ?? 0}</p>}<p className="mt-2 text-xs text-muted-foreground">{metric.detail}</p></CardContent></Card>)}</div>
    <section className="grid gap-4 md:grid-cols-3" aria-label="Continue learning">
      {[{ href: '/', title: 'Practice a problem', description: 'Generate a question and get feedback on your answer.', icon: BookOpen }, { href: chatHref, title: 'Ask your tutor', description: 'Explore a concept or work through a tricky question.', icon: MessageSquare }, { href: '/learning-paths', title: 'Learning paths', description: 'Follow a course and keep building your understanding.', icon: ArrowRight }].map(item => <Link href={item.href} key={item.href} className="rounded-xl border p-5 transition-colors hover:bg-muted/50"><item.icon className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">{item.title}</h2><p className="mt-2 text-sm text-muted-foreground">{item.description}</p></Link>)}
    </section>
    <Card><CardHeader className="flex flex-row items-center justify-between gap-4"><div><CardTitle>Recent practice</CardTitle><CardDescription>Your latest saved problems</CardDescription></div><Button variant="ghost" size="sm" asChild><Link href="/profile/history">View history<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader><CardContent>
      {isLoading ? <Skeleton className="h-24 w-full" /> : error ? <p className="text-sm text-muted-foreground">Activity is unavailable. Try refreshing.</p> : data?.recent.length ? <div className="divide-y">{data.recent.map(item => <div key={item.id} className="py-4 first:pt-0"><div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{item.topic || 'Practice'} · {new Date(item.created_at).toLocaleDateString()}</span><span>{item.evaluation_is_correct === true ? 'Correct' : item.evaluation_is_correct === false ? 'Needs review' : 'Not evaluated'}</span></div><div className="max-h-36 overflow-hidden text-sm"><ChatMarkdown content={item.problem_statement} /></div></div>)}</div> : <div className="py-6 text-center"><p className="text-muted-foreground">Your practice history starts with your first problem.</p><Button className="mt-4" asChild><Link href="/">Start practicing</Link></Button></div>}
    </CardContent></Card>
  </div>;
}
