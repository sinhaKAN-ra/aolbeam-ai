import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TestSeries } from '@/types';
import { fetchTestSeries, deleteTestSeries } from '@/services/testSeriesService';
import { useAuth } from '@/contexts/AuthContext';

const TestSeriesList: React.FC = () => {
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testSeriesToDelete, setTestSeriesToDelete] = useState<TestSeries | null>(null);
  
  const router = useRouter();
  const { user } = useAuth();

  const tabs = [
    { label: 'Created by me', value: 0 },
    { label: 'Shared with me', value: 1 },
    { label: 'Public', value: 2 }
  ];

  useEffect(() => {
    loadTestSeries();
  }, [tabValue]);

  const loadTestSeries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let filter = {};
      if (tabValue === 0) {
        filter = { createdOnly: true };
      } else if (tabValue === 1) {
        filter = { sharedOnly: true };
      } else if (tabValue === 2) {
        filter = { publicOnly: true };
      }
      
      const data = await fetchTestSeries(filter);
      setTestSeries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test series');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateNew = () => {
    router.push('/tests/create');
  };

  const handleEdit = (id: string) => {
    router.push(`/tests/edit/${id}`);
  };

  const handleTakeTest = (id: string) => {
    router.push(`/tests/take/${id}`);
  };

  const handleViewAttempts = (id: string) => {
    router.push(`/tests/attempts?test_series_id=${id}`);
  };

  const confirmDelete = (testSeries: TestSeries) => {
    setTestSeriesToDelete(testSeries);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!testSeriesToDelete) return;
    
    try {
      await deleteTestSeries(testSeriesToDelete.id);
      // Refresh the list
      await loadTestSeries();
      setDeleteDialogOpen(false);
      setTestSeriesToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test series');
    }
  };

  const getCurrentUserId = () => {
    // Get user ID from the auth context
    return user?.id || null;
  };

  const renderTestSeriesList = () => {
    if (loading) {
      return (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTestSeries}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!testSeries || testSeries.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            {tabValue === 0 ? "You haven't created any test series yet." :
             tabValue === 1 ? "No test series have been shared with you." :
             "No public test series found."}
          </p>
          {(tabValue === 0) && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Test Series
            </button>
          )}
        </div>
      );
    }

    // Debug: Log creator_id and current user ID for each series
    testSeries.forEach(series => {
      console.log('Series ID:', series.id, 'Title:', series.title);
      console.log('  - series.creator_id:', series.creator_id);
      console.log('  - getCurrentUserId():', getCurrentUserId());
      console.log('  - Is creator?', series.creator_id === getCurrentUserId() ? 'Yes' : 'No');
    });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mt-6 p-2">
  {testSeries.map((series) => (
    <div key={series.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <div className="px-5 pt-5 pb-3 flex-grow">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight pr-2">
            {series.title}
          </h3>
          {(tabValue === 0 || tabValue === 1) && series.creator_id === getCurrentUserId() && (
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <button
                onClick={() => handleEdit(series.id)}
                className="p-1.5 text-gray-500 hover:text-orange-700 hover:bg-orange-100 rounded-lg transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828L17.586 3.586z" />
                </svg>
              </button>
              
              <button
                onClick={() => confirmDelete(series)}
                className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Status and Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            series.is_public 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              series.is_public ? 'bg-green-500' : 'bg-gray-500'
            }`}></span>
            {series.is_public ? 'Public' : 'Private'}
          </span>
          {series.tags && series.tags.length > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {series.tags[0]}
            </span>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {series.description ? 
            (series.description.length > 120 
              ? `${series.description.substring(0, 120)}...` 
              : series.description)
            : 'No description available'}
        </p>
        
        {/* Duration */}
        <div className="flex items-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Duration: {series.estimated_duration_minutes || 'N/A'} min</span>
        </div>
      </div>
      
      {/* Action Buttons Section */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Primary Action - Take Test */}
          <button
            onClick={() => handleTakeTest(series.id)}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Start Test</span>
            <span className="sm:hidden">Start</span>
          </button>
          
          {/* Secondary Action - View Attempts */}
          <button
            onClick={() => handleViewAttempts(series.id)}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">View Attempts</span>
            <span className="sm:hidden">Attempts</span>
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Test Series</h1>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New
        </button>
      </div>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                tabValue === tab.value
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {renderTestSeriesList()}
      
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Test Series?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete "{testSeriesToDelete?.title}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSeriesList;