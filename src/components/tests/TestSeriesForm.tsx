import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { toast } from 'sonner';
import { TestSeries, TestProblem } from '@/types/custom';
import { 
  createTestSeries, 
  fetchTestSeriesById, 
  updateTestSeries,
  addProblemToTestSeries,
  updateProblemOrder
} from '@/services/testSeriesService';
import TestProblemForm from './TestProblemForm';
import { TestProblemGeneratorForm } from './TestProblemGeneratorForm';
import TestProblemList from './TestProblemList';
import { PlusCircle, Sparkles } from 'lucide-react';

interface TestSeriesFormProps {
  testSeriesId?: string;
}

const TestSeriesForm: React.FC<TestSeriesFormProps> = ({ testSeriesId }) => {
  const router = useRouter();
  const isEditMode = !!testSeriesId;
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);
  
  // Check feature access for test creation
  const {
    canUseFeature,
    recordFeatureUsage,
    isLoading: isFeatureCheckLoading,
    usage
  } = useFeatureAccess();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const testUsage = {
    used: usage?.tests_created || 0,
    limit: usage?.test_creation_limit || 5,
    remaining: usage?.remaining_tests || 5,
    isLimitReached: (usage?.tests_created || 0) >= (usage?.test_creation_limit || 5),
    isNearLimit: ((usage?.test_creation_limit || 5) - (usage?.tests_created || 0)) > 0 && ((usage?.test_creation_limit || 5) - (usage?.tests_created || 0)) <= 2, // Example: 1 or 2 remaining
    percentage: ((usage?.tests_created || 0) / (usage?.test_creation_limit || 5)) * 100
  };
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [problems, setProblems] = useState<TestProblem[]>([]);
  const [showAddProblemForm, setShowAddProblemForm] = useState(false);
  const [showGenerateProblemForm, setShowGenerateProblemForm] = useState(false);
  
  // Load test series data if in edit mode
  useEffect(() => {
    if (isEditMode && testSeriesId) {
      const loadTestSeriesData = async () => {
        try {
          setLoading(true);
          const { testSeries } = await fetchTestSeriesById(testSeriesId);
          
          // Set form fields
          setTitle(testSeries.title);
          setDescription(testSeries.description || '');
          setIsPublic(testSeries.is_public);
          setEstimatedDuration(testSeries.estimated_duration_minutes || '');
          setTags(testSeries.tags || []);
          
          // Set problems
          setProblems(testSeries.test_problems || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load test series');
        } finally {
          setLoading(false);
        }
      };
      
      loadTestSeriesData();
    }
  }, [isEditMode, testSeriesId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const testSeriesData: Partial<TestSeries> = {
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : null,
        tags: tags.length > 0 ? tags : null
      };
      
      if (isEditMode && testSeriesId) {
        await updateTestSeries(testSeriesId, testSeriesData);
        setSuccess('Test series updated successfully');
      } else {
        const newTestSeries = await createTestSeries(testSeriesData);
        setProblems(newTestSeries.test_problems || []);
        setSuccess('Test series created successfully');
        // Redirect to edit page to add problems
        router.push(`/tests/edit/${newTestSeries.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save test series');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };
  
  const handleAddProblem = async (problem: Partial<TestProblem>) => {
    if (!isEditMode || !testSeriesId) {
      setError('Please save the test series first to add problems');
      return;
    }
    
    try {
      const newProblem = await addProblemToTestSeries(testSeriesId, problem);
      setProblems([...problems, newProblem]);
      setShowAddProblemForm(false);
      setSuccess('Problem added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add problem');
    }
  };
  
  // Handle AI-generated problem
  const handleProblemGenerated = async (newProblem: TestProblem) => {
    try {
      // Record the test creation usage
      try {
        await recordFeatureUsage('test_creation');
      } catch (error) {
        console.error('Error recording test creation usage:', error);
        // Re-throw the error to be handled by the outer catch block
        throw error;
      }
      
      setProblems([...problems, newProblem]);
      setShowGenerateProblemForm(false);
      setSuccess('Problem added successfully');
      
      // Show remaining tests in a toast if low
      if (testUsage.remaining <= Math.floor(testUsage.limit * 0.3)) {
        toast.info(`You have ${testUsage.remaining} test${testUsage.remaining === 1 ? '' : 's'} remaining in your plan`);
      }
    } catch (error) {
      console.error('Error handling generated problem:', error);
      setError('Failed to add generated problem. Please try again.');
    }
  };

  const handleGenerateNewProblem = async () => {
    try {
      // Check if user can create more tests
      const canCreate = await canUseFeature('test_creation');
      
      if (!canCreate.allowed) {
        toast.error(canCreate.reason || 'You have reached your test creation limit');
        return;
      }
      
      // Show the form to generate a new problem
      setShowGenerateProblemForm(true);
    } catch (error) {
      console.error('Error checking test creation limit:', error);
      toast.error('Failed to check test creation limit. Please try again.');
    }
  };
  
  const handleReorderProblems = async (reorderedProblems: TestProblem[]) => {
    if (!isEditMode || !testSeriesId) return;
    
    try {
      const problemOrder = reorderedProblems.map(p => p.id);
      await updateProblemOrder(testSeriesId, problemOrder);
      setProblems(reorderedProblems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder problems');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditMode ? 'Edit Test Series' : 'Create New Test Series'}
      </h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg mb-6">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter test series title"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter test series description"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  value={estimatedDuration}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setEstimatedDuration(value === '' ? '' : parseInt(value));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="60"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                Make this test series public
              </label>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Test Creation Usage</span>
                <span className="font-medium">
                  {testUsage.used} / {testUsage.limit} tests
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    testUsage.isLimitReached ? 'bg-destructive' : 
                    testUsage.isNearLimit ? 'bg-amber-500' : 'bg-primary'
                  }`}
                  style={{ width: `${testUsage.percentage}%` }}
                />
              </div>
              
              <button 
                type="submit" 
                className="flex items-center justify-center w-full mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting || isFeatureCheckLoading || testUsage.isLimitReached}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {testUsage.isLimitReached ? 'Limit Reached' : 'Create Test Series'}
              </button>
              
              {testUsage.isLimitReached && (
                <div className="mt-2 p-3 bg-destructive/10 text-destructive-foreground text-sm rounded-md flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium">Test creation limit reached</p>
                    <p className="text-xs">
                      You've reached your limit of {testUsage.limit} test creations for your current plan. 
                      <a href="/pricing" className="font-medium underline hover:no-underline">
                        Upgrade now
                      </a> for more.
                    </p>
                  </div>
                </div>
              )}
              
              {testUsage.isNearLimit && !testUsage.isLimitReached && (
                <div className="mt-2 p-3 bg-amber-50 text-amber-900 text-sm rounded-md flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium">Almost there!</p>
                    <p className="text-xs">
                      You have {testUsage.remaining} test creation{testUsage.remaining === 1 ? '' : 's'} left this period.
                      <a href="/pricing" className="font-medium underline hover:no-underline ml-1">
                        Upgrade now
                      </a> for more.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Problems</h2>
            
            <TestProblemList 
              problems={problems}
              onReorder={handleReorderProblems}
            />
            
            {showAddProblemForm ? (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Problem</h3>
                <TestProblemForm 
                  onSubmit={handleAddProblem}
                  onCancel={() => setShowAddProblemForm(false)}
                />
              </div>
            ) : showGenerateProblemForm ? (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Generate New Problem with AI</h3>
                <TestProblemGeneratorForm 
                  testSeriesId={testSeriesId as string}
                  onProblemAdded={handleProblemGenerated}
                  onCancel={() => setShowGenerateProblemForm(false)}
                  onGenerateNewProblem={handleGenerateNewProblem}
                />
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex flex-col space-y-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddProblemForm(true)}
                      className="flex-1 flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Problem Manually
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { allowed, reason } = canUseFeature('test_creation');
                          if (!allowed) {
                            toast.error(reason || 'You have reached your test creation limit for your current plan');
                            return;
                          }
                          setShowGenerateProblemForm(true);
                          console.log('showAddProblemForm:', showAddProblemForm, 'showGenerateProblemForm:', true);
                        } catch (err) {
                          console.error('Error checking test creation limit:', err);
                          // Still allow opening the form if there's an error checking the limit
                          setShowGenerateProblemForm(true);
                          console.log('showAddProblemForm:', showAddProblemForm, 'showGenerateProblemForm:', true);
                        }
                      }}
                      className="flex-1 flex items-center justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isFeatureCheckLoading}
                    >
                      {isFeatureCheckLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Checking...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Problem with AI
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Usage indicator */}
                  {!isEditMode && !isFeatureCheckLoading && (
                    <div className="text-xs text-gray-500 text-center">
                      {(() => {
                        const { remaining, limit } = canUseFeature('test_creation');
                        if (typeof remaining === 'number' && typeof limit === 'number') {
                          return (
                            <span>
                              You can create {remaining} more test{remaining !== 1 ? 's' : ''} with your current plan
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      {/* )} */}
    </div>
  );
}
export default TestSeriesForm;