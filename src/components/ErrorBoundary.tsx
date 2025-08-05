import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-colors z-50 max-w-sm"
             style={{ 
               backgroundColor: '#1a1a1a', 
               border: '1px solid #ef4444', 
               color: '#ffffff' 
             }}>
          <div className="text-sm font-medium text-red-400 mb-2">
            Debug Panel Error
          </div>
          <div className="text-xs text-gray-400">
            The debug panel encountered an error and couldn't render. Check the console for details.
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="text-xs mt-2 px-2 py-1 rounded transition-colors hover:opacity-80"
            style={{ backgroundColor: '#333333', border: '1px solid #555555' }}
          >
            Reset
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;