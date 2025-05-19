
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History as HistoryIcon, MessageSquareText, ListChecks, CheckCircle, XCircle } from 'lucide-react';
import type { InteractionHistoryItem } from '@/types';
import { Badge } from '@/components/ui/badge';

interface HistoryViewProps {
  history: InteractionHistoryItem[];
  onRevisitProblem?: (item: InteractionHistoryItem) => void; // Optional for now
}

export function HistoryView({ history, onRevisitProblem }: HistoryViewProps) {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <HistoryIcon className="text-primary" /> Revision History
        </CardTitle>
        <CardDescription>Review your past practice sessions.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No history yet. Start practicing!</p>
        ) : (
          <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-16rem)] md:h-full max-h-[600px] pr-3"> {/* Adjusted height */}
            <Accordion type="single" collapsible className="w-full space-y-2">
              {history.map((item) => (
                <AccordionItem value={item.id} key={item.id} className="bg-card border rounded-md shadow-sm">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        {item.problemType === 'theory' ? <MessageSquareText className="w-5 h-5 text-primary" /> : <ListChecks className="w-5 h-5 text-primary" />}
                        <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">{item.topic}</span>
                      </div>
                      <Badge variant={item.evaluation?.isCorrect ? "default" : "destructive"} className={item.evaluation?.isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                        {item.evaluation?.isCorrect ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                        <span className="ml-1">{item.evaluation?.isCorrect ? 'Correct' : 'Incorrect'}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 pt-1 text-sm">
                    <div className="space-y-3">
                      <div>
                        <strong className="block text-muted-foreground">Problem:</strong>
                        <p className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-xs">{item.problem.problemStatement}</p>
                      </div>
                      {item.problemType === 'theory' && item.userAnswer && (
                        <div>
                          <strong className="block text-muted-foreground">Your Answer:</strong>
                           <p className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-xs">{item.userAnswer}</p>
                        </div>
                      )}
                      {item.problemType === 'practical' && item.selectedOption && (
                        <div>
                          <strong className="block text-muted-foreground">Your Choice:</strong>
                           <p className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-xs">{item.selectedOption}</p>
                        </div>
                      )}
                       {item.evaluation?.feedback && (
                        <div>
                          <strong className="block text-muted-foreground">Feedback:</strong>
                           <p className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-xs">{item.evaluation.feedback}</p>
                        </div>
                      )}
                       {item.isTopicRevised && item.topicDetails && (
                        <div>
                          <strong className="block text-muted-foreground">Revised Details:</strong>
                           <p className="whitespace-pre-wrap bg-muted/30 p-2 rounded text-xs max-h-24 overflow-y-auto">{item.topicDetails}</p>
                        </div>
                      )}
                    </div>
                    {/* {onRevisitProblem && (
                      <Button variant="link" size="sm" onClick={() => onRevisitProblem(item)} className="mt-2">Revisit</Button>
                    )} */}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
