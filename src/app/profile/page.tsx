
// src/app/profile/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import MathRenderer from '@/components/MathRenderer';
import type { ProblemType } from '@/types';
import Footer from '@/components/Footer';

import { ArrowLeft, BarChart3, History, Lightbulb, UserCircle, Settings, Star, MessageSquareText, ListChecks, CheckCircle, XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Your Profile - AOLBEAM',
  description: 'Review your learning progress, track statistics, and manage your account on AOLBEAM.',
};

interface FetchedInteraction {
  id: string;
  created_at: string;
  topic: string;
  problem_type: ProblemType;
  problem_statement: string;
  answer_format: string;
  multiple_choice_options?: string[] | null;
  correct_answer: string;
  user_answer?: string | null;
  selected_option?: string | null;
  evaluation_is_correct?: boolean | null;
  evaluation_feedback?: string | null;
  is_topic_revised?: boolean | null;
  topic_details_content?: string | null;
}

interface DisplayHistoryItem {
  id: string;
  timestamp: string;
  topic: string;
  problemType: ProblemType;
  problem: {
    problemStatement: string;
    answerFormat: string;
    multipleChoiceOptions?: string[];
    correctAnswer: string;
  };
  userAnswer?: string;
  selectedOption?: string;
  evaluation?: {
    isCorrect: boolean;
    feedback: string;
  };
  isTopicRevised?: boolean;
  topicDetails?: string | null;
}


