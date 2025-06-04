// src/app/profile/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Loader2, Save, UserCircle, LogOut, Shield, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import type { UserProfile } from '@/types';
import { getUserSubscription, hasPremiumAccess, Subscription } from '@/services/subscriptionService';

interface ProfileFormData {
  full_name: string;
  email: string;
  email_notifications: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    email_notifications: false,
  });
  const [activeTab, setActiveTab] = useState('account');
  
  const supabase = createSupabaseBrowserClient();
  
  useEffect(() => {
    console.log('useEffect - authLoading:', authLoading, 'user:', user);
    if (!authLoading && !user) {
      console.log('Redirecting to login: user is null and not loading.');
      router.push('/login');
      return;
    }
    
    if (!authLoading && user) {
      console.log('Fetching user profile: user is present and not loading.');
      fetchUserProfile();
    }
  }, [authLoading, user]);
  
  const fetchUserProfile = async () => {
    console.log('fetchUserProfile called. user?.id:', user?.id);
    if (!user?.id) {
      console.log('fetchUserProfile aborted: user.id is null or undefined.');
      return;
    }
    
    setIsLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;

      // Fetch live subscription status and premium access
      const subscription = await getUserSubscription();
      const premiumAccess = await hasPremiumAccess();

      const updatedProfile = {
        ...profileData,
        is_subscribed: premiumAccess,
        subscription_plan: subscription?.plan_id || (premiumAccess ? 'one-time' : null),
      };
      
      setProfile(updatedProfile);
      setFormData({
        full_name: updatedProfile?.full_name || '',
        email: updatedProfile?.email || user.email || '',
        email_notifications: updatedProfile?.email_notifications || false,
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error.message || error);
      toast({
        title: 'Error',
        description: 'Failed to load your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleSwitchChange = (checked: boolean, name: string) => {
    setFormData({
      ...formData,
      [name]: checked,
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          email_notifications: formData.email_notifications,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl py-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and personal information.
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="space-y-4">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle className="text-xl">Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal details and public profile information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        <UserCircle className="h-16 w-16 text-primary" />
                      </div>
                      {/* Future avatar upload functionality could be added here */}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      value={formData.email}
                      disabled
                      placeholder="Your email address"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email address cannot be changed. This is managed by your authentication provider.
                    </p>
                  </div>
                  
                  {profile && (
                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${profile.is_subscribed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-sm">
                          {profile.is_subscribed ? 'Premium Account' : 'Free Account'}
                        </span>
                        {!profile.is_subscribed && (
                          <Button 
                            type="button" 
                            variant="link" 
                            onClick={() => router.push('/pricing')} 
                            className="px-2 h-auto text-primary text-sm"
                          >
                            Upgrade
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {profile?.subscription_started_at && (
                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <p className="text-sm">
                        {new Date(profile.subscription_started_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-6">
                  <Button type="button" variant="outline" onClick={() => router.push('/profile')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how and when you receive notifications from AOLBEAM.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive email updates about your account and learning progress.</p>
                    </div>
                    <Switch
                      checked={formData.email_notifications}
                      onCheckedChange={(checked) => handleSwitchChange(checked, 'email_notifications')}
                      aria-label="Toggle email notifications"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive email notifications.</p>
                    </div>
                    <Switch
                      checked={formData.email_notifications}
                      onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                      aria-label="Toggle email notifications"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-6">
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Account Security</CardTitle>
                <CardDescription>
                  Manage your account security settings and session controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Authentication</h4>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">Your account is secured via email authentication.</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Account Actions</h4>
                    <div className="space-y-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You will need to sign in again to access your account and learning materials.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLogout}>Sign Out</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Delete Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                              If you have an active subscription, you will need to cancel it separately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-500 hover:bg-red-600">
                              Delete Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
