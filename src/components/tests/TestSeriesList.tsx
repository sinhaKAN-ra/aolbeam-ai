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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedTestSeries, setSelectedTestSeries] = useState<TestSeries | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  const tabs = [
    { label: 'Created by me', value: 0 },
    { label: 'Shared with me', value: 1 },
    { label: 'Public', value: 2 },
  ];

  useEffect(() => {
    loadTestSeries();
  }, [tabValue, user]);

  const loadTestSeries = async () => {
    if (!user) {
      setLoading(false);
      setError('You must be logged in to view test series.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let filter = {};
      if (tabValue === 0) {
        filter = { createdOnly: true };
      } else if (tabValue === 1) {
        filter = { sharedOnly: true };
      } else {
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

  const handleTabChange = (newValue: number) => setTabValue(newValue);

  const handleCreateNew = () => router.push('/tests/create');

  const handleEdit = (id: string) => router.push(`/tests/edit/${id}`);

  const handleTakeTest = (id: string) => router.push(`/tests/take/${id}`);

  const handleViewAttempts = (id: string) => router.push(`/tests/attempts?test_series_id=${id}`);

  const confirmDelete = (testSeries: TestSeries) => {
    setTestSeriesToDelete(testSeries);
    setDeleteDialogOpen(true);
  };

  const handleShare = (series: TestSeries) => {
    setSelectedTestSeries(series);
    setShareEmail('');
    setShareMessage(null);
    setIsShareModalOpen(true);
  };

  const handleShareSubmit = async () => {
    if (!selectedTestSeries || !shareEmail) {
      setShareMessage('Please enter a recipient email.');
      return;
    }
    setIsSharing(true);
    setShareMessage(null);
    try {
      const response = await fetch('/api/test-series/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSeriesId: selectedTestSeries.id,
          recipientEmail: shareEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to share.');
      setShareMessage(`Successfully shared with ${shareEmail}.`);
      setTimeout(() => {
        setIsShareModalOpen(false);
        if (tabValue === 1) loadTestSeries();
      }, 2000);
    } catch (error: any) {
      setShareMessage(`Failed to share: ${error.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!testSeriesToDelete) return;
    try {
      await deleteTestSeries(testSeriesToDelete.id);
      await loadTestSeries();
      setDeleteDialogOpen(false);
      setTestSeriesToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test series');
    }
  };

  const getCurrentUserId = () => user?.id || null;

  const renderTestSeriesList = () => {
    if (loading) {
      return (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTestSeries}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (testSeries.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            {
              { 
                0: "You haven't created any tests yet.",
                1: 'No tests have been shared with you.',
                2: 'No public tests found.',
              }[tabValue]
            }
          </p>
          {tabValue === 0 && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Test
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {testSeries.map((series) => (
          <div key={series.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all flex flex-col">
            <div className="px-5 pt-5 pb-3 flex-grow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-2">
                  {series.title}
                </h3>
                {series.creator_id === getCurrentUserId() && (
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button onClick={() => handleShare(series)} className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-100 rounded-lg" title="Share">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                    </button>
                    <button onClick={() => handleEdit(series.id)} className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-100 rounded-lg" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828L17.586 3.586z" /></svg>
                    </button>
                    <button onClick={() => confirmDelete(series)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-lg" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${series.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${series.is_public ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  {series.is_public ? 'Public' : 'Private'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {series.description || 'No description available.'}
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Duration: {series.estimated_duration_minutes || 'N/A'} min</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t mt-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => handleTakeTest(series.id)} className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Start Test</span>
                </button>
                <button onClick={() => handleViewAttempts(series.id)} className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>View Attempts</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Tests</h1>
        <button
          onClick={handleCreateNew}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Test
        </button>
      </div>

      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
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

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold">Confirm Deletion</h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete "{testSeriesToDelete?.title}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setDeleteDialogOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isShareModalOpen && selectedTestSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold">Share "{selectedTestSeries.title}"</h2>
            <div className="mt-4">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Recipient's email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            {shareMessage && <p className={`mt-2 text-sm ${shareMessage.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>{shareMessage}</p>}
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setIsShareModalOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={handleShareSubmit} disabled={isSharing} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300">
                {isSharing ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSeriesList;


 