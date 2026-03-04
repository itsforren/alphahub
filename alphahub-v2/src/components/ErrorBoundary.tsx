import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '2rem', color: '#ef4444', fontFamily: 'monospace' }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', background: '#1a1a2e', padding: '1rem', borderRadius: '0.5rem' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
