
"use client";

import type * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, ThumbsUp, MessageCircleQuestion, PlayCircle, TimerIcon, PauseCircle } from 'lucide-react';
import type { GeneratePracticeProblemOutput } from '@/ai/flows/generate-practice-problem';
import type { ProblemType } from '@/types';
import MathRenderer from './MathRenderer';
import { useToast } from '@/hooks/use-toast';

export type FeedbackRating = "" | "good" | "unclear" | "incorrect_ans" | "irrelevant";

interface ProblemDisplayProps {
  problem: GeneratePracticeProblemOutput;
  problemType: ProblemType;
  onSubmitAnswer: (answer: string, timeTakenSeconds?: number) => void;
  onFeedbackSubmit: (rating: FeedbackRating, comment: string) => void;
  isLoading: boolean;
  currentTopic: string;
}

const formatDisplayTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function ProblemDisplay({ problem, problemType, onSubmitAnswer, onFeedbackSubmit, isLoading, currentTopic }: ProblemDisplayProps) {
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>("");
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const { toast } = useToast();

  // Timer state
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [elapsedTimeInSeconds, setElapsedTimeInSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset fields and timer when a new problem is displayed
    setUserAnswer('');
    setSelectedOption('');
    setFeedbackRating("");
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    
    // Reset timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTimerActive(false);
    setElapsedTimeInSeconds(0);
    startTimeRef.current = 0;

  }, [problem]);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleStartTimer = () => {
    if (isTimerActive) { // Effectively a "Pause" button
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsTimerActive(false);
    } else { // Start or Resume
      startTimeRef.current = Date.now() - (elapsedTimeInSeconds * 1000); // Adjust start time if resuming
      setIsTimerActive(true);
      intervalRef.current = setInterval(() => {
        setElapsedTimeInSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intervalRef.current) { // Stop timer on submit
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTimerActive(false); // Ensure timer is marked as inactive

    const finalTimeTaken = elapsedTimeInSeconds;

    if (problemType === 'theory' && userAnswer.trim()) {
      onSubmitAnswer(userAnswer, finalTimeTaken);
    } else if (problemType === 'practical' && selectedOption) {
      onSubmitAnswer(selectedOption, finalTimeTaken);
    }
  };

  const handleInternalFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRating) {
        toast({
            variant: "destructive",
            title: "Rating Required",
            description: "Please select a rating for the problem.",
        });
        return;
    }
    onFeedbackSubmit(feedbackRating, feedbackComment);
    setFeedbackSubmitted(true);
    toast({
      title: "Feedback Received!",
      description: "Thank you for helping us improve.",
    });
  };

  const canSubmitAnswer = problemType === 'theory' ? userAnswer.trim() !== '' : selectedOption !== '';

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Practice Problem: <span className="text-primary">{currentTopic}</span></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-base prose max-w-none dark:prose-invert">
          <MathRenderer content={problem.problemStatement} />
        </div>

        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border rounded-lg bg-muted/50">
          <Button onClick={handleStartTimer} variant="outline" size="lg" className="w-full sm:w-auto">
            {isTimerActive && intervalRef.current ? <PauseCircle className="mr-2" /> : <PlayCircle className="mr-2" />}
            {isTimerActive && intervalRef.current ? 'Pause Timer' : (elapsedTimeInSeconds > 0 ? 'Resume Timer' : 'Start Timer')}
          </Button>
          <div className="flex items-center text-2xl font-mono font-semibold text-primary">
            <TimerIcon className="mr-2 h-7 w-7" />
            <span>{formatDisplayTime(elapsedTimeInSeconds)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {problemType === 'theory' ? (
            <div className="space-y-2">
              <Label htmlFor="theory-answer" className="text-base font-medium">Your Answer</Label>
              <Textarea
                id="theory-answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your detailed answer here..."
                rows={6}
                required
                className="text-base"
                disabled={!isTimerActive && elapsedTimeInSeconds === 0} 
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-base font-medium">Select an Option</Label>
              <RadioGroup
                value={selectedOption}
                onValueChange={setSelectedOption}
                className="space-y-2"
                disabled={!isTimerActive && elapsedTimeInSeconds === 0}
              >
                {problem.multipleChoiceOptions?.map((option, index) => (
                  <div key={index} className={`flex items-center space-x-2 p-3 border rounded-md transition-colors 
                                            ${(!isTimerActive && elapsedTimeInSeconds === 0) ? 'cursor-not-allowed opacity-70' 
                                              : 'hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary/10'}`}>
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${index}`} 
                      disabled={!isTimerActive && elapsedTimeInSeconds === 0}
                    />
                    <Label 
                      htmlFor={`option-${index}`} 
                      className={`cursor-pointer text-base flex-1 prose prose-sm max-w-none dark:prose-invert ${(!isTimerActive && elapsedTimeInSeconds === 0) ? 'cursor-not-allowed' : ''}`}
                    >
                        <MathRenderer content={option}/>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          <Button 
            type="submit" 
            disabled={isLoading || !canSubmitAnswer || (!isTimerActive && elapsedTimeInSeconds === 0 && !userAnswer && !selectedOption)} 
            className="w-full text-base py-3"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Submit Answer</>}
          </Button>
        </form>

        {!feedbackSubmitted && (
          <div className="mt-6 border-t pt-6">
            <CardTitle className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MessageCircleQuestion className="text-primary" /> Rate this Problem
            </CardTitle>
            <form onSubmit={handleInternalFeedbackSubmit} className="space-y-4">
              <RadioGroup value={feedbackRating} onValueChange={(value) => setFeedbackRating(value as FeedbackRating)} className="space-y-2">
                {[
                  { value: "good", label: "Looks Good" },
                  { value: "unclear", label: "Question is unclear or incorrect" },
                  { value: "incorrect_ans", label: "Answer/Options are incorrect or missing context" },
                  { value: "irrelevant", label: "Problem is not relevant to the topic" },
                ].map(item => (
                  <div key={item.value} className="flex items-center space-x-2 p-2 border rounded-md hover:border-primary/50 transition-colors text-sm">
                    <RadioGroupItem value={item.value} id={`feedback-${item.value}`} />
                    <Label htmlFor={`feedback-${item.value}`} className="cursor-pointer flex-1">{item.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              {(feedbackRating && feedbackRating !== "good") && (
                <div>
                  <Label htmlFor="feedback-comment" className="text-sm font-medium">Optional: Additional Comments</Label>
                  <Textarea
                    id="feedback-comment"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Help us understand the issue..."
                    rows={3}
                    className="text-sm mt-1"
                  />
                </div>
              )}
              <Button type="submit" variant="outline" size="sm" disabled={!feedbackRating}>
                <ThumbsUp className="mr-2 h-4 w-4" /> Submit Feedback
              </Button>
            </form>
          </div>
        )}
        {feedbackSubmitted && (
          <div className="mt-6 border-t pt-6 text-center">
            <p className="text-green-600 font-medium flex items-center justify-center gap-2">
              <ThumbsUp /> Thank you for your feedback!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    