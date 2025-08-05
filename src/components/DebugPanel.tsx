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
        className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-colors z-50"
        style={{ 
          backgroundColor: '#333333', 
          border: '1px solid #555555', 
          color: '#ffffff' 
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#444444';
          e.currentTarget.style.borderColor = '#666666';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#333333';
          e.currentTarget.style.borderColor = '#555555';
        }}
        title="Show Debug Panel"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>🔧 Debug Panel</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-xl transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Test Results */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>API Tests</h3>
                <button
                  onClick={runTests}
                  disabled={isLoading}
                  className="px-4 py-2 rounded transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
                >
                  {isLoading ? '🔄 Testing...' : '🧪 Run Tests'}
                </button>
              </div>

              <div className="grid gap-3">
                {testResults.length === 0 ? (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="text-center" style={{ color: '#cccccc' }}>
                      No tests have been run yet. Click the "🧪 Run Tests" button to start API diagnostics.
                    </div>
                  </div>
                ) : (
                  testResults.map((test, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: test.status === 'success' ? '#0f1a0f' : test.status === 'error' ? '#1a0f0f' : '#0f0f0f',
                        border: `1px solid ${test.status === 'success' ? '#10b981' : test.status === 'error' ? '#ef4444' : '#333333'}`
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium" style={{ 
                            color: test.status === 'success' ? '#10b981' : test.status === 'error' ? '#ef4444' : '#ffffff' 
                          }}>
                            {test.status === 'success' ? '✅' : test.status === 'error' ? '❌' : '⏳'} {test.name}
                          </div>
                          <div className="text-sm mt-1" style={{ color: '#cccccc' }}>{test.message}</div>
                        </div>
                        {test.duration && (
                          <div className="text-xs" style={{ color: '#888888' }}>{test.duration}ms</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Environment Info */}
            {debugInfo && (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#ffffff' }}>Environment Information</h3>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div style={{ color: '#cccccc' }}>
                      <strong style={{ color: '#ffffff' }}>Environment:</strong> {debugInfo.environment}
                    </div>
                    <div style={{ color: '#cccccc' }}>
                      <strong style={{ color: '#ffffff' }}>Vercel Env:</strong> {debugInfo.vercel_env}
                    </div>
                    <div style={{ color: '#cccccc' }}>
                      <strong style={{ color: '#ffffff' }}>Timestamp:</strong> {new Date(debugInfo.timestamp).toLocaleString()}
                    </div>
                    <div style={{ color: '#cccccc' }}>
                      <strong style={{ color: '#ffffff' }}>URL:</strong> {debugInfo.vercel_url}
                    </div>
                  </div>

                  <div className="mb-4">
                    <strong style={{ color: '#ffffff' }}>API Keys Status:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(debugInfo.api_keys).map(([key, status]) => (
                        <div key={key} className="text-sm" style={{ color: '#cccccc' }}>
                          <span className="font-medium" style={{ color: '#ffffff' }}>{key}:</span> {status}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <strong style={{ color: '#ffffff' }}>Environment Variables ({debugInfo.all_env_vars.length}):</strong>
                    <div className="max-h-40 overflow-auto mt-2">
                      {debugInfo.all_env_vars.map((envVar, index) => (
                        <div key={index} className="text-xs py-1" style={{ color: '#888888' }}>
                          <strong style={{ color: '#cccccc' }}>{envVar.key}:</strong> {envVar.preview} (length: {envVar.length})
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