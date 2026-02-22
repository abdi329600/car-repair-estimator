"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ui-error-boundary]", error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-6 text-center">
            <h2 className="text-lg font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-zinc-400 mt-2">Please start over and try again.</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-5 w-full bg-orange-600 text-white py-2.5 rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Start over
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
