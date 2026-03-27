'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AKAI ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-3xl">
              ⚡
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white">Something went wrong</h1>
              <p className="text-white/40 text-sm leading-relaxed">
                AK is on it. This was unexpected — refreshing usually fixes it.
              </p>
            </div>

            {/* Error detail (dev helper) */}
            {this.state.error?.message && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 text-left">
                <p className="text-xs text-white/30 font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Refresh CTA */}
            <button
              onClick={this.handleRefresh}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-95"
            >
              🔄 Refresh
            </button>

            {/* Support link */}
            <p className="text-white/20 text-xs">
              Still broken?{' '}
              <a href="mailto:hello@getakai.ai" className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors">
                Contact support →
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
