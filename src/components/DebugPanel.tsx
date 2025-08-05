import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface DebugInfo {
  timestamp: string;
  environment: string;
  vercel_env: string;
  vercel_url: string;
  api_keys: Record<string, string>;
  api_key_lengths: Record<string, number>;
  all_env_vars?: Array<{
    key: string;
    length: number;
    preview: string;
  }>;
  server_env_vars?: Array<{
    key: string;
    length: number;
    preview: string;
  }>;
  frontend_env_vars?: Array<{
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
  const [hasError, setHasError] = useState(false);

  const runTests = async () => {
    try {
      console.log('🧪 Starting debug tests...');
      setHasError(false);
      setIsLoading(true);
      const results: TestResult[] = [];
    
      // Reset debug info to avoid stale data
      setDebugInfo(null);

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
      console.log('🧪 Debug tests completed:', results.length, 'tests');
    } catch (error) {
      console.error('❌ Debug tests failed with error:', error);
      setHasError(true);
      setIsLoading(false);
      setTestResults([{
        name: 'Debug Tests',
        status: 'error',
        message: `Failed to run tests: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    }
  };

  useEffect(() => {
    // Only auto-run tests if modal is visible to avoid background API calls
    // This prevents API calls from interfering with component rendering
    if (isVisible && import.meta.env.DEV && testResults.length === 0) {
      runTests().catch(error => {
        console.error('Auto-run tests failed:', error);
        setHasError(true);
        setIsLoading(false);
      });
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => {
          console.log('Debug panel button clicked');
          setIsVisible(true);
        }}
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

  console.log('🔧 Rendering debug panel modal, isVisible:', isVisible, 'testResults:', testResults.length, 'debugInfo:', !!debugInfo);
  
  try {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 50 }}>
        <div 
          className="rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto" 
          style={{ 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #333333'
          }}
        >
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <Zap size={24} style={{ color: '#ffffff' }} />
                <h2 className="text-2xl font-semibold" style={{ color: '#ffffff' }}>System Diagnostics</h2>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 rounded-lg transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555' }}
              >
                <X size={20} style={{ color: '#ffffff' }} />
              </button>
            </div>

          <div className="space-y-8">
            {/* API Tests Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium" style={{ color: '#ffffff' }}>API Connectivity Tests</h3>
                <button
                  onClick={runTests}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
                >
                  {isLoading ? (
                    <>
                      <Clock size={16} className="animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>Run Tests</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {testResults.length === 0 ? (
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Clock size={18} style={{ color: '#888888' }} />
                      <span style={{ color: '#cccccc' }}>Ready to run diagnostics</span>
                    </div>
                    <p className="text-sm" style={{ color: '#888888' }}>
                      Click "Run Tests" to check API connectivity and system status
                    </p>
                  </div>
                ) : (
                  testResults.map((test, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: test.status === 'success' ? '#0f1a0f' : test.status === 'error' ? '#1a0f0f' : '#0f0f0f',
                        border: `1px solid ${test.status === 'success' ? '#10b981' : test.status === 'error' ? '#ef4444' : '#333333'}`
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {test.status === 'success' ? (
                              <CheckCircle size={18} style={{ color: '#10b981' }} />
                            ) : test.status === 'error' ? (
                              <AlertCircle size={18} style={{ color: '#ef4444' }} />
                            ) : (
                              <Clock size={18} style={{ color: '#888888' }} />
                            )}
                          </div>
                          <div>
                            <div className="font-medium mb-1" style={{ 
                              color: test.status === 'success' ? '#10b981' : test.status === 'error' ? '#ef4444' : '#ffffff' 
                            }}>
                              {test.name}
                            </div>
                            <div className="text-sm" style={{ color: '#cccccc' }}>{test.message}</div>
                          </div>
                        </div>
                        {test.duration && (
                          <div className="text-xs px-2 py-1 rounded" style={{ 
                            color: '#888888', 
                            backgroundColor: '#333333' 
                          }}>
                            {test.duration}ms
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Environment Information */}
            {debugInfo && (
              <div>
                <h3 className="text-lg font-medium mb-6" style={{ color: '#ffffff' }}>System Environment</h3>
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
                    {debugInfo.all_env_vars ? (
                      <>
                        <strong style={{ color: '#ffffff' }}>Environment Variables ({debugInfo.all_env_vars.length}):</strong>
                        <div className="max-h-40 overflow-auto mt-2">
                          {debugInfo.all_env_vars.map((envVar, index) => (
                            <div key={index} className="text-xs py-1" style={{ color: '#888888' }}>
                              <strong style={{ color: '#cccccc' }}>{envVar.key}:</strong> {envVar.preview} (length: {envVar.length})
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <strong style={{ color: '#ffffff' }}>Environment Variables:</strong>
                        {debugInfo.server_env_vars && (
                          <div className="mt-2">
                            <div className="text-sm font-medium" style={{ color: '#cccccc' }}>Server Variables ({debugInfo.server_env_vars.length}):</div>
                            <div className="max-h-32 overflow-auto mt-1">
                              {debugInfo.server_env_vars.map((envVar, index) => (
                                <div key={index} className="text-xs py-1" style={{ color: '#888888' }}>
                                  <strong style={{ color: '#cccccc' }}>{envVar.key}:</strong> {envVar.preview} (length: {envVar.length})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {debugInfo.frontend_env_vars && (
                          <div className="mt-2">
                            <div className="text-sm font-medium" style={{ color: '#cccccc' }}>Frontend Variables ({debugInfo.frontend_env_vars.length}):</div>
                            <div className="max-h-32 overflow-auto mt-1">
                              {debugInfo.frontend_env_vars.map((envVar, index) => (
                                <div key={index} className="text-xs py-1" style={{ color: '#888888' }}>
                                  <strong style={{ color: '#cccccc' }}>{envVar.key}:</strong> {envVar.preview} (length: {envVar.length})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    console.error('DebugPanel render error:', error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="rounded-lg shadow-xl max-w-md w-full" style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4444' }}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#ef4444' }}>Debug Panel Error</h2>
              <button
                onClick={() => setIsVisible(false)}
                className="text-xl transition-colors hover:opacity-80"
                style={{ color: '#888888' }}
              >
                ✕
              </button>
            </div>
            <div className="text-sm" style={{ color: '#cccccc' }}>
              An error occurred while rendering the debug panel:
            </div>
            <div className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: '#2a1a1a', color: '#ff6b6b' }}>
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }
};