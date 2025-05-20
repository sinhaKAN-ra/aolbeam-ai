
"use client";

import type * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, ThumbsUp, MessageCircleQuestion } from 'lucide-react';
import type { GeneratePracticeProblemOutput } from '@/ai/flows/generate-practice-problem';
import type { ProblemType } from '@/types';
import MathRenderer from './MathRenderer';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface ProblemDisplayProps {
  problem: GeneratePracticeProblemOutput;
  problemType: ProblemType;
  onSubmitAnswer: (answer: string) => void;
  isLoading: boolean;
  currentTopic: string;
}

type FeedbackRating = "" | "good" | "unclear" | "incorrect_ans" | "irrelevant";

export function ProblemDisplay({ problem, problemType, onSubmitAnswer, isLoading, currentTopic }: ProblemDisplayProps) {
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>("");
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    // Reset answer and feedback fields when a new problem is displayed
    setUserAnswer('');
    setSelectedOption('');
    setFeedbackRating("");
    setFeedbackComment('');
    setFeedbackSubmitted(false);
  }, [problem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problemType === 'theory' && userAnswer.trim()) {
      onSubmitAnswer(userAnswer);
    } else if (problemType === 'practical' && selectedOption) {
      onSubmitAnswer(selectedOption);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd send this feedback to your backend/Supabase
    console.log("Feedback submitted:", { rating: feedbackRating, comment: feedbackComment });
    setFeedbackSubmitted(true);
    toast({
      title: "Feedback Received!",
      description: "Thank you for helping us improve.",
    });
    // Potentially, you might want to disable the feedback form or clear it
    // For now, we'll just show the toast and set a submitted flag.
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Practice Problem: <span className="text-primary">{currentTopic}</span></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-base prose max-w-none dark:prose-invert">
          <MathRenderer content={problem.problemStatement} />
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
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-base font-medium">Select an Option</Label>
              <RadioGroup
                value={selectedOption}
                onValueChange={setSelectedOption}
                className="space-y-2"
              >
                {problem.multipleChoiceOptions?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 border rounded-md hover:border-primary transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary/10">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="cursor-pointer text-base flex-1 prose prose-sm max-w-none dark:prose-invert">
                        <MathRenderer content={option}/>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          <Button type="submit" disabled={isLoading || (problemType === 'theory' ? !userAnswer.trim() : !selectedOption)} className="w-full text-base py-3">
            {isLoading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Submit Answer</>}
          </Button>
        </form>

        {!feedbackSubmitted && (
          <div className="mt-6 border-t pt-6">
            <CardTitle className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MessageCircleQuestion className="text-primary" /> Rate this Problem
            </CardTitle>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
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
