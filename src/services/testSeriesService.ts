import { TestSeries, TestProblem, TestSeriesShare } from '@/types';

/**
 * Fetches all test series for the current user based on the provided filter
 */
export async function fetchTestSeries(filter?: { 
  sharedOnly?: boolean, 
  createdOnly?: boolean, 
  publicOnly?: boolean 
}): Promise<TestSeries[]> {
  try {
    const params = new URLSearchParams();
    
    if (filter?.sharedOnly) params.append('sharedOnly', 'true');
    if (filter?.createdOnly) params.append('createdOnly', 'true');
    if (filter?.publicOnly) params.append('publicOnly', 'true');
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/test-series${queryString}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch test series');
    }

    const responseData = await response.json();
    // Return the data directly as it's already an array of TestSeries
    return responseData as TestSeries[];
  } catch (error) {
    console.error('Error fetching test series:', error);
    throw error;
  }
}

/**
 * Creates a new test series
 */
export async function createTestSeries(testSeries: Partial<TestSeries>): Promise<TestSeries> {
  try {
    const response = await fetch('/api/test-series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSeries),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create test series');
    }

    const responseData = await response.json();
    // Handle responses that might be wrapped in a 'data' object or not
    const newTestSeries = responseData.data || responseData;

    if (!newTestSeries || typeof newTestSeries.id !== 'string') {
      console.error('Invalid response from createTestSeries API:', responseData);
      throw new Error('Failed to create test series due to invalid API response.');
    }

    return newTestSeries as TestSeries;
  } catch (error) {
    console.error('Error creating test series:', error);
    throw error;
  }
}

/**
 * Fetches a specific test series by ID, including its problems
 */
export async function fetchTestSeriesById(id: string): Promise<{
  testSeries: TestSeries;
  problems: TestProblem[];
}> {
  try {
    const url = `/api/test-series/${id}`;
    console.log(`Fetching test series from: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch test series');
    }

    const { data } = await response.json();
    console.log('API response data:', data);

    // Make sure test_problems is properly extracted
    const problems = data.test_series_problems || [];
    console.log(`Found ${problems.length} problems in test series`);
    
    // Create a copy of the data with test_problems explicitly set
    const testSeries = {
      ...data,
      test_problems: problems
    };
    
    return {
      testSeries,
      problems
    };
  } catch (error) {
    console.error(`Error fetching test series ${id}:`, error);
    throw error;
  }
}

/**
 * Updates an existing test series
 */
export async function updateTestSeries(id: string, updates: Partial<TestSeries>): Promise<TestSeries> {
  try {
    const response = await fetch(`/api/test-series/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update test series');
    }

    const { data } = await response.json();
    return data as TestSeries;
  } catch (error) {
    console.error(`Error updating test series ${id}:`, error);
    throw error;
  }
}

/**
 * Deletes a test series
 */
export async function deleteTestSeries(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/test-series/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete test series');
    }
  } catch (error) {
    console.error(`Error deleting test series ${id}:`, error);
    throw error;
  }
}

/**
 * Adds a problem to a test series
 */
export async function addProblemToTestSeries(
  testSeriesId: string, 
  problem: Partial<TestProblem>
): Promise<TestProblem> {
  try {
    const response = await fetch(`/api/test-series/${testSeriesId}/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(problem)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add problem to test series');
    }

    const { data } = await response.json();
    return data as TestProblem;
  } catch (error) {
    console.error(`Error adding problem to test series ${testSeriesId}:`, error);
    throw error;
  }
}

/**
 * Updates the order of problems in a test series
 */
export async function updateProblemOrder(
  testSeriesId: string, 
  problemOrder: string[]
): Promise<void> {
  try {
    const response = await fetch(`/api/test-series/${testSeriesId}/problems`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reorder: true,
        problemOrder
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update problem order');
    }
  } catch (error) {
    console.error(`Error updating problem order in test series ${testSeriesId}:`, error);
    throw error;
  }
}
