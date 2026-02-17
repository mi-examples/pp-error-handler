import { Component, type ReactNode } from 'react';
import type React from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback: ReactNode | null;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError(error, errorInfo);
  }

  resetErrorBoundary(): void {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
