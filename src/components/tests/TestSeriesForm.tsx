import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      setSaving(true);
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
      setSaving(false);
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
  
  const handleProblemGenerated = (newProblem: TestProblem) => {
    setProblems([...problems, newProblem]);
    setShowGenerateProblemForm(false);
    setSuccess('Problem added successfully');
  };

  const handleGenerateNewProblem = () => {
    // This will trigger a new generation by resetting the generated problem state in the child.
    // The TestProblemGeneratorForm component itself will handle the actual API call for generation.
    setShowGenerateProblemForm(true); // Ensure the form is visible to trigger generation
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
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Update' : 'Create'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {isEditMode && (
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
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddProblemForm(true)}
                  className="flex items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Problem Manually
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateProblemForm(true)}
                  className="flex items-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Problem with AI
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default TestSeriesForm;