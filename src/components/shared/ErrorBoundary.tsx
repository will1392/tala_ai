import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Send error to monitoring service (if configured)
    this.reportError(error, errorInfo);
  }

  reportError(error: Error, errorInfo: ErrorInfo) {
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      // Send to backend error logging endpoint
      fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => {
        console.error('Failed to report error:', err);
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, errorInfo, showDetails, errorCount } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Something went wrong
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      We encountered an unexpected error. The issue has been logged and we'll look into it.
                    </p>
                    {errorCount > 1 && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        This error has occurred {errorCount} times
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Details (Development only or toggle) */}
              {(isDevelopment || showDetails) && error && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Error Message
                      </h3>
                      <div className="bg-red-50 dark:bg-red-900/10 rounded p-3">
                        <code className="text-xs text-red-800 dark:text-red-300">
                          {error.message}
                        </code>
                      </div>
                    </div>

                    {showDetails && error.stack && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Stack Trace
                        </h3>
                        <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-x-auto">
                          <pre className="text-xs text-gray-700 dark:text-gray-300">
                            {error.stack}
                          </pre>
                        </div>
                      </div>
                    )}

                    {showDetails && errorInfo?.componentStack && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Component Stack
                        </h3>
                        <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-x-auto">
                          <pre className="text-xs text-gray-700 dark:text-gray-300">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={this.handleReset}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  
                  <Button
                    onClick={this.handleReload}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  
                  <Button
                    onClick={this.handleGoHome}
                    variant="ghost"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>

                  {isDevelopment && (
                    <Button
                      onClick={this.toggleDetails}
                      variant="ghost"
                      size="sm"
                      className="ml-auto flex items-center gap-1"
                    >
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform ${
                          showDetails ? 'rotate-180' : ''
                        }`} 
                      />
                      {showDetails ? 'Hide' : 'Show'} Details
                    </Button>
                  )}
                </div>

                {/* Help Text */}
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <p>If this problem persists, please contact support with the following:</p>
                  <ul className="mt-1 list-disc list-inside">
                    <li>Time: {new Date().toLocaleString()}</li>
                    <li>Page: {window.location.pathname}</li>
                    {error && <li>Error: {error.name}</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Boundary for handling async errors
 */
export const AsyncErrorBoundary: React.FC<Props> = ({ children, ...props }) => {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // You could trigger error boundary here if needed
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <ErrorBoundary {...props}>{children}</ErrorBoundary>;
};

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundary;