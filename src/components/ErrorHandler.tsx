/**
 * Error Handler Component and Utilities
 * Provides comprehensive error handling and display
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorInfo {
  type: 'server' | 'client' | 'network';
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export class ErrorHandler {
  /**
   * Handle API errors and categorize them
   */
  static handleAPIError(error: any, context: string = ''): ErrorInfo {
    const errorTypes: Record<number, string> = {
      401: 'Invalid API key or authentication failed',
      403: 'Insufficient permissions - check API key scopes',
      404: 'Campaign not found',
      429: 'Rate limit exceeded - please wait',
      500: 'Server error - please try again later',
      503: 'Service unavailable - please try again later'
    };

    // Extract status code from error
    const statusCode = error.status || 
                      error.statusCode || 
                      (error.message?.match(/(\d{3})/)?.[1] ? parseInt(error.message.match(/(\d{3})/)[1]) : undefined);
    
    const message = statusCode && errorTypes[statusCode] 
      ? errorTypes[statusCode] 
      : error.message || 'An unexpected error occurred';

    console.error(`${context} Error:`, {
      message,
      statusCode,
      originalError: error
    });

    return {
      type: statusCode && statusCode >= 500 ? 'server' : 
            statusCode ? 'client' : 'network',
      message,
      statusCode,
      retryable: !statusCode || ['429', '500', '503'].includes(statusCode.toString())
    };
  }

  /**
   * Get error component
   */
  static getErrorComponent(error: ErrorInfo, onRetry?: () => void): React.ReactElement {
    return <ErrorDisplay error={error} onRetry={onRetry} />;
  }
}

interface ErrorDisplayProps {
  error: ErrorInfo | string;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  const errorInfo = typeof error === 'string' 
    ? { message: error, type: 'client' as const, retryable: true } 
    : error;

  return (
    <div className="text-center py-12">
      <div 
        className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" 
        style={{ backgroundColor: '#333333' }}
      >
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {errorInfo.type === 'server' ? 'Server Error' : 
         errorInfo.type === 'network' ? 'Connection Error' : 
         'Unable to Load Data'}
      </h3>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">{errorInfo.message}</p>
      {errorInfo.retryable && onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-80 mx-auto"
          style={{ backgroundColor: '#3b82f6', color: 'white' }}
        >
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorDisplay 
          error={{
            message: 'Something went wrong. Please refresh the page.',
            type: 'client',
            retryable: false
          }}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorHandler;