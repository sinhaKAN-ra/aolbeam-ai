
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History as HistoryIcon, 
  MessageSquareText, 
  ListChecks, 
  CheckCircle, 
  XCircle, 
  Brain as ConceptualIcon, 
  Sigma as NumericalIcon, 
  GitFork as DiagramIcon, 
  Shuffle, 
  Clock,
  RefreshCw 
} from 'lucide-react';
import type { InteractionHistoryItem, ProblemType } from '@/types';
import { Badge } from '@/components/ui/badge';
import MathRenderer from './MathRenderer';

interface HistoryViewProps {
  history: InteractionHistoryItem[];
  onRevisitProblem?: (item: InteractionHistoryItem) => void; 
}

const problemTypeIcons: Record<ProblemType, React.ElementType> = {
  theory: MessageSquareText,
  practical: ListChecks,
  conceptual: ConceptualIcon,
  numerical: NumericalIcon,
  diagram_based: DiagramIcon,
  random: Shuffle,
};

const formatTimeTaken = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export function HistoryView({ history, onRevisitProblem }: HistoryViewProps) {
  // If history is empty, show a message
  if (!history || history.length === 0) {
    return (
      <Card className="shadow-lg h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <HistoryIcon className="text-primary" /> History
          </CardTitle>
          <CardDescription>Review your past practice sessions.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground text-center py-8">No history yet. Start practicing!</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="history-view">
      <Card className="h-[400px] flex flex-col shadow-sm border border-border/50">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <HistoryIcon className="h-5 w-5 text-primary" /> 
            <span>Practice History</span>
          </CardTitle>
          <CardDescription className="text-sm">Review your past practice sessions and progress</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full w-full">
          <div className="p-4 overflow-x-hidden">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <HistoryIcon className="h-8 w-8 mb-2 opacity-50" />
                <p>No practice history yet</p>
                <p className="text-xs mt-1 text-muted-foreground/70">Your practice sessions will appear here</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-3">
                {history.map((item) => {
                  // Use item.problemType if it's a concrete type, or item.actualProblemType if item.problemType was 'random'
                  const displayProblemType = (item.problemType === 'random' && item.actualProblemType) 
                    ? item.actualProblemType 
                    : item.problemType;
                  const ProblemIcon = problemTypeIcons[displayProblemType] || MessageSquareText;
                  
                  return (
                    <AccordionItem 
                      value={item.id} 
                      key={item.id} 
                      className="bg-card/50 border rounded-lg hover:border-border/70 transition-colors"
                    >
                      <AccordionTrigger className="px-3 sm:px-4 py-2 sm:py-3 hover:no-underline hover:bg-muted/30 rounded-lg">
                        <div className="w-full">
                          {/* Top row - Topic and Status */}
                          <div className="flex justify-between items-start w-full gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-grow">
                              <div className="p-1.5 sm:p-2 rounded-md bg-primary/10 text-primary flex-shrink-0">
                                <ProblemIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </div>
                              <h4 className="text-sm font-medium truncate">
                                {item.topic || 'Untitled Problem'}
                              </h4>
                            </div>
                            {item.evaluation && (
                              <Badge 
                                variant={item.evaluation.isCorrect ? "default" : "destructive"} 
                                className={`${item.evaluation.isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white text-xs h-5 px-1.5`}
                              >
                                {item.evaluation.isCorrect ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                <span className="ml-0.5 sm:ml-1">{item.evaluation.isCorrect ? 'Correct' : 'Incorrect'}</span>
                              </Badge>
                            )}
                          </div>
                          
                          {/* Bottom row - Meta info */}
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground ml-7 sm:ml-0">
                              <span className="capitalize">{displayProblemType}</span>
                              <span>•</span>
                              <span className="capitalize">{item.difficulty || 'medium'}</span>
                              {item.timestamp && (
                                <>
                                  <span>•</span>
                                  <span className="whitespace-nowrap">
                                    {new Date(item.timestamp).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: new Date(item.timestamp).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                            {item.timeTakenSeconds && (
                              <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center whitespace-nowrap">
                                <Clock className="h-3 w-3 mr-0.5" />
                                <span className="hidden sm:inline">{formatTimeTaken(item.timeTakenSeconds)}</span>
                                <span className="sm:hidden">{Math.round(item.timeTakenSeconds)}s</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 text-sm overflow-hidden">
                        <div className="space-y-3 overflow-x-auto">
                          {item.problem?.problemStatement && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-1">Problem</h5>
                              <div className="prose prose-sm prose-headings:font-medium max-w-full overflow-x-auto">
                                <MathRenderer content={item.problem.problemStatement} />
                              </div>
                            </div>
                          )}
                          
                          {item.userAnswer && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-1">
                                {item.selectedOption ? 'Your Choice' : 'Your Answer'}
                              </h5>
                              <div className="bg-muted/30 p-3 rounded-md text-sm overflow-x-auto">
                                <MathRenderer content={item.selectedOption || item.userAnswer} />
                              </div>
                            </div>
                          )}
                          
                          {item.evaluation?.feedback && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-1">Feedback</h5>
                              <div className="bg-muted/30 p-3 rounded-md text-sm overflow-x-auto break-words">
                                {item.evaluation.feedback}
                              </div>
                            </div>
                          )}
                          
                          {item.problem?.correctAnswer && !item.evaluation?.isCorrect && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-1">Correct Answer</h5>
                              <div className="bg-muted/30 p-3 rounded-md text-sm overflow-x-auto">
                                <MathRenderer content={item.problem.correctAnswer} />
                              </div>
                            </div>
                          )}

                          {item.isTopicRevised && item.topicDetails && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-1">Problem Insights</h5>
                              <div className="bg-muted/30 p-3 rounded-md text-sm max-h-64 overflow-y-auto overflow-x-auto">
                                <MathRenderer content={item.topicDetails} />
                              </div>
                            </div>
                          )}
                          
                          {!item.evaluation && (
                            <p className="text-muted-foreground italic text-sm">This problem was generated but not answered.</p>
                          )}
                        </div>
                        
                        {onRevisitProblem && (
                          <div className="mt-4 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => onRevisitProblem(item)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Try Again
                            </Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
