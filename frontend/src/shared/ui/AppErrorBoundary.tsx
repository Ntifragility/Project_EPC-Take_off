import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRITICAL UNCAUGHT ERROR in application tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    if (window.confirm('¿Deseas restaurar la caché local y recargar? Tus datos en Supabase están seguros.')) {
      try {
        sessionStorage.clear();
      } catch {}
      window.location.reload();
    }
  };

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.name} - ${error?.message}\n\nStack:\n${error?.stack || ''}\n\nComponent Stack:\n${errorInfo?.componentStack || ''}`;
    void navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      const { error, copied } = this.state;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f1117',
            color: '#f3f4f6',
            padding: '24px',
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
          }}
        >
          <div
            style={{
              maxWidth: '620px',
              width: '100%',
              backgroundColor: '#181b26',
              border: '1px solid #2e3548',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444'
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '19px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Se ha producido un error inesperado
                </h1>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                  La aplicación ha interceptado el error para proteger el estado de tus datos.
                </p>
              </div>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: '#0c0e14',
                  border: '1px solid #252a3a',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  margin: '18px 0',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '12px',
                  color: '#f87171',
                  overflowX: 'auto',
                  lineHeight: 1.4
                }}
              >
                <strong>{error.name}:</strong> {error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '24px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} /> Recargar Aplicación
              </button>

              <button
                type="button"
                onClick={this.handleCopyDetails}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#262c3e',
                  color: '#d1d5db',
                  border: '1px solid #374151',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                {copied ? 'Copiado' : 'Copiar Diagnóstico'}
              </button>

              <button
                type="button"
                onClick={this.handleResetState}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid #374151',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                <Trash2 size={15} /> Restaurar Caché
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
