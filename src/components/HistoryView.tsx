
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History as HistoryIcon, MessageSquareText, ListChecks, CheckCircle, XCircle, Brain as ConceptualIcon, Sigma as NumericalIcon, GitFork as DiagramIcon, Shuffle } from 'lucide-react';
import type { InteractionHistoryItem, ProblemType } from '@/types';
import { Badge } from '@/components/ui/badge';
import MathRenderer from './MathRenderer';

interface HistoryViewProps {
  history: InteractionHistoryItem[];
  onRevisitProblem?: (item: InteractionHistoryItem) => void; // Optional for now
}

const problemTypeIcons: Record<ProblemType, React.ElementType> = {
  theory: MessageSquareText,
  practical: ListChecks,
  conceptual: ConceptualIcon,
  numerical: NumericalIcon,
  diagram_based: DiagramIcon,
  random: Shuffle,
};

export function HistoryView({ history, onRevisitProblem }: HistoryViewProps) {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <HistoryIcon className="text-primary" /> History
        </CardTitle>
        <CardDescription>Review your past practice sessions.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No history yet. Start practicing!</p>
        ) : (
          <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-16rem)] md:h-full max-h-[600px] pr-3"> {/* Adjusted height */}
            <Accordion type="single" collapsible className="w-full space-y-2">
              {history.map((item) => {
                const ProblemIcon = problemTypeIcons[item.problemType] || MessageSquareText;
                return (
                  <AccordionItem value={item.id} key={item.id} className="bg-card border rounded-md shadow-sm">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex justify-between items-center w-full gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-grow"> {/* Topic info wrapper */}
                          <ProblemIcon className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="font-medium truncate">{item.topic}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0"> {/* Evaluation and Date wrapper */}
                          {item.evaluation && (
                            <Badge variant={item.evaluation.isCorrect ? "default" : "destructive"} className={`${item.evaluation.isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                              {item.evaluation.isCorrect ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                              <span className="ml-1">{item.evaluation.isCorrect ? 'Correct' : 'Incorrect'}</span>
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3 pt-1 text-sm">
                      <div className="space-y-3 prose prose-sm dark:prose-invert max-w-none">
                        <div>
                          <strong className="block text-muted-foreground mb-1">Problem ({item.difficulty || 'N/A'} - {item.problemType}):</strong>
                          <MathRenderer content={item.problem.problemStatement} />
                        </div>
                        {item.userAnswer && !item.selectedOption && ( // For theory and free-text conceptual/numerical/diagram
                          <div>
                            <strong className="block text-muted-foreground mb-1">Your Answer:</strong>
                            <MathRenderer content={item.userAnswer} />
                          </div>
                        )}
                        {item.selectedOption && ( // For MCQ style problems
                          <>
                            <div>
                              <strong className="block text-muted-foreground mb-1">Your Choice:</strong>
                              <MathRenderer content={item.selectedOption} />
                            </div>
                            <div>
                              <strong className="block text-muted-foreground mt-2 mb-1">Correct Answer:</strong>
                              <MathRenderer content={item.problem.correctAnswer} />
                            </div>
                          </>
                        )}
                         {item.evaluation?.feedback && (
                          <div>
                            <strong className="block text-muted-foreground mb-1">Feedback:</strong>
                            <MathRenderer content={item.evaluation.feedback} />
                          </div>
                        )}
                         {item.isTopicRevised && item.topicDetails && (
                          <div>
                            <strong className="block text-muted-foreground mb-1">Revised Details:</strong>
                             <div className="max-h-32 overflow-y-auto"><MathRenderer content={item.topicDetails} /></div>
                          </div>
                        )}
                        {!item.evaluation && (
                          <p className="text-muted-foreground italic">This problem was generated but not answered.</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
