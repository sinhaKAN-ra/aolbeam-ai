'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell
} from '@/components/ui/table';
import { fetchTestAttempts } from '@/services/testAttemptService';
import { TestAttempt } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Clock, Award, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

export default function TestAttemptsClient() {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // ← Now inside Suspense
  const searchParams = useSearchParams();
  const testSeriesId = searchParams?.get('test_series_id');

  useEffect(() => {
    async function loadAttempts() {
      try {
        setIsLoading(true);
        const data = await fetchTestAttempts(testSeriesId || undefined);
        setAttempts(data);
      } catch (error) {
        console.error('Error loading test attempts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your test attempts',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadAttempts();
  }, [toast, testSeriesId]);

  // Helper to format dates in a readable way
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Helper to display status chip
  const StatusChip = ({ attempt }: { attempt: TestAttempt }) => {
    if (attempt.completed_at) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          Completed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
        In Progress
      </span>
    );
  };

  return (
    <div className="container py-8">
    <Card className="border shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">Your Test Attempts</CardTitle>
          <Link href="/tests">
            <Button variant="outline">View Test Series</Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your test attempts...</span>
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't attempted any tests yet.</p>
            <Link href="/tests">
              <Button>Browse Test Series</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Responsive Table for md+ screens, Cards for mobile */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Series</TableHead>
                    <TableHead>Attempted By</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">
                        {attempt.test_series?.title || 'Unknown Test'}
                      </TableCell>
                      <TableCell>
                        {attempt.user_profiles?.full_name || 'Unknown User'}
                      </TableCell>
                      <TableCell>{formatDate(attempt.created_at)}</TableCell>
                      <TableCell><StatusChip attempt={attempt} /></TableCell>
                      <TableCell>
                        {attempt.score !== null ? (
                          <div className="flex items-center">
                            <Award className="h-4 w-4 mr-1 text-yellow-500" />
                            {attempt.score}%
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not scored</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {attempt.total_time_seconds ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {Math.floor(attempt.total_time_seconds / 60)}m {attempt.total_time_seconds % 60}s
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {attempt.completed_at ? (
                          <Link href={`/tests/results/${attempt.id}`} aria-label="View Results">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" /> View Results
                            </Button>
                          </Link>
                        ) : (
                          <></>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {attempts.map((attempt) => (
                <div key={attempt.id} className="bg-white border rounded-lg shadow-sm p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-base text-gray-900 truncate">
                      {attempt.test_series?.title || 'Unknown Test'}
                    </div>
                    <StatusChip attempt={attempt} />
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Started: {formatDate(attempt.created_at)}</div>
                  <div className="flex flex-wrap gap-2 text-sm mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Award className="h-4 w-4 text-yellow-500" />
                      {attempt.score !== null ? `${attempt.score}%` : 'Not scored'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {attempt.total_time_seconds ? `${Math.floor(attempt.total_time_seconds / 60)}m ${attempt.total_time_seconds % 60}s` : 'N/A'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">By: {attempt.user_profiles?.full_name || 'Unknown User'}</div>
                  <div className="flex gap-2">
                    {attempt.completed_at ? (
                      <Link href={`/tests/results/${attempt.id}`} aria-label="View Results">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" /> Results
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  </div>
  );
}