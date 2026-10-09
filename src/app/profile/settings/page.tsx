"use client";

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login?redirect=/profile/settings'); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle().then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setError('Could not load your profile. Please try again.');
      else setName(data?.full_name || user.user_metadata?.full_name || '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, authLoading, router, supabase, reload]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || !name.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_profiles').upsert({ id: user.id, email: user.email || '', full_name: name.trim() }, { onConflict: 'id' });
      if (error) throw error;
      setName(name.trim());
      await queryClient.invalidateQueries({ queryKey: ['profile-overview', user.id] });
      toast({ title: 'Profile updated', description: 'Your display name has been saved.' });
    } catch { toast({ title: 'Could not save profile', description: 'Please try again.', variant: 'destructive' }); }
    finally { setSaving(false); }
  }
  async function logout() {
    setSigningOut(true);
    try { await signOut(); router.replace('/'); }
    catch { setSigningOut(false); }
  }
  if (authLoading || !user || loading) return <div className="flex justify-center py-12"><Loader2 aria-label="Loading profile" className="h-6 w-6 animate-spin" /></div>;
  return <div className="mx-auto max-w-2xl space-y-6 pb-8">
    <div><Button variant="link" asChild className="px-0"><Link href="/profile">Back to profile</Link></Button><h1 className="text-2xl font-semibold">Account settings</h1><p className="mt-2 text-muted-foreground">Your profile and sign-in details.</p></div>
    <Card><CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your name appears on your learning dashboard.</CardDescription></CardHeader><CardContent>
      {error ? <div role="alert"><p>{error}</p><Button variant="outline" className="mt-4" onClick={() => setReload(value => value + 1)}>Try again</Button></div> : <form onSubmit={save} className="space-y-5"><div className="space-y-2"><Label htmlFor="display-name">Display name</Label><Input id="display-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} autoComplete="name" /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={user.email || ''} readOnly /><p className="text-xs text-muted-foreground">Managed by your sign-in provider.</p></div><Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button></form>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Session</CardTitle><CardDescription>Signed in with {user.app_metadata?.provider === 'google' ? 'Google' : 'your account provider'}.</CardDescription></CardHeader><CardContent><Button variant="outline" disabled={signingOut} onClick={logout}><LogOut className="mr-2 h-4 w-4" />{signingOut ? 'Signing out…' : 'Sign out'}</Button></CardContent></Card>
  </div>;
}
