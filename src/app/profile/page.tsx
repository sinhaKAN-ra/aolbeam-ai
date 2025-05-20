// src/app/profile/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, BarChart3, History, Lightbulb, UserCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Your Profile - AOLBEAM',
  description: 'Review your learning progress and manage your account on AOLBEAM.',
};

export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // It's better to redirect to a dedicated login page if you have one,
    // or the home page if it handles login prompts.
    redirect('/'); 
  }

  // Placeholder data - in the future, this would come from Supabase
  const topicsPracticed = [
    { name: 'Quantum Physics', accuracy: 0.75, lastPracticed: '2 days ago' },
    { name: 'Organic Chemistry', accuracy: 0.90, lastPracticed: '5 days ago' },
    { name: 'Calculus II', accuracy: 0.60, lastPracticed: '1 day ago' },
  ];
  const overallAccuracy = topicsPracticed.reduce((acc, t) => acc + t.accuracy, 0) / topicsPracticed.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 bg-card/50 border-b mb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">AOLBEAM</h1>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Practice
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4">
              <UserCircle className="h-16 w-16 text-primary" />
              <div>
                <CardTitle className="text-2xl">Welcome, {user.email?.split('@')[0] || 'Learner'}!</CardTitle>
                <CardDescription>This is your personal learning dashboard. Track your progress and keep improving.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Email: {user.email}</p>
              <p className="text-muted-foreground">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
              {/* Add link to manage subscription if implemented */}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="text-primary" /> Overall Progress (Sample)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topicsPracticed.length > 0 ? (
                  <>
                    <p className="text-4xl font-bold text-center mb-2">
                      {Math.round(overallAccuracy * 100)}%
                    </p>
                    <p className="text-muted-foreground text-center">Average Accuracy</p>
                    <p className="text-sm text-muted-foreground mt-4">
                      This is a sample. Actual stats will appear here once history is stored.
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Start practicing to see your progress!</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="text-primary" /> Improvement Areas (Sample)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topicsPracticed.length > 0 ? (
                  <ul className="space-y-2">
                    {topicsPracticed.filter(t => t.accuracy < 0.8).map(topic => (
                      <li key={topic.name} className="text-sm text-muted-foreground">
                        Focus more on: <span className="font-semibold text-foreground">{topic.name}</span> (Accuracy: {Math.round(topic.accuracy*100)}%)
                      </li>
                    ))}
                     {topicsPracticed.filter(t => t.accuracy < 0.8).length === 0 && <p className="text-sm text-green-600">Looking good! Keep up the great work.</p>}
                  </ul>
                ) : (
                   <p className="text-muted-foreground">Practice on different topics to identify areas for improvement.</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="text-primary" /> Practice History
              </CardTitle>
              <CardDescription>
                Review the topics you've practiced. (This will be populated from your saved history soon.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topicsPracticed.length > 0 ? (
                <ul className="space-y-3">
                  {topicsPracticed.map((topic, index) => (
                    <li key={index} className="p-3 bg-muted/50 rounded-md">
                      <p className="font-semibold">{topic.name}</p>
                      <p className="text-xs text-muted-foreground">Last practiced: {topic.lastPracticed} - Accuracy: {Math.round(topic.accuracy*100)}%</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Your practice history will appear here once you start solving problems.</p>
              )}
               <Button variant="link" className="mt-4 px-0">View Full History (Coming Soon)</Button>
            </CardContent>
          </Card>

        </div>
      </main>

      <footer className="mt-12 py-8 border-t bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} AOLBEAM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
