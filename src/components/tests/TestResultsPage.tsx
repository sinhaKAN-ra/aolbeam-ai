import React, { useState, useEffect } from 'react';

import { fetchTestAttemptById } from '@/services/testAttemptService';
import { TestAttempt, TestProblem, TestProblemResponse } from '@/types';

import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  Calendar,
  PlayCircle,
  BarChart3
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TestResultsPageProps {
  attemptId: string;
}

const TestResultsPage: React.FC<TestResultsPageProps> = ({ attemptId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({ prob1: true });
  
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [problems, setProblems] = useState<TestProblem[]>([]);
  const [responses, setResponses] = useState<TestProblemResponse[]>([]);
  
  // Load test attempt data
  useEffect(() => {
    const loadTestResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { attempt, problems, responses } = await fetchTestAttemptById(attemptId);
        
        setAttempt(attempt);
        setProblems(problems);
        setResponses(responses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load test results');
      } finally {
        setLoading(false);
      }
    };
    
    loadTestResults();
  }, [attemptId]);
  
  const formatTime = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      `${secs}s`
    ].filter(Boolean).join(' ');
  };
  
  // Calculate statistics
  const calculateStats = () => {
    if (!problems.length) {
      return {
        totalProblems: 0,
        attemptedProblems: 0,
        correctProblems: 0,
        incorrectProblems: 0,
        pendingGradingProblems: 0,
        score: 0,
        averageTimePerProblem: 0
      };
    }
    
    const attemptedProblems = responses.length;
    const correctProblems = responses.filter(r => r.is_correct === true).length;
    const incorrectProblems = responses.filter(r => r.is_correct === false).length;
    const pendingGradingProblems = responses.filter(r => r.is_correct === null).length;
    
    const totalTimeSpent = responses.reduce((total, response) => {
      return total + (response.time_taken_seconds || 0);
    }, 0);
    
    const averageTimePerProblem = attemptedProblems ? Math.round(totalTimeSpent / attemptedProblems) : 0;
    
    // Calculate score based on percentage of correct answers
    const score = problems.length ? (correctProblems / problems.length) * 100 : 0;
    
    return {
      totalProblems: problems.length,
      attemptedProblems,
      correctProblems,
      incorrectProblems,
      pendingGradingProblems,
      score,
      averageTimePerProblem
    };
  };
  
  const stats = calculateStats();
  
  // Get response for a specific problem
  const getResponseForProblem = (problemId: string): TestProblemResponse | undefined => {
    return responses.find(response => response.test_problem_id === problemId);
  };
  
  // Get status chip for a response
  const getStatusChip = (response: TestProblemResponse | undefined) => {
    if (!response) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          Not Attempted
        </span>
      );
    }
    
    if (response.is_correct === true) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Correct
        </span>
      );
    }
    
    if (response.is_correct === false) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Incorrect
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
        <HelpCircle className="h-3 w-3 mr-1" />
        Pending
      </span>
    );
  };
  
  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen px-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mt-3 text-base text-gray-600">Loading results...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-2">Error Loading Results</h3>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <button
                  onClick={() => router.push('/tests')}
                  className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                >
                  Back to Tests
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!attempt || !attempt.test_series) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <HelpCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Results Not Found</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Test results not found or failed to load properly.
                </p>
                <button
                  onClick={() => router.push('/tests')}
                  className="w-full px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 transition-colors"
                >
                  Back to Tests
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Test Results</h1>
                <h2 className="text-lg sm:text-xl font-semibold text-blue-600 mb-2">
                  {attempt.test_series.title}
                </h2>
                {attempt.test_series.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{attempt.test_series.description}</p>
                )}
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="bg-blue-50 rounded-full p-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary - Always full width on mobile */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Performance Summary
            </h3>
            
            {/* Score Display - Prominent on mobile */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Overall Score</p>
              <p className="text-4xl sm:text-5xl font-bold text-blue-600">
                {stats.score.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.correctProblems} out of {stats.totalProblems} correct
              </p>
            </div>

            {/* Stats Grid - Responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.correctProblems}</p>
                <p className="text-xs text-gray-600">Correct</p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.incorrectProblems}</p>
                <p className="text-xs text-gray-600">Incorrect</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-lg font-bold text-gray-900">{formatTime(attempt.total_time_seconds)}</p>
                <p className="text-xs text-gray-600">Total Time</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Questions Attempted:</span>
                  <span className="font-medium">{stats.attemptedProblems}/{stats.totalProblems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg. Time/Question:</span>
                  <span className="font-medium">{formatTime(stats.averageTimePerProblem)}</span>
                </div>
              </div>
            </div>

            {stats.pendingGradingProblems > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="ml-3 text-sm text-blue-700">
                    {stats.pendingGradingProblems} question{stats.pendingGradingProblems > 1 ? 's' : ''} pending manual review.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Details - Compact card */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-600" />
              Test Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Date Taken</p>
                <p className="font-medium text-gray-900">
                  {new Date(attempt.started_at).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Start Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(attempt.started_at).toLocaleTimeString(undefined, { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Duration</p>
                <p className="font-medium text-gray-900">
                  {formatTime(attempt.total_time_seconds)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Status</p>
                <p className="font-medium text-gray-900">
                  {attempt.completed_at ? 'Completed' : 'In Progress'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Analysis */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 px-1">Question Analysis</h3>
          <div className="space-y-3">
            {problems.map((problem, index) => {
              const response = getResponseForProblem(problem.id);
              const isExpanded = expandedQuestions[problem.id];
              return (
                <div key={problem.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleQuestion(problem.id)}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-5">
                            {problem.problem_statement.length > 80 
                              ? `${problem.problem_statement.substring(0, 80)}...` 
                              : problem.problem_statement}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <div className="flex flex-col items-end space-y-1">
                        {getStatusChip(response)}
                        {response && response.time_taken_seconds && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(response.time_taken_seconds)}
                          </div>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <>
                      <div className="border-t border-gray-200"></div>
                      <div className="p-4 space-y-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Question:</h5>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {problem.problem_statement}
                          </p>
                        </div>
                        
                        {problem.problem_type === 'mcq' && problem.multiple_choice_options && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Options:</h5>
                            <div className="space-y-2">
                              {problem.multiple_choice_options.map((option, i) => (
                                <div
                                  key={i}
                                  className={`p-3 rounded-lg text-sm border ${
                                    option === problem.correct_answer
                                      ? 'bg-green-50 border-green-200 text-green-800'
                                      : response?.user_response === option && option !== problem.correct_answer
                                      ? 'bg-red-50 border-red-200 text-red-800'
                                      : 'bg-gray-50 border-gray-200 text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-start">
                                    <span className="font-medium mr-2 flex-shrink-0">
                                      {String.fromCharCode(65 + i)}.
                                    </span>
                                    <span className="flex-1">{option}</span>
                                    {option === problem.correct_answer && (
                                      <CheckCircle className="h-4 w-4 text-green-600 ml-2 flex-shrink-0" />
                                    )}
                                    {response?.user_response === option && option !== problem.correct_answer && (
                                      <XCircle className="h-4 w-4 text-red-600 ml-2 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-1">Your Answer:</h5>
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              {response ? response.user_response : 'Not answered'}
                            </p>
                          </div>
                          {problem.correct_answer && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-900 mb-1">Correct Answer:</h5>
                              <p className="text-sm text-gray-700 bg-green-50 p-2 rounded">
                                {problem.correct_answer}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {problem.explanation && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Explanation:</h5>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800 leading-relaxed">{problem.explanation}</p>
                            </div>
                          </div>
                        )}
                        
                        {problem.topic && (
                          <div className="flex items-center pt-2 border-t border-gray-100">
                            <span className="text-sm font-medium text-gray-900 mr-2">Topic:</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {problem.topic}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons - Fixed bottom on mobile */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 sm:mx-0 sm:relative sm:bottom-auto sm:bg-transparent sm:border-t-0 sm:p-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between max-w-6xl mx-auto">
            <button
              onClick={() => router.push('/tests')}
              className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              Back to Test List
            </button>
            <button
              onClick={() => router.push(`/tests/take/${attempt.test_series_id}`)}
              className="flex items-center justify-center px-6 py-3 bg-orange-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Take Test Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultsPage;