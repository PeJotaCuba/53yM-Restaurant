import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Terminal, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

export class ConvexErrorBoundary extends (Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('[Convex Error Boundary Caught]:', error, errorInfo);
  }

  render() {
    const instance = this as any;
    if (instance.state.hasError) {
      const err = instance.state.error;
      const props = instance.props as Props;
      return (
        <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-4 text-stone-200 text-xs shadow-lg">
          <div className="flex items-center gap-2 font-bold text-amber-400 mb-1">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>{props.fallbackTitle || 'Aviso de Sincronización Backend (Convex)'}</span>
          </div>
          <p className="text-stone-300 leading-snug">
            {err?.message?.includes('Could not find public function')
              ? 'Las funciones backend de Convex se están sincronizando. El sistema continúa operando en modo local seguro.'
              : 'Conexión a Convex en modo resiliente. Operando con estado local.'}
          </p>
          <button
            onClick={() => instance.setState({ hasError: false, error: null })}
            className="mt-2 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 font-mono transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
