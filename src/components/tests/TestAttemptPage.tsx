import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';


import { TestSeries, TestProblem, TestAttempt, TestProblemResponse } from '@/types';
import {
  startTestAttempt,
  fetchTestAttemptById,
  completeTestAttempt,
  submitProblemResponse
} from '@/services/testAttemptService';
import { fetchTestSeriesById } from '@/services/testSeriesService';

import {ProblemDisplay} from '../ProblemDisplay';

interface TestAttemptPageProps {
  testSeriesId: string;
  attemptId?: string;
}

const TestAttemptPage: React.FC<TestAttemptPageProps> = ({ testSeriesId, attemptId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testSeries, setTestSeries] = useState<TestSeries | null>(null);
  const [problems, setProblems] = useState<TestProblem[]>([]);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [responses, setResponses] = useState<Record<string, TestProblemResponse>>({});

  const [activeStep, setActiveStep] = useState(0);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Timer refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeTest = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch test series with problems
        console.log('Fetching test series with ID:', testSeriesId);
        const { testSeries, problems } = await fetchTestSeriesById(testSeriesId);
        console.log('Received test series:', testSeries);
        console.log('Received problems:', problems);
        
        setTestSeries(testSeries);
        
        // Make sure we have problems data
        if (problems && problems.length > 0) {
          console.log(`Setting ${problems.length} problems from API response`);
          setProblems(problems);
        } else if (testSeries.test_problems && testSeries.test_problems.length > 0) {
          console.log(`Setting ${testSeries.test_problems.length} problems from testSeries.test_problems`);
          setProblems(testSeries.test_problems);
        } else if (testSeries.test_series_problems && testSeries.test_series_problems.length > 0) {
          console.log(`Setting ${testSeries.test_series_problems.length} problems from testSeries.test_series_problems`);
          setProblems(testSeries.test_series_problems);
        } else {
          console.warn('No problems found for this test series');
          setProblems([]);
        }

        // If we have an attempt ID, fetch that attempt
        if (attemptId) {
          const { attempt, responses: existingResponses } = await fetchTestAttemptById(attemptId);
          setAttempt(attempt);
          
          // Convert responses array to a map keyed by problem ID
          const responseMap: Record<string, TestProblemResponse> = {};
          existingResponses.forEach(response => {
            responseMap[response.test_problem_id] = response;
          });
          setResponses(responseMap);
        } else {
          // Start a new test attempt
          const newAttempt = await startTestAttempt(testSeriesId);
          setAttempt(newAttempt);
        }
      } catch (err) {
        console.error('TestAttemptPage: Error initializing test:', err);
        setError('Failed to initialize test');
      } finally {
        setLoading(false);
      }
    };

    initializeTest();

    // Start timer when component mounts
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTotalTimeSeconds(elapsedSeconds);
      }
    }, 1000);

    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testSeriesId, attemptId]);

  const handlePreviousStep = () => {
    setActiveStep(prevStep => Math.max(0, prevStep - 1));
  };

  const handleNextStep = () => {
    setActiveStep(prevStep => Math.min(problems.length - 1, prevStep + 1));
  };

  const handleStep = (step: number) => () => {
    setActiveStep(step);
  };

  const handleAnswerSubmit = async (problemId: string, answer: any, timeSeconds?: number) => {
    try {
      if (!attempt) return;

      const response = await submitProblemResponse(
        attempt.id,
        problemId,
        answer,
        timeSeconds
      );

      // Update responses state
      setResponses(prevResponses => ({
        ...prevResponses,
        [problemId]: response
      }));

      // Move to next problem if not on the last one
      if (activeStep < problems.length - 1) {
        handleNextStep();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    }
  };

  const calculateScore = (): number => {
    if (problems.length === 0) return 0;
    const correctResponses = Object.values(responses).filter(response => response.is_correct).length;
    return Math.round((correctResponses / problems.length) * 100);
  };

  const handleFinishTest = async () => {
    setConfirmSubmitOpen(false);
    
    try {
      if (!attempt) return;
      
      const finalScore = calculateScore();

      await completeTestAttempt(attempt.id, {
        total_time_seconds: totalTimeSeconds,
        score: finalScore
      });

      // Navigate to results page
      router.push(`/tests/results/${attempt.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete test');
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return [
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      `${remainingSeconds}s`
    ].filter(Boolean).join(' ');
  };

  const currentProblem = React.useMemo(() => {
    return problems.length > activeStep ? problems[activeStep] : null;
  }, [problems, activeStep]);

  const getResponseForCurrentProblem = (): TestProblemResponse | undefined => {
    return currentProblem ? responses[currentProblem.id] : undefined;
  };

  const calculateProgress = (): number => {
    if (!problems.length) return 0;
    const answeredCount = Object.keys(responses).length;
    return (answeredCount / problems.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!testSeries || !problems.length || !attempt) {
    return (
      <div className="p-6">
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Info!</strong>
          <span className="block sm:inline">No test series or problems found.</span>
        </div>
      </div>
    );
  }

  const currentResponse = getResponseForCurrentProblem();
  const problemIndex = problems.findIndex(p => p.id === currentProblem?.id);

  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{testSeries.title}</h1>
        <p className="text-gray-600 mb-4">
          {testSeries.description}
        </p>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center">
            <span className="mr-2 text-gray-500">&#9200;</span> {/* Timer icon */}
            <h2 className="text-xl font-semibold">Time Elapsed: {formatTime(totalTimeSeconds)}</h2>
          </div>
          {attempt.score !== null && (
            <div className="flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-md">
              <span className="font-semibold">Score:</span>
              <span className="ml-2 text-lg font-bold">{attempt.score}%</span>
            </div>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${calculateProgress()}%` }}></div>
        </div>
        <div className="flex justify-between mb-6">
          {problems.map((problem, index) => (
            <button
              key={problem.id}
              onClick={handleStep(index)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${activeStep === index ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} ${Object.keys(responses).includes(problem.id) ? 'border-2 border-green-500' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentProblem ? (
          <div className="mb-6">
            <ProblemDisplay
              problem={currentProblem}
              problemType={currentProblem.problem_type}
              onSubmitAnswer={(answer: string, timeSeconds?: number) => {
                handleAnswerSubmit(currentProblem.id, answer, timeSeconds);
              }}
              onFeedbackSubmit={() => {}} // No feedback in test mode
              isLoading={false}
              currentTopic={currentProblem.topic || "Test Problem"}
              evaluationSubmitted={!!responses[currentProblem.id]}
            />
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Warning!</strong>
            <span className="block sm:inline"> No problem found</span>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={handlePreviousStep}
            disabled={activeStep === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            &larr; Back
          </button>
          {activeStep < problems.length - 1 ? (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Next &rarr;
            </button>
          ) : (
            <button
              onClick={() => setConfirmSubmitOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Finish Test &#10003;
            </button>
          )}
        </div>
      </div>

      {/* Mobile question navigator */}
      <div className="block md:hidden mt-4">
        <div className="border border-gray-300 rounded-md p-4">
          <h3 className="text-sm font-medium mb-2">Questions</h3>
          <div className="flex flex-wrap">
            {problems.map((problem, index) => {
              const isAnswered = !!responses[problem.id];
              return (
                <button
                  key={problem.id}
                  onClick={handleStep(index)}
                  className={`mb-1 mr-1 min-w-[40px] px-2 py-1 text-sm font-medium rounded-md
                    ${activeStep === index ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}
                    ${isAnswered ? 'border-2 border-green-500' : ''}
                  `}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-auto">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Submit Test</h3>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to finish and submit this test? You've answered {Object.keys(responses).length} out of {problems.length} questions.
              </p>
              
              {Object.keys(responses).length < problems.length && (
                <p className="text-sm text-yellow-600 mt-2 font-medium">
                  Warning: You have {problems.length - Object.keys(responses).length} unanswered questions.
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmSubmitOpen(false)}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Continue Test
              </button>
              <button 
                onClick={handleFinishTest}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Submit Test
              </button>
            </div>
          </div>
          </div>
        )}
    </>
  );
};

export default TestAttemptPage;
