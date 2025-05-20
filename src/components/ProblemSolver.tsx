import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send } from 'lucide-react';
import type { ProblemType } from '@/types';

export function ProblemSolver() {
  const [activeTab, setActiveTab] = useState<ProblemType>('theory');
  const [isLoading, setIsLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    setIsLoading(true);
    setQuestion('');
    setAnswer('');
    setEvaluation('');
    
    // Simulate API call
    setTimeout(() => {
      setQuestion(`Explain the concept of ${topic} in detail.`);
      setIsLoading(false);
    }, 1000);
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setEvaluation('Your answer is being evaluated. This is a sample evaluation. In a real scenario, this would analyze your response for accuracy and completeness.');
      setIsLoading(false);
    }, 1500);
  };

  return (
    <section id="start-practicing" className="w-full py-12 md:py-24 bg-muted/50">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Start Practicing</h2>
            <p className="text-muted-foreground">
              Enter a topic you want to practice and choose the type of problem.
            </p>
          </div>
          
          <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => setActiveTab(value as ProblemType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="theory">Theory</TabsTrigger>
                <TabsTrigger value="numerical">Numerical</TabsTrigger>
                <TabsTrigger value="mcq">MCQ</TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="theory">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic</Label>
                      <Input
                        id="topic"
                        placeholder="e.g., Quantum Mechanics, Thermodynamics"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" disabled={isLoading || !topic.trim()}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Question'
                      )}
                    </Button>
                  </form>
                  
                  {question && (
                    <div className="mt-8 space-y-4">
                      <div className="rounded-lg border p-4">
                        <h3 className="font-medium">Question:</h3>
                        <p className="mt-2">{question}</p>
                      </div>
                      
                      <form onSubmit={handleEvaluate} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="answer">Your Answer</Label>
                          <textarea
                            id="answer"
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Type your answer here..."
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                        <Button type="submit" disabled={isLoading || !answer.trim()}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Evaluating...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Submit Answer
                            </>
                          )}
                        </Button>
                      </form>
                      
                      {evaluation && (
                        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                          <h3 className="font-medium text-green-800">Evaluation:</h3>
                          <p className="mt-2 text-green-700">{evaluation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="numerical">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-muted-foreground">Numerical problems coming soon!</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="mcq">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-muted-foreground">Multiple Choice Questions coming soon!</p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
