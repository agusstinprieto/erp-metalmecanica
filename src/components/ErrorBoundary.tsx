import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ERP] Unhandled error:', error, info);
    
    // Auto-reload on chunk load failures to fetch new production assets seamlessly
    const isChunkError = error.message && (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Expected a JavaScript-or-Wasm module script') ||
      error.message.includes('chunk') ||
      error.message.includes('MIME type of "text/html"')
    );
    if (isChunkError) {
      if (!sessionStorage.getItem('erp_chunk_reload')) {
        sessionStorage.setItem('erp_chunk_reload', '1');
        console.warn('[ErrorBoundary] Chunk load failed. Force reloading for new assets...');
        window.location.reload();
        return;
      }
      // Second consecutive chunk error — don't loop, fall through to error UI
      sessionStorage.removeItem('erp_chunk_reload');
    }
    
    Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[999]">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-400" size={28} />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-red-400 mb-2">Error del Sistema</p>
            <h1 className="text-xl font-black text-white uppercase tracking-tight mb-3">Algo salió mal</h1>
            <p className="text-[11px] text-slate-500 mb-1 leading-relaxed">
              {this.state.error?.message ?? 'Error inesperado en la aplicación.'}
            </p>
            <p className="text-[10px] text-slate-700 mb-8">
              El error ha sido registrado. Contacta soporte si persiste.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  // For chunk errors, a full reload is needed to get new asset URLs
                  const isChunk = this.state.error?.message?.includes('Failed to fetch') ||
                    this.state.error?.message?.includes('MIME type') ||
                    this.state.error?.message?.includes('chunk');
                  if (isChunk) {
                    sessionStorage.removeItem('erp_chunk_reload');
                    sessionStorage.removeItem('__chunk_reload');
                    window.location.reload();
                  } else {
                    this.setState({ hasError: false, error: null });
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-mcvill-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
              >
                <RefreshCw size={12} />
                Reintentar
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-4 py-2 border border-white/10 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                <Home size={12} />
                Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
