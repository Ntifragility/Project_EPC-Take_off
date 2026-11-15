import React, { useState, useEffect } from 'react';
import { testSupabaseHealth, SupabaseHealthReport } from '../../../shared/api/supabaseHealth';
import { ModalShell } from '../../../shared/ui/ModalShell';

interface SupabaseHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseHealthModal: React.FC<SupabaseHealthModalProps> = ({
  isOpen,
  onClose
}) => {
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async () => {
    setIsTesting(true);
    try {
      const res = await testSupabaseHealth();
      setReport(res);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = report?.status === 'connected';
  const isBlocked = report?.status === 'network_blocked';

  const statusColors = isTesting
    ? { bg: 'var(--s1)', border: 'var(--b1)', text: 'var(--tx)' }
    : isConnected
      ? { bg: 'rgba(16, 124, 65, 0.08)', border: 'rgba(16, 124, 65, 0.35)', text: '#107c41' }
      : isBlocked
        ? { bg: '#fef7e0', border: '#f6c344', text: '#9a5b00' }
        : { bg: '#fce8e6', border: '#f2b8b5', text: '#b3261e' };

  return (
    <ModalShell
      title="Estado de Conexión con Base de Datos"
      subtitle="Diagnóstico de conectividad, permisos de lectura y validación de actualizaciones"
      onClose={onClose}
      maxWidth="780px"
    >
      <div className="modal-body prompt" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status Summary Banner */}
        <div
          style={{
            background: statusColors.bg,
            border: `1px solid ${statusColors.border}`,
            borderRadius: '3px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '12px',
                color: statusColors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {isTesting
                ? 'Verificando conectividad y permisos...'
                : report?.diagnosticTitle || 'Verificando...'}
            </span>
            {!isTesting && report?.latencyMs !== null && report?.latencyMs !== undefined && (
              <span
                style={{
                  fontFamily: 'var(--mo)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: statusColors.text,
                  background: 'rgba(255, 255, 255, 0.65)',
                  border: `1px solid ${statusColors.border}`,
                  padding: '2px 8px',
                  borderRadius: '2px'
                }}
              >
                {report.latencyMs} ms
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--tx2, #4b5563)', lineHeight: 1.5 }}>
            {isTesting
              ? 'Probando consultas de lectura y permisos de actualización contra el endpoint de Base de Datos...'
              : report?.diagnosticDetail}
          </p>
        </div>

        {/* Technical Metadata Grid */}
        <div
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--b1)',
            borderRadius: '3px',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: '160px 1fr',
            rowGap: '8px',
            columnGap: '12px',
            fontSize: '12px',
            alignItems: 'center'
          }}
        >
          <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Endpoint URL:</span>
          <span style={{ fontFamily: 'var(--mo)', color: 'var(--tx)', wordBreak: 'break-all' }}>
            {report?.endpointUrl || 'https://bnjnvtbwfhmkryogebak.supabase.co'}
          </span>

          <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Estado REST / TLS:</span>
          <span
            style={{
              fontWeight: 600,
              color: isTesting
                ? 'var(--mu)'
                : isConnected
                  ? '#107c41'
                  : isBlocked
                    ? '#9a5b00'
                    : '#b3261e'
            }}
          >
            {isTesting
              ? 'Comprobando...'
              : isConnected
                ? 'Conexión HTTPS activa (Lectura y Escritura OK)'
                : isBlocked
                  ? 'Bloqueado por firewall o proxy corporativo'
                  : report?.errorMessage || 'Revisar permisos por tabla'}
          </span>

          <span style={{ color: 'var(--mu)', fontWeight: 600 }}>Última comprobación:</span>
          <span style={{ fontFamily: 'var(--mo)', fontSize: '11px', color: 'var(--tx2, #4b5563)' }}>
            {report?.checkedAt || 'En progreso'}
          </span>
        </div>

        {/* Table Accessibility & Update Permissions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--mu)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Permisos y Acceso por Tabla
          </div>

          <div style={{ border: '1px solid var(--b1)', borderRadius: '3px', overflow: 'hidden', background: 'var(--bg)' }}>
            <table className="prompt-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--s1)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--b1)' }}>Tabla</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '115px', borderBottom: '1px solid var(--b1)' }}>Lectura</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '125px', borderBottom: '1px solid var(--b1)' }}>Actualización</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--b1)' }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {report?.tables && report.tables.length > 0 ? (
                  report.tables.map((t, idx) => {
                    const hasWriteCheck = t.writable !== undefined;
                    const note = t.error
                      ? t.error
                      : t.writeError
                        ? `Rechazo al actualizar: ${t.writeError}`
                        : t.count !== undefined
                          ? `${t.count} filas indexadas`
                          : 'Consulta verificada';

                    return (
                      <tr
                        key={t.tableName}
                        style={{
                          borderBottom: idx === report.tables.length - 1 ? 'none' : '1px solid var(--b2, #e5e7eb)'
                        }}
                      >
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>
                          {t.tableName}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '2px',
                              fontSize: '10px',
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                              background: t.readable ? 'rgba(16, 124, 65, 0.1)' : '#fce8e6',
                              color: t.readable ? '#107c41' : '#b3261e',
                              border: `1px solid ${t.readable ? 'rgba(16, 124, 65, 0.25)' : '#f2b8b5'}`
                            }}
                          >
                            {t.readable ? 'OK' : 'BLOQUEADA'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          {hasWriteCheck ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '2px',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.03em',
                                background: t.writable ? 'rgba(16, 124, 65, 0.1)' : '#fce8e6',
                                color: t.writable ? '#107c41' : '#b3261e',
                                border: `1px solid ${t.writable ? 'rgba(16, 124, 65, 0.25)' : '#f2b8b5'}`
                              }}
                            >
                              {t.writable ? 'PERMITIDA' : 'RECHAZADA'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--mu)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--mu)', fontSize: '11px' }}>
                          {note}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '14px', textAlign: 'center', color: 'var(--mu)' }}>
                      {isTesting ? 'Evaluando tablas y permisos RLS...' : 'No se pudo obtener información de tablas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Offline-First Information Box */}
        <div
          style={{
            background: 'rgba(16, 124, 65, 0.05)',
            border: '1px solid rgba(16, 124, 65, 0.2)',
            borderLeft: '3px solid #107c41',
            padding: '10px 14px',
            borderRadius: '2px',
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--tx2, #374151)'
          }}
        >
          <strong style={{ color: '#107c41', display: 'block', marginBottom: '2px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Garantía de Funcionamiento Offline-First
          </strong>
          Si la red de la empresa bloquea la Base de Datos o una actualización remota falla, sus cambios se guardan inmediatamente en almacenamiento local (LocalStorage) para continuar trabajando sin interrupciones.
        </div>

        {/* Footer Actions matching ModalShell / RuleEditorModal styling */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            marginTop: '4px',
            paddingTop: '14px',
            borderTop: '1px solid var(--b1)'
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            onClick={runTest}
            disabled={isTesting}
          >
            {isTesting ? 'Comprobando...' : 'Probar conexión'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
