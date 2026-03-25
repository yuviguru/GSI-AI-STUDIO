'use client';

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4">
          <div className="text-center">
            <p className="mb-2 text-4xl">😵</p>
            <h2 className="mb-2 font-display text-xl font-bold text-gray-800">
              Oops! Something went wrong
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Don&apos;t worry, just try refreshing the page.
            </p>
            <button
              onClick={this.handleRetry}
              className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
