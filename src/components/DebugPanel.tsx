import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

interface DebugInfo {
  timestamp: string;
  environment: string;
  vercel_env: string;
  vercel_url: string;
  api_keys: Record<string, string>;
  api_key_lengths: Record<string, number>;
  all_env_vars: Array<{
    key: string;
    length: number;
    preview: string;
  }>;
}

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  duration?: number;
}

export const DebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: TestResult[] = [];

    // Test 1: Environment Debug
    try {
      const start = Date.now();
      const result = await apiClient.debugEnvironment();
      const duration = Date.now() - start;
      
      if (result.error) {
        results.push({
          name: 'Environment Debug',
          status: 'error',
          message: result.error,
          duration
        });
      } else {
        setDebugInfo(result.data);
        results.push({
          name: 'Environment Debug',
          status: 'success',
          message: `Environment loaded successfully`,
          duration
        });
      }
    } catch (error) {
      results.push({
        name: 'Environment Debug',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: HeyReach Authentication
    try {
      const start = Date.now();
      const result = await apiClient.heyreach('/auth');
      const duration = Date.now() - start;
      
      results.push({
        name: 'HeyReach Auth',
        status: result.error ? 'error' : 'success',
        message: result.error || 'Authentication successful',
        duration
      });
    } catch (error) {
      results.push({
        name: 'HeyReach Auth',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Instantly Campaigns
    try {
      const start = Date.now();
      const result = await apiClient.instantly('/campaigns');
      const duration = Date.now() - start;
      
      results.push({
        name: 'Instantly Campaigns',
        status: result.error ? 'error' : 'success',
        message: result.error || `Fetched ${result.data?.items?.length || 0} campaigns`,
        duration
      });
    } catch (error) {
      results.push({
        name: 'Instantly Campaigns',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: HeyReach Accounts
    try {
      const start = Date.now();
      const result = await apiClient.heyreach('/accounts');
      const duration = Date.now() - start;
      
      results.push({
        name: 'HeyReach Accounts',
        status: result.error ? 'error' : 'success',
        message: result.error || `Fetched ${result.data?.items?.length || 0} accounts`,
        duration
      });
    } catch (error) {
      results.push({
        name: 'HeyReach Accounts',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  useEffect(() => {
    // Auto-run tests on mount in development
    if (import.meta.env.DEV) {
      runTests();
    }
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="Show Debug Panel"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Debug Panel</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Test Results */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">API Tests</h3>
                <button
                  onClick={runTests}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '🔄 Testing...' : '🧪 Run Tests'}
                </button>
              </div>

              <div className="grid gap-3">
                {testResults.map((test, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      test.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : test.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-800">
                          {test.status === 'success' ? '✅' : test.status === 'error' ? '❌' : '⏳'} {test.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{test.message}</div>
                      </div>
                      {test.duration && (
                        <div className="text-xs text-gray-500">{test.duration}ms</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Environment Info */}
            {debugInfo && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Environment Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <strong>Environment:</strong> {debugInfo.environment}
                    </div>
                    <div>
                      <strong>Vercel Env:</strong> {debugInfo.vercel_env}
                    </div>
                    <div>
                      <strong>Timestamp:</strong> {new Date(debugInfo.timestamp).toLocaleString()}
                    </div>
                    <div>
                      <strong>URL:</strong> {debugInfo.vercel_url}
                    </div>
                  </div>

                  <div className="mb-4">
                    <strong>API Keys Status:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(debugInfo.api_keys).map(([key, status]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span> {status}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <strong>Environment Variables ({debugInfo.all_env_vars.length}):</strong>
                    <div className="max-h-40 overflow-auto mt-2">
                      {debugInfo.all_env_vars.map((envVar, index) => (
                        <div key={index} className="text-xs text-gray-600 py-1">
                          <strong>{envVar.key}:</strong> {envVar.preview} (length: {envVar.length})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};