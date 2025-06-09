// src/app/history/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { HistoryView } from '@/components/HistoryView';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import type { InteractionHistoryItem, ProblemType, DifficultyLevel, GeneratePracticeProblemOutput, EvaluateTheoryAnswerOutput } from '@/types'; // Assuming types are here
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

// Helper to transform Supabase record to InteractionHistoryItem
// This needs to be adapted based on the actual structure of 'user_interactions' table
const transformSupabaseRecordToHistoryItem = (record: any): InteractionHistoryItem => {
  // Ensure problem structure matches GeneratePracticeProblemOutput
  const problemData: GeneratePracticeProblemOutput = {
    problemStatement: record.problem_statement || '',
    answerFormat: record.answer_format || 'text', // default if not present
    multipleChoiceOptions: record.multiple_choice_options || undefined,
    correctAnswer: record.correct_answer || '',
    difficulty: (record.difficulty as 'easy' | 'medium' | 'hard') || 'medium' // default to medium if not specified
  };

  // Ensure evaluation structure matches EvaluateTheoryAnswerOutput
  let evaluationData: EvaluateTheoryAnswerOutput | undefined = undefined;
  if (record.evaluation_is_correct !== undefined && record.evaluation_feedback !== undefined) {
    evaluationData = {
      isCorrect: record.evaluation_is_correct,
      feedback: record.evaluation_feedback,
      // Optional fields from DB
      ...(record.evaluation_correct_answer_detail && { correctAnswer: record.evaluation_correct_answer_detail }),
      ...(record.evaluation_explanation_detail && { explanation: record.evaluation_explanation_detail }),
    };
  }

  return {
    id: record.id.toString(), // Use Supabase ID as the primary ID for items fetched from DB
    supabase_id: record.id.toString(),
    timestamp: record.created_at || new Date(record.timestamp).toISOString(), // Prefer created_at from DB
    topic: record.topic,
    problemType: record.problem_type as ProblemType, // User's original selection (could be 'random')
    actualProblemType: record.problem_type as Exclude<ProblemType, 'random'>, // Actual type stored
    difficulty: record.difficulty as DifficultyLevel,
    problem: problemData,
    userAnswer: record.user_answer || undefined,
    selectedOption: record.selected_option || undefined,
    evaluation: evaluationData,
    isTopicRevised: record.is_topic_revised || false,
    topicDetails: record.topic_details_content || null,
    feedbackRating: record.feedback_rating || undefined,
    feedbackComment: record.feedback_comment || undefined,
    timeTakenSeconds: record.time_taken_seconds || undefined,
  };
};

export default function HistoryPage() {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const supabase = useSupabase();
  const [history, setHistory] = useState<InteractionHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    if (!isClientMounted || isAuthLoading) {
      // Wait for client to mount and auth state to be resolved
      return;
    }

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      setError(null);
      try {
        if (currentUser && supabase) {
          // Logged-in user: fetch from Supabase
          console.log("HistoryPage: Fetching history for logged-in user:", currentUser.id);
          const { data, error: dbError } = await supabase
            .from('user_interactions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false }) // Get newest first
            .limit(100); // Limit to last 100 interactions, adjust as needed

          if (dbError) {
            console.error("HistoryPage: Error fetching history from Supabase:", dbError);
            setError("Failed to load your history from the cloud. " + dbError.message);
            setHistory([]);
          } else if (data) {
            console.log("HistoryPage: Successfully fetched history from Supabase:", data.length, "items");
            const transformedHistory = data.map(transformSupabaseRecordToHistoryItem);
            setHistory(transformedHistory);
            // Optionally, update localStorage to keep it in sync
            localStorage.setItem('aolbeamHistory_guest', JSON.stringify(transformedHistory.slice(0, 50)));
          }
        } else {
          // Guest user: load from localStorage
          console.log("HistoryPage: Loading history for guest user from localStorage.");
          const savedHistory = localStorage.getItem('aolbeamHistory_guest');
          if (savedHistory) {
            try {
              setHistory(JSON.parse(savedHistory));
            } catch (e) {
              console.error("HistoryPage: Error parsing guest history from localStorage", e);
              setError("Failed to load your local history.");
              setHistory([]);
            }
          } else {
            setHistory([]); // No local history for guest
          }
        }
      } catch (e: any) {
        console.error("HistoryPage: Unexpected error fetching history:", e);
        setError("An unexpected error occurred while loading history. " + e.message);
        setHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [currentUser, isAuthLoading, supabase, isClientMounted]);

  if (!isClientMounted || isLoadingHistory || isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your interaction history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="mt-4 text-destructive-foreground font-semibold">Error Loading History</p>
        <p className="mt-2 text-muted-foreground text-center">{error}</p>
        {currentUser && (
            <p className="mt-2 text-sm text-muted-foreground text-center">
                Attempted to load history for user: {currentUser.email}
            </p>
        )}
         <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Interaction History</CardTitle>
          <CardDescription>
            Review your past practice problems and evaluations.
            {currentUser ? ` History for ${currentUser.email}.` : " You are viewing history as a guest."}
          </CardDescription>
        </CardHeader>
      </Card>
      <HistoryView history={history} />
    </div>
  );
}
