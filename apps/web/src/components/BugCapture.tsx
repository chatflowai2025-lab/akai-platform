'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

declare global {
  interface Window {
    __reportBug?: (description: string, route?: string) => Promise<void>;
  }
}

async function reportBug(payload: {
  error: string;
  componentStack?: string;
  route: string;
  userId?: string;
  description?: string;
  timestamp: string;
}) {
  try {
    await fetch('/api/bugs/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent — never let bug reporting itself crash the app
  }
}

class BugCapture extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const route = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    void reportBug({
      error: error.message,
      componentStack: info.componentStack ?? undefined,
      route,
      timestamp: new Date().toISOString(),
    });
  }

  componentDidMount() {
    if (typeof window !== 'undefined') {
      // Expose global manual bug reporter
      window.__reportBug = async (description: string, route?: string) => {
        await reportBug({
          error: description,
          description,
          route: route ?? window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      };
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      delete window.__reportBug;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111] border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400 mb-2">
              We&apos;ve automatically reported this error. Our team will fix it ASAP.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-5">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl font-bold text-sm hover:opacity-90 transition"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BugCapture;
