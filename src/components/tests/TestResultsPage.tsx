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
  Loader2
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
  const getStatusChip = (response?: TestProblemResponse) => {
    if (!response) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <HelpCircle className="h-3 w-3 mr-1" />
          Not Attempted
        </span>
      );
    }
    
    if (response.is_correct === null) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <HelpCircle className="h-3 w-3 mr-1" />
          Pending Grading
        </span>
      );
    }
    
    if (response.is_correct) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Correct
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Incorrect
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
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading results...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => router.push('/tests')}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!attempt || !attempt.test_series) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <HelpCircle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Test results not found or failed to load properly.
            </p>
            <button
              onClick={() => router.push('/tests')}
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Results</h1>
        <h2 className="text-xl font-semibold text-blue-600 mb-1">
          {attempt.test_series.title}
        </h2>
        {attempt.test_series.description && (
          <p className="text-gray-600">{attempt.test_series.description}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Performance Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Summary</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Score</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.score.toFixed(1)}%
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Correct</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.correctProblems}/{stats.totalProblems}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Attempted</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.attemptedProblems}/{stats.totalProblems}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Time Taken</p>
                <div className="flex items-center justify-center text-lg font-semibold text-gray-900">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(attempt.total_time_seconds)}
                </div>
              </div>
            </div>
            
            <hr className="border-gray-200 my-6" />
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Time Breakdown</h4>
              <p className="text-sm text-gray-600">
                Average time per question: {formatTime(stats.averageTimePerProblem)}
              </p>
            </div>
            
            {stats.pendingGradingProblems > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-center">
                  <HelpCircle className="h-5 w-5 text-blue-400" />
                  <p className="ml-3 text-sm text-blue-700">
                    {stats.pendingGradingProblems} questions require manual grading or review.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Test Details */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Test Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Date Taken</p>
                <p className="font-medium text-gray-900">
                  {new Date(attempt.started_at).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Start Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(attempt.started_at).toLocaleTimeString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Completion Time</p>
                <p className="font-medium text-gray-900">
                  {attempt.completed_at 
                    ? new Date(attempt.completed_at).toLocaleTimeString() 
                    : 'Not completed'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Total Duration</p>
                <p className="font-medium text-gray-900">
                  {formatTime(attempt.total_time_seconds)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push(`/tests/take/${attempt.test_series_id}`)}
              className="w-full mt-6 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Retake Test
            </button>
          </div>
        </div>
      </div>
      
      {/* Question Analysis */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Analysis</h3>
        
        <div className="space-y-4">
          {problems.map((problem, index) => {
            const response = getResponseForProblem(problem.id);
            const isExpanded = expandedQuestions[problem.id];
            
            return (
              <div key={problem.id} className="bg-white border border-gray-200 rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleQuestion(problem.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      Question {index + 1}: {problem.problem_statement.length > 50 
                        ? `${problem.problem_statement.substring(0, 50)}...` 
                        : problem.problem_statement}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    {getStatusChip(response)}
                    {response && response.time_taken_seconds && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(response.time_taken_seconds)}
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <>
                    <hr className="border-gray-200" />
                    <div className="p-4">
                      <p className="text-sm text-gray-700 mb-4">
                        {problem.problem_statement}
                      </p>
                      
                      {problem.problem_type === 'mcq' && problem.multiple_choice_options && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Options:</h5>
                          <div className="space-y-1">
                            {problem.multiple_choice_options.map((option, i) => (
                              <div
                                key={i}
                                className={`p-2 rounded text-sm ${
                                  option === problem.correct_answer
                                    ? 'bg-green-100 border border-green-200'
                                    : response?.user_response === option && option !== problem.correct_answer
                                    ? 'bg-red-100 border border-red-200'
                                    : 'bg-gray-50 border border-gray-200'
                                }`}
                              >
                                {String.fromCharCode(65 + i)}. {option}
                                {option === problem.correct_answer && (
                                  <span className="text-green-700 font-medium"> (Correct Answer)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900">Your Answer:</h5>
                        <p className="text-sm text-gray-700 mt-1">
                          {response ? response.user_response : 'Not answered'}
                        </p>
                      </div>
                      
                      {problem.correct_answer && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-900">Correct Answer:</h5>
                          <p className="text-sm text-gray-700 mt-1">{problem.correct_answer}</p>
                        </div>
                      )}
                      
                      {problem.explanation && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-900">Explanation:</h5>
                          <p className="text-sm text-gray-700 mt-1">{problem.explanation}</p>
                        </div>
                      )}
                      
                      {problem.topic && (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">Topic:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4">
        <button
          onClick={() => router.push('/tests')}
          className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Back to Test List
        </button>
        
        <button
          onClick={() => router.push(`/tests/take/${attempt.test_series_id}`)}
          className="px-6 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Take Test Again
        </button>
      </div>
    </div>
  );
};

export default TestResultsPage;
