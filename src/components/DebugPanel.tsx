import React, { useState, useEffect } from 'react';
import { X, Circle, AlertTriangle, Clock, Activity, Check, XCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface DebugInfo {
  timestamp: string;
  environment: string;
  vercel_env: string;
  vercel_url: string;
  api_keys: Record<string, string>;
  api_key_lengths: Record<string, number>;
  // SECURITY: Environment variable fields removed for production safety
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
    // Only auto-run tests if modal is visible AND in development
    // SECURITY: Never auto-run in production to avoid exposing sensitive data
    if (isVisible && import.meta.env.DEV && testResults.length === 0) {
      runTests().catch(error => {
        console.error('Auto-run tests failed:', error);
        setHasError(true);
        setIsLoading(false);
      });
    }
  }, [isVisible]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isVisible]);

  // SECURITY: Only show debug panel in development or with explicit production flag
  const isProduction = import.meta.env.PROD;
  const allowProductionDebug = import.meta.env.VITE_ALLOW_PRODUCTION_DEBUG === 'true';
  
  if (isProduction && !allowProductionDebug) {
    return null; // Hide debug panel completely in production
  }

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
      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 50 }}>
        <div 
          className="rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" 
          style={{ 
            backgroundColor: '#0f0f0f', 
            border: '1px solid #222222'
          }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <Activity size={20} style={{ color: '#cccccc' }} />
                <h2 className="text-xl font-medium" style={{ color: '#ffffff' }}>System Diagnostics</h2>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1.5 rounded transition-all duration-200 hover:opacity-70"
                style={{ backgroundColor: '#222222' }}
              >
                <X size={16} style={{ color: '#cccccc' }} />
              </button>
            </div>

          <div className="space-y-6">
            {/* API Tests Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-medium" style={{ color: '#cccccc' }}>API Connectivity</h3>
                <button
                  onClick={runTests}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#222222', border: '1px solid #333333', color: '#cccccc' }}
                >
                  {isLoading ? (
                    <>
                      <Clock size={14} className="animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={14} />
                      <span>Run Tests</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                {testResults.length === 0 ? (
                  <div className="p-3 rounded text-center" style={{ backgroundColor: '#1a1a1a', border: '1px solid #222222' }}>
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <Clock size={16} style={{ color: '#666666' }} />
                      <span className="text-sm" style={{ color: '#888888' }}>Ready to run diagnostics</span>
                    </div>
                    <p className="text-xs" style={{ color: '#666666' }}>
                      Click "Run Tests" to check connectivity
                    </p>
                  </div>
                ) : (
                  testResults.map((test, index) => (
                    <div
                      key={index}
                      className="p-3 rounded"
                      style={{
                        backgroundColor: test.status === 'success' ? '#1a1a1a' : test.status === 'error' ? '#1a1a1a' : '#1a1a1a',
                        border: `1px solid ${test.status === 'success' ? '#444444' : test.status === 'error' ? '#333333' : '#222222'}`
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0 mt-0.5">
                            {test.status === 'success' ? (
                              <Circle size={14} style={{ color: '#888888' }} />
                            ) : test.status === 'error' ? (
                              <AlertTriangle size={14} style={{ color: '#999999' }} />
                            ) : (
                              <Clock size={14} style={{ color: '#666666' }} />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm mb-1" style={{ 
                              color: test.status === 'success' ? '#cccccc' : test.status === 'error' ? '#cccccc' : '#888888' 
                            }}>
                              {test.name}
                            </div>
                            <div className="text-xs" style={{ color: '#888888' }}>{test.message}</div>
                          </div>
                        </div>
                        {test.duration && (
                          <div className="text-xs px-1.5 py-0.5 rounded" style={{ 
                            color: '#666666', 
                            backgroundColor: '#222222' 
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
                <h3 className="text-base font-medium mb-4" style={{ color: '#cccccc' }}>System Environment</h3>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #222222' }}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div style={{ color: '#888888' }}>
                      <strong style={{ color: '#cccccc' }}>Environment:</strong> {debugInfo.environment}
                    </div>
                    <div style={{ color: '#888888' }}>
                      <strong style={{ color: '#cccccc' }}>Vercel Env:</strong> {debugInfo.vercel_env}
                    </div>
                    <div style={{ color: '#888888' }}>
                      <strong style={{ color: '#cccccc' }}>Timestamp:</strong> {new Date(debugInfo.timestamp).toLocaleString()}
                    </div>
                    <div style={{ color: '#888888' }}>
                      <strong style={{ color: '#cccccc' }}>URL:</strong> {debugInfo.vercel_url}
                    </div>
                  </div>

                  <div className="mb-4">
                    <strong style={{ color: '#cccccc' }}>API Keys Status:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(debugInfo.api_keys).map(([key, status]) => {
                        const isPresent = status.includes('Present') || status.includes('✅');
                        return (
                          <div key={key} className="flex items-center space-x-2 text-sm p-2 rounded" style={{ 
                            backgroundColor: '#222222',
                            border: `1px solid ${isPresent ? '#444444' : '#333333'}`
                          }}>
                            {isPresent ? (
                              <Check size={12} style={{ color: '#10b981' }} />
                            ) : (
                              <XCircle size={12} style={{ color: '#ef4444' }} />
                            )}
                            <span className="font-medium" style={{ color: '#cccccc' }}>{key}</span>
                            <span style={{ color: isPresent ? '#10b981' : '#ef4444', fontSize: '11px' }}>
                              {isPresent ? 'Present' : 'Missing'}
                            </span>
                          </div>
                        );
                      })}
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