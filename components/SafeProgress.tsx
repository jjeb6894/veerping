"use client";

import { Component, type ReactNode } from "react";

class ProgressErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Progress UI failed:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function SafeProgress({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProgressErrorBoundary fallback={fallback ?? <SimpleProgressFallback />}>
      {children}
    </ProgressErrorBoundary>
  );
}

function SimpleProgressFallback() {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" />
      <p className="mt-3 text-sm font-medium text-slate-700">Preparing your vehicle preview…</p>
      <p className="mt-1 text-xs text-slate-500">This usually takes a few seconds.</p>
    </div>
  );
}
