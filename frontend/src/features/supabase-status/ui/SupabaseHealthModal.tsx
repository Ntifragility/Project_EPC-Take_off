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

  const badgeBg = isConnected ? '#e6f4ea' : isBlocked ? '#fef7e0' : '#fce8e6';
  const badgeBorder = isConnected ? '#a8dab5' : isBlocked ? '#f6c344' : '#fad2cf';
  const badgeText = isConnected ? '#137333' : isBlocked ? '#b06000' : '#c5221f';

  return (
    <ModalShell
      title="Estado de Conexión con Supabase"
      subtitle="Diagnóstico de conectividad en tiempo real y verificación de permisos"
      onClose={onClose}
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', color: 'var(--t1)' }}>
        {/* Status Banner */}
        <div
          style={{
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            borderRadius: '4px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: badgeText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isTesting
                ? 'Comprobando conectividad...'
                : report?.diagnosticTitle || 'Comprobando...'}
            </span>
            {report?.latencyMs !== null && report?.latencyMs !== undefined && (
              <span style={{ fontSize: '12px', color: badgeText, fontWeight: 600 }}>
                {report.latencyMs} ms
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>
            {isTesting
              ? 'Enviando paquetes de sondeo al servidor Supabase...'
              : report?.diagnosticDetail}
          </p>
        </div>

        {/* Technical Details Grid */}
        <div
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--b1)',
            borderRadius: '4px',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: '140px 1fr',
            rowGap: '10px',
            columnGap: '12px',
            fontSize: '12px'
          }}
        >
          <span style={{ color: 'var(--t3)', fontWeight: 600 }}>Endpoint URL:</span>
          <span style={{ fontFamily: 'var(--mo)', color: 'var(--t1)', wordBreak: 'break-all' }}>
            {report?.endpointUrl || 'https://bnjnvtbwfhmkryogebak.supabase.co'}
          </span>

          <span style={{ color: 'var(--t3)', fontWeight: 600 }}>Estado REST:</span>
          <span style={{ fontWeight: 600, color: isConnected ? '#137333' : '#b06000' }}>
            {isTesting
              ? 'Verificando...'
              : isConnected
              ? 'Conexión HTTPS activa (200 OK)'
              : isBlocked
              ? 'Bloqueado por firewall o proxy corporativo'
              : report?.errorMessage || 'Desconectado'}
          </span>

          <span style={{ color: 'var(--t3)', fontWeight: 600 }}>Última comprobación:</span>
          <span style={{ color: 'var(--t2)' }}>
            {report?.checkedAt || 'En progreso'}
          </span>
        </div>

        {/* Table Accessibility Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Acceso a Tablas de la Base de Datos
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              border: '1px solid var(--b1)',
              background: 'var(--s1)'
            }}
          >
            <thead>
              <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--b1)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--t2)' }}>Tabla</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--t2)', width: '130px' }}>Lectura</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--t2)' }}>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {report?.tables && report.tables.length > 0 ? (
                report.tables.map(t => (
                  <tr key={t.tableName} style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mo)', fontWeight: 600 }}>
                      {t.tableName}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '2px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: t.readable ? '#e6f4ea' : '#fce8e6',
                          color: t.readable ? '#137333' : '#c5221f'
                        }}
                      >
                        {t.readable ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--t3)', fontSize: '11px' }}>
                      {t.readable
                        ? t.count !== undefined
                          ? `${t.count} filas indexadas`
                          : 'Consulta verificada'
                        : t.error || 'No accesible'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: 'var(--t3)' }}>
                    {isTesting ? 'Evaluando tablas...' : 'No se pudo obtener información de tablas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Offline-First Information Box */}
        <div
          style={{
            background: 'rgba(16, 124, 65, 0.05)',
            borderLeft: '3px solid #107c41',
            padding: '10px 14px',
            borderRadius: '0 4px 4px 0',
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--t2)'
          }}
        >
          <strong style={{ color: '#107c41', display: 'block', marginBottom: '2px' }}>
            Garantía de Funcionamiento Offline-First:
          </strong>
          Si su red corporativa bloquea las conexiones a Supabase, la aplicación sigue funcionando de manera continua y sin interrupciones. Todos los metrados, partidas, reglas personalizadas y variantes de detalle se conservan íntegramente en el almacenamiento local (LocalStorage) de su navegador.
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            className="btn-modal-secondary"
            onClick={runTest}
            disabled={isTesting}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isTesting ? 'wait' : 'pointer'
            }}
          >
            {isTesting ? 'Comprobando...' : 'Probar conexión ahora'}
          </button>
          <button
            type="button"
            className="btn-modal-primary"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
