
// src/app/profile/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, BarChart3, History, Lightbulb, UserCircle, Settings, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Your Profile - AOLBEAM',
  description: 'Review your learning progress, track statistics, and manage your account on AOLBEAM.',
};

export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to home page which handles login prompts if user is not authenticated
    redirect('/'); 
  }

  // Placeholder data - in a real app, this would come from Supabase based on user activity
  const topicsPracticed = [
    { name: 'Quantum Physics', accuracy: 0.75, lastPracticed: '2 days ago', questionsAttempted: 20 },
    { name: 'Organic Chemistry', accuracy: 0.90, lastPracticed: '5 days ago', questionsAttempted: 15 },
    { name: 'Calculus II', accuracy: 0.60, lastPracticed: '1 day ago', questionsAttempted: 25 },
    { name: 'Data Structures', accuracy: 0.85, lastPracticed: '3 days ago', questionsAttempted: 30 },
  ];
  const overallAccuracy = topicsPracticed.length > 0 ? topicsPracticed.reduce((acc, t) => acc + t.accuracy, 0) / topicsPracticed.length : 0;
  const totalQuestionsAttempted = topicsPracticed.reduce((acc, t) => acc + t.questionsAttempted, 0);
  const averageQuestionsPerTopic = topicsPracticed.length > 0 ? Math.round(totalQuestionsAttempted / topicsPracticed.length) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 bg-card/50 border-b mb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="text-3xl font-bold text-primary">AOLBEAM</Link>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Practice
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* User Info Card */}
          <Card className="mb-8 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-card to-card p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary shadow-md">
                {/* Placeholder for user avatar image - you can integrate this later */}
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User Avatar'} />
                <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                  {user.email ? user.email.charAt(0).toUpperCase() : <UserCircle size={48} />}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-2xl sm:text-3xl font-bold text-primary">
                  Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'AOLBEAM Learner'}!
                </CardTitle>
                <CardDescription className="text-md text-muted-foreground mt-1">
                  This is your personal learning dashboard. Track your progress and conquer your exams.
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-2">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              <Button variant="outline" size="sm" className="mt-4 sm:mt-0 sm:ml-auto">
                <Settings className="mr-2 h-4 w-4" /> Account Settings (Soon)
              </Button>
            </CardHeader>
          </Card>

          {/* Stats Overview Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <BarChart3 className="text-primary" /> Overall Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {topicsPracticed.length > 0 ? (
                  <>
                    <p className="text-5xl font-bold text-primary mb-1">
                      {Math.round(overallAccuracy * 100)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Based on {topicsPracticed.length} topics
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground py-4">Start practicing to see your stats!</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <History className="text-accent" /> Questions Attempted
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                 <p className="text-5xl font-bold text-accent mb-1">
                  {totalQuestionsAttempted}
                </p>
                <p className="text-sm text-muted-foreground">
                  Avg. {averageQuestionsPerTopic} per topic
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <Star className="text-yellow-500" /> Strengths (Sample)
                </CardTitle>
              </CardHeader>
              <CardContent>
                 {topicsPracticed.filter(t => t.accuracy >= 0.85).length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {topicsPracticed.filter(t => t.accuracy >= 0.85).slice(0,2).map(topic => (
                      <li key={topic.name} className="text-muted-foreground flex items-center">
                         <Star size={14} className="text-yellow-500 mr-2"/> {topic.name} ({Math.round(topic.accuracy*100)}%)
                      </li>
                    ))}
                  </ul>
                ) : (
                   <p className="text-muted-foreground text-sm">Keep practicing to identify strengths!</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Improvement Areas Card */}
           <Card className="mb-8 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="text-orange-500" /> Focus Areas (Sample)
                </CardTitle>
                <CardDescription>Topics where you might want to spend a bit more time.</CardDescription>
              </CardHeader>
              <CardContent>
                {topicsPracticed.length > 0 && topicsPracticed.filter(t => t.accuracy < 0.7).length > 0 ? (
                  <ul className="space-y-2">
                    {topicsPracticed.filter(t => t.accuracy < 0.7).map(topic => (
                      <li key={topic.name} className="p-3 bg-muted/30 rounded-md">
                        <span className="font-semibold text-foreground">{topic.name}</span>
                        <p className="text-xs text-muted-foreground">Current Accuracy: {Math.round(topic.accuracy*100)}% - Last practiced: {topic.lastPracticed}</p>
                        <Button variant="link" size="sm" className="px-0 h-auto py-1 text-xs mt-1" asChild>
                            <Link href={`/?topic=${encodeURIComponent(topic.name)}&type=theory`}>Practice {topic.name} &rarr;</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                   <p className="text-muted-foreground">No specific focus areas identified from sample data, or you're doing great! Practice more topics to get detailed insights.</p>
                )}
              </CardContent>
            </Card>

          {/* Practice History Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="text-primary" /> Recent Practice History (Sample)
              </CardTitle>
              <CardDescription>
                A glimpse of topics you've recently practiced. Full history will be available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topicsPracticed.length > 0 ? (
                <ul className="space-y-3">
                  {topicsPracticed.slice(0, 5).map((topic, index) => ( // Show top 5 recent
                    <li key={index} className="p-4 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-lg text-primary">{topic.name}</p>
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${topic.accuracy >= 0.7 ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                          {Math.round(topic.accuracy*100)}% Acc.
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Attempted: {topic.questionsAttempted} questions - Last practiced: {topic.lastPracticed}
                      </p>
                       <Button variant="outline" size="sm" className="mt-2 text-xs" asChild>
                            <Link href={`/?topic=${encodeURIComponent(topic.name)}&type=theory`}>Revisit Topic</Link>
                        </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-6">Your practice history will appear here once you start solving problems.</p>
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

    