export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/'); 
  }

  let userHistory: DisplayHistoryItem[] = [];
  try {
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching user history:", error);
    }

    if (interactions) {
      userHistory = interactions.map((item: FetchedInteraction): DisplayHistoryItem => ({
        id: item.id,
        timestamp: item.created_at,
        topic: item.topic,
        problemType: item.problem_type,
        problem: {
          problemStatement: item.problem_statement,
          answerFormat: item.answer_format,
          multipleChoiceOptions: item.multiple_choice_options || undefined,
          correctAnswer: item.correct_answer,
        },
        userAnswer: item.user_answer || undefined,
        selectedOption: item.selected_option || undefined,
        evaluation: (item.evaluation_is_correct !== null && item.evaluation_is_correct !== undefined && item.evaluation_feedback)
          ? { isCorrect: item.evaluation_is_correct, feedback: item.evaluation_feedback }
          : undefined,
        isTopicRevised: item.is_topic_revised || false,
        topicDetails: item.topic_details_content || null,
      }));
    }
  } catch (e) {
    console.error("Exception fetching user history:", e);
  }

  const overallAccuracy = userHistory.length > 0 && userHistory.filter(item => item.evaluation).length > 0
    ? userHistory.filter(item => item.evaluation).reduce((acc, item) => acc + (item.evaluation?.isCorrect ? 1 : 0), 0) / userHistory.filter(item => item.evaluation).length
    : 0;
  const totalQuestionsAttempted = userHistory.length;
  
  const uniqueTopicsPracticedCount = new Set(userHistory.map(item => item.topic)).size;

  const averageQuestionsPerTopic = uniqueTopicsPracticedCount > 0 ? Math.round(totalQuestionsAttempted / uniqueTopicsPracticedCount) : 0;
  

  const strengths = userHistory
    .filter(item => item.evaluation?.isCorrect)
    .reduce((acc, item) => {
      if (!acc.find(t => t.name === item.topic)) {
        const topicItems = userHistory.filter(h => h.topic === item.topic && h.evaluation);
        const correctCount = topicItems.filter(t => t.evaluation?.isCorrect).length;
        const accuracy = topicItems.length > 0 ? correctCount / topicItems.length : 0;
        if (accuracy >= 0.85) { 
          acc.push({ name: item.topic, accuracy });
        }
      }
      return acc;
    }, [] as { name: string; accuracy: number }[])
    .slice(0, 2); 


  const focusAreas = userHistory
    .filter(item => item.evaluation && !item.evaluation.isCorrect)
    .reduce((acc, item) => {
      if (!acc.find(t => t.name === item.topic)) {
        const topicItems = userHistory.filter(h => h.topic === item.topic && h.evaluation);
        const correctCount = topicItems.filter(t => t.evaluation?.isCorrect).length;
        const accuracy = topicItems.length > 0 ? correctCount / topicItems.length : 0;
         const lastPracticed = new Date(topicItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp).toLocaleDateString();
        if (accuracy < 0.70) { 
          acc.push({ name: item.topic, accuracy, lastPracticed });
        }
      }
      return acc;
    }, [] as { name: string; accuracy: number, lastPracticed: string }[]);


  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-card to-card p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary shadow-md">
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

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <BarChart3 className="text-primary" /> Overall Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {totalQuestionsAttempted > 0 && userHistory.filter(item => item.evaluation).length > 0 ? (
                  <>
                    <p className="text-5xl font-bold text-primary mb-1">
                      {Math.round(overallAccuracy * 100)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Based on {uniqueTopicsPracticedCount} topic(s)
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
                  <Star className="text-yellow-500" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                 {strengths.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {strengths.map(topic => (
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
          
           <Card className="mb-8 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="text-orange-500" /> Focus Areas
                </CardTitle>
                <CardDescription>Topics where you might want to spend a bit more time.</CardDescription>
              </CardHeader>
              <CardContent>
                {focusAreas.length > 0 ? (
                  <ul className="space-y-2">
                    {focusAreas.map(topic => (
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
                   <p className="text-muted-foreground">No specific focus areas identified, or you're doing great! Practice more topics to get detailed insights.</p>
                )}
              </CardContent>
            </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="text-primary" /> Recent Practice History
              </CardTitle>
              <CardDescription>
                Review your past practice sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Your practice history will appear here once you start solving problems.</p>
              ) : (
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {userHistory.map((item) => (
                    <AccordionItem value={item.id} key={item.id} className="bg-card border rounded-md shadow-sm">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2 text-left">
                            {item.problemType === 'theory' ? <MessageSquareText className="w-5 h-5 text-primary flex-shrink-0" /> : <ListChecks className="w-5 h-5 text-primary flex-shrink-0" />}
                            <span className="font-medium truncate max-w-[150px] sm:max-w-[250px] md:max-w-xs">{item.topic}</span>
                          </div>
                          {item.evaluation && (
                             <Badge variant={item.evaluation.isCorrect ? "default" : "destructive"} className={`${item.evaluation.isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white /* Ensure text is white for contrast */ ml-2`}>
                              {item.evaluation.isCorrect ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                              <span className="ml-1">{item.evaluation.isCorrect ? 'Correct' : 'Incorrect'}</span>
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground hidden sm:inline ml-auto pl-2 flex-shrink-0">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3 pt-1 text-sm">
                        <div className="space-y-3 prose prose-sm dark:prose-invert max-w-none">
                          <div>
                            <strong className="block text-muted-foreground mb-1">Problem:</strong>
                            <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.problem.problemStatement} /></div>
                          </div>
                          {item.problemType === 'theory' && item.userAnswer && (
                            <div>
                              <strong className="block text-muted-foreground mb-1">Your Answer:</strong>
                              <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.userAnswer} /></div>
                            </div>
                          )}
                          {item.problemType === 'practical' && item.selectedOption && (
                            <>
                              <div>
                                <strong className="block text-muted-foreground mb-1">Your Choice:</strong>
                                 <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.selectedOption} /></div>
                              </div>
                              <div>
                                <strong className="block text-muted-foreground mt-2 mb-1">Correct Answer:</strong>
                                 <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.problem.correctAnswer} /></div>
                              </div>
                            </>
                          )}
                           {item.problemType === 'theory' && item.evaluation && (
                             <div>
                              <strong className="block text-muted-foreground mt-2 mb-1">Model Answer / Key Points:</strong>
                               <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.problem.correctAnswer} /></div>
                            </div>
                           )}
                          {item.evaluation?.feedback && (
                            <div>
                              <strong className="block text-muted-foreground mb-1">Feedback:</strong>
                              <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.evaluation.feedback} /></div>
                            </div>
                          )}
                          {item.isTopicRevised && item.topicDetails && (
                            <div>
                              <strong className="block text-muted-foreground mb-1">Revised Details:</strong>
                              <div className="p-2 rounded bg-muted/30 max-h-32 overflow-y-auto"><MathRenderer content={item.topicDetails} /></div>
                            </div>
                          )}
                           {!item.evaluation && (
                             <p className="text-muted-foreground italic">This problem was generated but not answered.</p>
                           )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      <Footer />
    </div>
  );
}
