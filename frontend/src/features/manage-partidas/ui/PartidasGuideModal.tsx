import React, { useState } from 'react';
import { PartidaRecord } from '../../../entities/partida/model/types';
import { downloadPartidasTemplateXlsx, parsePartidasExcelFile } from '../../../shared/lib/partidasExcel';
import { usePartidasStore } from '../model/usePartidasStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { ModalShell } from '../../../shared/ui/ModalShell';

export interface PartidasGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PartidasGuideModal: React.FC<PartidasGuideModalProps> = ({ isOpen, onClose }) => {
  const { uploadPartidasList, partidas } = usePartidasStore();
  const { showToast } = useUIStore();
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
      showToast(`¡${parsedPartidas.length} partidas sincronizadas exitosamente!`, 'success');
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
    <ModalShell
      title="Carga de partidas"
      subtitle="El Excel correlaciona PARTIDA SICME y PARTIDA BALANCE con el metrado."
      onClose={onClose}
      maxWidth="720px"
    >
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    <th style={{ padding: '6px 8px', width: '11%', textAlign: 'center', color: 'var(--mu)' }}>ACTIVIDAD</th>
                    <th style={{ padding: '6px 8px', width: '9%', textAlign: 'center', color: 'var(--mu)' }}>WBS</th>
                    <th style={{ padding: '6px 8px', width: '12%', textAlign: 'center', color: 'var(--mu)' }}>PARTIDA SICME</th>
                    <th style={{ padding: '6px 8px', width: '12%', textAlign: 'center', color: 'var(--mu)' }}>PARTIDA BALANCE</th>
                    <th style={{ padding: '6px 8px', width: '25%', textAlign: 'center', color: 'var(--mu)' }}>FORECAST DESCRIPTION</th>
                    <th style={{ padding: '6px 8px', width: '21%', textAlign: 'center', color: 'var(--mu)' }}>DESCRIPCIÓN BM</th>
                    <th style={{ padding: '6px 8px', width: '10%', textAlign: 'center', color: 'var(--mu)' }}>UND</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>PAT</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>3000</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 600 }}>6.3</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 600 }}>2.1.25</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>CABLE DESNUDO 4/0 AWG</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>Malla de Tierra - Cable Cu desnudo # 4/0 AWG</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>M</td>
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
                      <th style={{ padding: '4px', textAlign: 'center' }}>WBS</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>SICME</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>BALANCE</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>FORECAST DESC</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>DESCRIPCIÓN BM</th>
                      <th style={{ padding: '4px', textAlign: 'center' }}>UND</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPartidas.slice(0, 50).map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)' }}>{p.actividad}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)' }}>{p.wbs || p.area}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 600 }}>{p.partidaSicme || p.item}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 600 }}>{p.partidaBalance}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center' }}>{p.forecastDesc}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center' }}>{p.descripcionBm || p.descripcion}</td>
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
        <div className="modal-ft" style={{ justifyContent: 'center' }}>
          <button className="btn-ghost" onClick={downloadPartidasTemplateXlsx}>
            Plantilla Excel
          </button>
          <label
            className="btn-primary"
            style={{ cursor: 'pointer', margin: 0 }}
            title="Importar archivo Excel de partidas"
          >
            <span>Seleccionar Excel</span>
            <input
              type="file"
              accept=".xlsx,.xlsb,.xls"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
          {parsedPartidas.length > 0 && (
            <button className="btn-primary" onClick={handleSendToSupabase} disabled={isUploading}>
              {isUploading ? 'Guardando...' : `Enviar a Supabase (${parsedPartidas.length})`}
            </button>
          )}
        </div>
    </ModalShell>
  );
};
