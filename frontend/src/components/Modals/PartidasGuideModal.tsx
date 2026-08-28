import React, { useState } from 'react';
import { PartidaRecord } from '../../types/takeoff';
import { downloadPartidasTemplateXlsx, parsePartidasExcelFile } from '../../utils/partidasExcel';
import { useTakeoff } from '../../context/TakeoffContext';

interface PartidasGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PartidasGuideModal: React.FC<PartidasGuideModalProps> = ({ isOpen, onClose }) => {
  const { uploadPartidasList, showToast, partidas } = useTakeoff();
  const [parsedPartidas, setParsedPartidas] = useState<PartidaRecord[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const records = await parsePartidasExcelFile(file);
      setParsedPartidas(records);
      showToast(`¡${records.length} partidas leídas del archivo Excel!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al leer el archivo Excel';
      showToast(msg, 'warn');
      setParsedPartidas([]);
    } finally {
      e.target.value = '';
    }
  };

  const handleSendToSupabase = async () => {
    if (parsedPartidas.length === 0) return;
    setIsUploading(true);
    try {
      await uploadPartidasList(parsedPartidas);
      setParsedPartidas([]);
      setFileName('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar partidas';
      showToast(msg, 'warn');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="partidas-guide-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          maxWidth: '720px',
          width: '92vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '16px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tx)', letterSpacing: '0.5px' }}>
              GESTIÓN Y CARGA DE PARTIDAS (FORECAST MASTER)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--mu)' }}>
              Sube el archivo Excel para correlacionar automáticamente la columna <strong>PARTIDA (ITEM)</strong> con el metrado.
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ fontSize: '14px', width: '28px', height: '28px', padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '11px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}
        >
          {/* Format Table */}
          <div>
            <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: '4px' }}>
              Estructura de Columnas Requerida en el Excel:
            </div>
            <div
              className="tbl-wrap"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid var(--b1)',
                borderRadius: '6px',
                overflow: 'hidden'
              }}
            >
              <table
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderCollapse: 'collapse',
                  fontSize: '10.5px',
                  tableLayout: 'fixed',
                  minWidth: '100%'
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--b1)' }}>
                    <th style={{ padding: '6px 8px', width: '15%', textAlign: 'center', color: 'var(--mu)' }}>ACTIVIDAD</th>
                    <th style={{ padding: '6px 8px', width: '15%', textAlign: 'center', color: 'var(--mu)' }}>AREA</th>
                    <th style={{ padding: '6px 8px', width: '15%', textAlign: 'center', color: 'var(--mu)' }}>ITEM</th>
                    <th style={{ padding: '6px 8px', width: '25%', textAlign: 'center', color: 'var(--mu)' }}>FORECAST DESCRIPTION</th>
                    <th style={{ padding: '6px 8px', width: '20%', textAlign: 'center', color: 'var(--mu)' }}>DESCRIPCIÓN</th>
                    <th style={{ padding: '6px 8px', width: '10%', textAlign: 'center', color: 'var(--mu)' }}>UND</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>PAT / INST / BD</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>300, 3300, 3400...</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 600 }}>01.01.01</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>Descripción en tabla</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>Descripción Oficial</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>UND / M</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Parsed Preview Table if loaded */}
          {parsedPartidas.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--tx)' }}>
                  Vista Previa ({parsedPartidas.length} partidas detectadas en {fileName}):
                </span>
                <button
                  className="btn-ghost btn-sm btn-danger"
                  onClick={() => {
                    setParsedPartidas([]);
                    setFileName('');
                  }}
                  style={{ fontSize: '10px', height: '20px', padding: '0 6px' }}
                >
                  Limpiar
                </button>
              </div>

              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1px solid var(--b1)',
                  borderRadius: '6px'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--s2)', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '4px', textAlign: 'center' }}>ACT</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>AREA</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>ITEM</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>FORECAST DESC</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>DESCRIPCIÓN</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>UND</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPartidas.slice(0, 50).map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)' }}>{p.actividad}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)' }}>{p.area}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 600 }}>{p.item}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center' }}>{p.forecastDesc}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center' }}>{p.descripcion}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)' }}>{p.und}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedPartidas.length > 50 && (
                <div style={{ color: 'var(--mu)', fontSize: '10px', marginTop: '2px', textAlign: 'center' }}>
                  Mostrando las primeras 50 de {parsedPartidas.length} partidas.
                </div>
              )}
            </div>
          )}

          {/* Current Database Summary */}
          {partidas && partidas.length > 0 && parsedPartidas.length === 0 && (
            <div style={{ background: 'var(--s2)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b1)' }}>
              <div style={{ color: 'var(--tx)', fontWeight: 600 }}>
                Base de Datos Activa: {partidas.length} partidas cargadas en memoria / Supabase.
              </div>
              <div style={{ color: 'var(--mu)', fontSize: '10.5px', marginTop: '2px' }}>
                Al subir un nuevo archivo Excel, se agregarán y actualizarán en la base de datos de Supabase.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-ft"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--b1)'
          }}
        >
          <button
            className="btn-ghost btn-sm btn-success"
            style={{
              width: '185px',
              height: '34px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onClick={downloadPartidasTemplateXlsx}
          >
            PLANTILLA (.XLSX)
          </button>

          <label
            className="btn-primary btn-success"
            style={{
              cursor: 'pointer',
              width: '185px',
              height: '34px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              margin: 0
            }}
            title="Importar archivo Excel (.xlsx, .xlsb, .xls) de Partidas"
          >
            <span>+ SELECCIONAR EXCEL</span>
            <input
              type="file"
              accept=".xlsx,.xlsb,.xls"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>

          {parsedPartidas.length > 0 && (
            <button
              className="btn-green"
              style={{
                height: '34px',
                padding: '0 16px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
              onClick={handleSendToSupabase}
              disabled={isUploading}
            >
              {isUploading ? 'GUARDANDO...' : `ENVIAR A SUPABASE (${parsedPartidas.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
