// src/app/profile/history/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import type { ProblemType, DifficultyLevel } from '@/types';

interface HistoryItem {
  id: string;
  created_at: string;
  topic: string;
  problem_type: ProblemType;
  difficulty?: DifficultyLevel | null;
  problem_statement: string;
  user_answer?: string | null;
  selected_option?: string | null;
  evaluation_is_correct?: boolean | null;
  evaluation_feedback?: string | null;
  time_taken_seconds?: number | null;
}

const formatTimeTaken = (seconds?: number | null) => {
  if (!seconds) return 'N/A';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const getProblemTypeLabel = (type: ProblemType) => {
  const labels: Record<ProblemType, string> = {
    theory: 'Theory',
    practical: 'Practical',
    conceptual: 'Conceptual',
    numerical: 'Numerical',
    diagram_based: 'Diagram',
    random: 'Random'
  };
  return labels[type] || 'Unknown';
};

const getDifficultyLabel = (level?: DifficultyLevel | null) => {
  if (!level) return 'Not rated';
  
  const labels: Record<DifficultyLevel, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard'
  };
  return labels[level] || 'Unknown';
};

const getDifficultyColor = (level?: DifficultyLevel | null) => {
  if (!level) return 'bg-gray-200 text-gray-700';
  
  const colors: Record<DifficultyLevel, string> = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800'
  };
  return colors[level] || 'bg-gray-200 text-gray-700';
};

export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  const supabase = createSupabaseBrowserClient();
  
  const fetchHistory = useCallback(async (page: number) => {
    console.log('fetchHistory called. user?.id:', user?.id);
    if (!user?.id) {
      console.log('fetchHistory aborted: user.id is null or undefined.');
      return;
    }
    
    setIsLoading(true);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      // Fetch total count first
      const { count } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Calculate total pages
      const total = count || 0;
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
      
      // Now fetch the actual data for the page
      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, toast]);
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (!authLoading && user) {
      fetchHistory(currentPage);
    }
  }, [authLoading, user, currentPage, fetchHistory, router]);
  
  if (authLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl py-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interaction History</h1>
          <p className="text-muted-foreground mt-2">
            Review your past learning interactions and track your progress over time.
          </p>
        </div>
        
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-5/6 mt-2" />
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No history yet</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                You haven't attempted any practice problems yet. Start learning to see your history here.
              </p>
              <Button onClick={() => router.push('/')}>
                Start Practice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {history.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <CardTitle className="text-lg">{item.topic}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(item.created_at), 'PPP')} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4 line-clamp-2">{item.problem_statement}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">
                        {getProblemTypeLabel(item.problem_type)}
                      </Badge>
                      {item.difficulty && (
                        <Badge className={getDifficultyColor(item.difficulty)}>
                          {getDifficultyLabel(item.difficulty)}
                        </Badge>
                      )}
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Time: {formatTimeTaken(item.time_taken_seconds)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.evaluation_is_correct ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Correct Answer</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">Incorrect Answer</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push(`/practice/${item.id}`)}
                      className="ml-auto"
                    >
                      Review Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
