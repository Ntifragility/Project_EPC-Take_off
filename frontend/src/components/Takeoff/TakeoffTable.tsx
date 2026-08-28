import React, { useState, useEffect } from 'react';
import { TakeoffItem } from '../../types/takeoff';
import { TakeoffRow } from './TakeoffRow';
import { useTakeoff } from '../../context/TakeoffContext';

interface TakeoffTableProps {
  items: TakeoffItem[];
}

export const TakeoffTable: React.FC<TakeoffTableProps> = ({ items }) => {
  const {
    items: allItems,
    filterDetalle,
    setFilterDetalle,
    editingItemId,
    setEditingItemId
  } = useTakeoff();

  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page to 1 whenever total items or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, pageSize, filterDetalle]);

  // Extract unique detalle values for filter
  const availableDetalles = Array.from(
    new Set(allItems.map(i => i.detalle).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const totalItems = items.length;
  const isPaginated = pageSize > 0 && totalItems > pageSize;
  const totalPages = isPaginated ? Math.ceil(totalItems / pageSize) : 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = isPaginated ? (safePage - 1) * pageSize : 0;
  const endIndex = isPaginated ? Math.min(startIndex + pageSize, totalItems) : totalItems;
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div className="takeoff-table-wrapper">
      {totalItems > 50 && (
        <div
          className="table-pagination-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--bg-card, #1e1e1e)',
            border: '1px solid var(--border, #333)',
            borderRadius: '4px 4px 0 0',
            fontSize: '12px',
            fontFamily: 'var(--mo, monospace)',
            marginBottom: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Mostrar:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              style={{
                background: 'var(--bg-input, #2a2a2a)',
                color: 'inherit',
                border: '1px solid var(--border, #444)',
                borderRadius: '3px',
                padding: '2px 6px',
                cursor: 'pointer'
              }}
            >
              <option value={50}>50 filas/pág</option>
              <option value={100}>100 filas/pág</option>
              <option value={250}>250 filas/pág</option>
              <option value={500}>500 filas/pág</option>
              <option value={0}>Mostrar Todas ({totalItems.toLocaleString()})</option>
            </select>
            <span style={{ opacity: 0.7 }}>
              Mostrando {startIndex + 1}-{endIndex} de {totalItems.toLocaleString()} ítems
            </span>
          </div>

          {isPaginated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                style={{ padding: '2px 8px', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1 }}
              >
                ⏮
              </button>
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                style={{ padding: '2px 8px', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1 }}
              >
                ◀ Ant
              </button>
              <span>
                Pág. {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                style={{ padding: '2px 8px', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.4 : 1 }}
              >
                Sig ▶
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                style={{ padding: '2px 8px', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.4 : 1 }}
              >
                ⏭
              </button>
            </div>
          )}
        </div>
      )}

      <table>
        <colgroup>
          <col className="c-n" />
          <col className="c-mat" />
          <col className="c-plano" />
          <col className="c-rev" />
          <col className="c-t-unico" />
          <col className="c-t-plano" />
          <col className="c-det" />
          <col className="c-d" />
          <col className="c-q" />
          <col className="c-mo" />
          <col className="c-u" />
        </colgroup>
        <thead>
          <tr style={{ color: 'var(--di)', opacity: 0.8 }}>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>40px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>40px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>170px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>30px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>140px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>75px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>95px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>AUTO</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>70px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>75px</th>
            <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>90px</th>
          </tr>
          <tr>
            <th>#</th>
            <th>MAT</th>
            <th>PLANO</th>
            <th>REV</th>
            <th>TAG ÚNICO</th>
            <th>TAG EN PLANO</th>
            <th style={{ padding: 0 }}>
              <select
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  fontWeight: 'inherit',
                  fontSize: 'inherit',
                  width: '100%',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                value={filterDetalle}
                onChange={e => setFilterDetalle(e.target.value)}
              >
                <option value="" style={{ color: '#000' }}>
                  DETALLE (FILTRO)
                </option>
                {availableDetalles.map(d => (
                  <option key={d} value={d} style={{ color: '#000' }}>
                    {d}
                  </option>
                ))}
              </select>
            </th>
            <th>DESCRIPCIÓN</th>
            <th>METRADO OT</th>
            <th>UNID</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((it, idx) => (
            <TakeoffRow
              key={it.id}
              item={it}
              index={startIndex + idx + 1}
              isEditing={editingItemId === it.id}
              onStartEdit={() => setEditingItemId(it.id)}
              onCancelEdit={() => setEditingItemId(null)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
