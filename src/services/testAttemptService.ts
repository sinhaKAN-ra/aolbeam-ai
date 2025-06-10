import { TestAttempt, TestProblem, TestProblemResponse } from '@/types';

/**
 * Fetches all test attempts for the current user, optionally filtered by test series
 */
export async function fetchTestAttempts(testSeriesId?: string): Promise<TestAttempt[]> {
  try {
    const params = new URLSearchParams();
    if (testSeriesId) {
      params.append('test_series_id', testSeriesId);
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/test-attempts${queryString}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch test attempts');
    }

    const { data } = await response.json();
    return data as TestAttempt[];
  } catch (error) {
    console.error('Error fetching test attempts:', error);
    throw error;
  }
}

/**
 * Starts a new test attempt
 */
export async function startTestAttempt(testSeriesId: string): Promise<TestAttempt> {
  try {
    const response = await fetch('/api/test-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_series_id: testSeriesId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start test attempt');
    }

    const { data } = await response.json();
    return data as TestAttempt;
  } catch (error) {
    console.error('Error starting test attempt:', error);
    throw error;
  }
}

/**
 * Fetches a specific test attempt by ID, including problems and responses
 */
export async function fetchTestAttemptById(id: string): Promise<{
  attempt: TestAttempt;
  problems: TestProblem[];
  responses: TestProblemResponse[];
}> {
  try {
    const response = await fetch(`/api/test-attempts/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch test attempt');
    }

    const { data } = await response.json();
    
    return {
      attempt: data.attempt,
      problems: data.problems || [],
      responses: data.responses || []
    };
  } catch (error) {
    console.error(`Error fetching test attempt ${id}:`, error);
    throw error;
  }
}

/**
 * Completes a test attempt
 */
export async function completeTestAttempt(
  attemptId: string, 
  data: { total_time_seconds?: number; score?: number }
): Promise<TestAttempt> {
  try {
    const response = await fetch(`/api/test-attempts/${attemptId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        ...data
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete test attempt');
    }

    const { data: responseData } = await response.json();
    return responseData as TestAttempt;
  } catch (error) {
    console.error(`Error completing test attempt ${attemptId}:`, error);
    throw error;
  }
}

/**
 * Submits a response for a problem in a test attempt
 */
export async function submitProblemResponse(
  attemptId: string,
  problemId: string,
  userResponse: any,
  timeTakenSeconds?: number
): Promise<TestProblemResponse> {
  try {
    const response = await fetch(`/api/test-attempts/${attemptId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_problem_id: problemId,
        user_response: userResponse,
        time_taken_seconds: timeTakenSeconds
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit problem response');
    }

    const { data } = await response.json();
    return data as TestProblemResponse;
  } catch (error) {
    console.error(`Error submitting problem response for attempt ${attemptId}:`, error);
    throw error;
  }
}

/**
 * Fetches all responses for a test attempt
 */
export async function fetchTestAttemptResponses(attemptId: string): Promise<TestProblemResponse[]> {
  try {
    const response = await fetch(`/api/test-attempts/${attemptId}/responses`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch test attempt responses');
    }

    const { data } = await response.json();
    return data as TestProblemResponse[];
  } catch (error) {
    console.error(`Error fetching responses for test attempt ${attemptId}:`, error);
    throw error;
  }
}
