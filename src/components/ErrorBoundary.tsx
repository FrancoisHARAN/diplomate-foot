import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur React interceptée par ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="card error-boundary" role="alert">
          <h2>Oups, une erreur est survenue.</h2>
          <p>Un problème React a été détecté. Recharge la page pour continuer les pronostics.</p>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
