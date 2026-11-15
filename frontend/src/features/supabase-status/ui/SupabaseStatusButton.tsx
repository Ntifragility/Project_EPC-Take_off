import React, { useState, useEffect } from 'react';
import { testSupabaseHealth, SupabaseHealthReport } from '../../../shared/api/supabaseHealth';
import { SupabaseHealthModal } from './SupabaseHealthModal';

export const SupabaseStatusButton: React.FC = () => {
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    testSupabaseHealth().then(res => {
      if (mounted) setReport(res);
    });

    // Check periodically every 60 seconds
    const interval = setInterval(() => {
      testSupabaseHealth().then(res => {
        if (mounted) setReport(res);
      });
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isLoading = report === null;
  const isOnline = report?.status === 'connected';
  const isBlocked = report?.status === 'network_blocked';

  const dotColor = isLoading ? '#9ca3af' : isOnline ? '#22c55e' : isBlocked ? '#f59e0b' : '#ef4444';
  const labelText = isLoading
    ? 'Verificando...'
    : isOnline
      ? 'Online'
      : isBlocked
        ? 'Red Bloqueada'
        : 'Con Restricción';

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="Ver diagnóstico de conexión con Base de Datos"
        aria-label="Estado de conexión con Base de Datos"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          padding: '4px 8px',
          fontSize: '11px',
          fontFamily: 'var(--mo)',
          color: '#ffffff',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: dotColor,
            display: 'inline-block'
          }}
        />
        <span>Base de Datos: {labelText}</span>
      </button>

      {modalOpen && (
        <SupabaseHealthModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            // Refresh report after modal closes
            testSupabaseHealth().then(setReport);
          }}
        />
      )}
    </>
  );
};
