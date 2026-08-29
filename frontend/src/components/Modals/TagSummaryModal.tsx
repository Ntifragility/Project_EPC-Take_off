import React, { useState, useMemo } from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { generateTagSummary, exportTagSummaryExcel } from '../../utils/excelExporter';

interface TagSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TagSummaryModal: React.FC<TagSummaryModalProps> = ({ isOpen, onClose }) => {
  const { items } = useTakeoff();
  const [filterQuery, setFilterQuery] = useState('');

  const summaryData = useMemo(() => {
    return generateTagSummary(items);
  }, [items]);

  const filteredData = useMemo(() => {
    if (!filterQuery.trim()) return summaryData;
    const q = filterQuery.toLowerCase();
    return summaryData.filter(
      r =>
        r.tag.toLowerCase().includes(q) ||
        r.detalle.toLowerCase().includes(q)
    );
  }, [summaryData, filterQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      id="tag-summary-overlay"
      style={{ display: 'flex' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        id="tag-summary-box"
        style={{ maxWidth: '850px', width: '92vw' }}
      >
        <div className="modal-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="modal-hd-title" style={{ color: 'var(--am, #eab308)' }}>
              TABLA RESUMEN POR TAG
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--mo, monospace)',
                background: 'var(--s2)',
                border: '1px solid var(--b1)',
                padding: '2px 8px',
                borderRadius: '4px',
                color: 'var(--tx)'
              }}
            >
              {summaryData.length} TAGs
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-sm"
              style={{
                background: 'var(--am, #eab308)',
                color: '#000',
                fontWeight: 700,
                fontSize: '11px',
                padding: '4px 12px'
              }}
              onClick={() => exportTagSummaryExcel(items)}
              title="Descargar esta tabla en formato Excel (.xlsx) con las 6 columnas"
            >
              DESCARGAR EXCEL
            </button>
            <button className="btn-ghost btn-sm" onClick={onClose}>
              ESC
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '14px 18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              gap: '10px'
            }}
          >
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por TAG o DETALLE..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              style={{ maxWidth: '280px', fontSize: '11.5px', padding: '5px 10px' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--mu)', fontFamily: 'var(--mo)' }}>
              Formato Entrada / Salida (6 Columnas)
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--mu)',
                background: 'var(--s2)',
                borderRadius: '8px',
                fontSize: '13px',
                border: '1px dashed var(--b2)'
              }}
            >
              {items.length === 0
                ? 'No hay datos en la tabla principal para generar el resumen.'
                : 'No se encontraron TAGs con el filtro especificado.'}
            </div>
          ) : (
            <div
              style={{
                maxHeight: '440px',
                overflowY: 'auto',
                overflowX: 'auto',
                border: '1px solid var(--b1)',
                borderRadius: '6px'
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11.5px',
                  fontFamily: 'var(--mo, monospace)',
                  textAlign: 'left'
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: 'var(--s2)',
                      borderBottom: '2px solid var(--b1)',
                      color: 'var(--tx)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2
                    }}
                  >
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>TAG</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>LONGITUD_CABLE</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>LONGITUD_TUBERIA</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>DETALLE</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>JUMPERS</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700 }}>SOPORTES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr
                      key={row.tag + idx}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'var(--s1)',
                        borderBottom: '1px solid var(--b1)'
                      }}
                    >
                      <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--tx)' }}>
                        {row.tag}
                      </td>
                      <td style={{ padding: '7px 12px', color: 'var(--am, #eab308)' }}>
                        {row.longitudCable}
                      </td>
                      <td style={{ padding: '7px 12px', color: 'var(--tx)' }}>
                        {row.longitudTuberia}
                      </td>
                      <td style={{ padding: '7px 12px', color: 'var(--tx)' }}>
                        <span
                          style={{
                            background: 'var(--s3)',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            border: '1px solid var(--b1)'
                          }}
                        >
                          {row.detalle || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '7px 12px', color: row.jumpers ? 'var(--tx)' : 'var(--mu)' }}>
                        {row.jumpers || '—'}
                      </td>
                      <td style={{ padding: '7px 12px', color: row.soportes ? 'var(--tx)' : 'var(--mu)' }}>
                        {row.soportes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

