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
    filterPlano,
    setFilterPlano,
    filterDetalle,
    setFilterDetalle,
    searchQuery,
    setSearchQuery,
    clearFilters,
    editingItemId,
    setEditingItemId
  } = useTakeoff();

  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page to 1 whenever total items, filters, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, pageSize, filterPlano, filterDetalle]);

  // Extract unique plano values for filter
  const availablePlanos = Array.from(
    new Set(allItems.map(i => i.plano).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

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
  const hasActiveFilters = Boolean(filterPlano || filterDetalle || searchQuery);

  return (
    <div className="takeoff-table-wrapper">
      {(totalItems > 50 || hasActiveFilters) && (
        <div
          className="table-pagination-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--s2)',
            border: '1px solid var(--b1)',
            borderRadius: '4px 4px 0 0',
            fontSize: '12px',
            fontFamily: 'var(--mo, monospace)',
            color: 'var(--tx)',
            marginBottom: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Mostrar:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              style={{
                background: 'var(--s1)',
                color: 'var(--tx)',
                border: '1px solid var(--b1)',
                borderRadius: '3px',
                padding: '2px 6px',
                cursor: 'pointer'
              }}
            >
              <option value={50} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>50 filas/pág</option>
              <option value={100} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>100 filas/pág</option>
              <option value={250} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>250 filas/pág</option>
              <option value={500} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>500 filas/pág</option>
              <option value={0} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>Mostrar Todas ({totalItems.toLocaleString()})</option>
            </select>
            <span style={{ color: 'var(--mu)' }}>
              Mostrando {startIndex + 1}-{endIndex} de {totalItems.toLocaleString()} ítems
            </span>

            {filterPlano && (
              <button
                onClick={() => setFilterPlano('')}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  fontFamily: 'var(--mo)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '6px'
                }}
                title={`Quitar filtro de Plano (${filterPlano})`}
              >
                <span>PLANO: {filterPlano}</span>
                <span style={{ fontWeight: 'bold' }}>✕</span>
              </button>
            )}

            {filterDetalle && (
              <button
                onClick={() => setFilterDetalle('')}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  fontFamily: 'var(--mo)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '6px'
                }}
                title={`Quitar filtro de Detalle (${filterDetalle})`}
              >
                <span>DETALLE: {filterDetalle}</span>
                <span style={{ fontWeight: 'bold' }}>✕</span>
              </button>
            )}

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  fontFamily: 'var(--mo)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '6px'
                }}
                title={`Quitar búsqueda ("${searchQuery}")`}
              >
                <span>BÚSQUEDA: "{searchQuery}"</span>
                <span style={{ fontWeight: 'bold' }}>✕</span>
              </button>
            )}
          </div>

          {isPaginated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                style={{
                  background: 'var(--s1)',
                  color: 'var(--tx)',
                  border: '1px solid var(--b1)',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: safePage <= 1 ? 0.4 : 1
                }}
              >
                ⏮
              </button>
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                style={{
                  background: 'var(--s1)',
                  color: 'var(--tx)',
                  border: '1px solid var(--b1)',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: safePage <= 1 ? 0.4 : 1
                }}
              >
                ◀ Ant
              </button>
              <span style={{ color: 'var(--tx)' }}>
                Pág. {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                style={{
                  background: 'var(--s1)',
                  color: 'var(--tx)',
                  border: '1px solid var(--b1)',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: safePage >= totalPages ? 0.4 : 1
                }}
              >
                Sig ▶
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                style={{
                  background: 'var(--s1)',
                  color: 'var(--tx)',
                  border: '1px solid var(--b1)',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: safePage >= totalPages ? 0.4 : 1
                }}
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
            <th style={{ padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
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
                  value={filterPlano}
                  onChange={e => setFilterPlano(e.target.value)}
                >
                  <option value="" style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>
                    PLANO
                  </option>
                  {availablePlanos.map(p => (
                    <option key={p} value={p} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>
                      {p}
                    </option>
                  ))}
                </select>
                {filterPlano && (
                  <button
                    type="button"
                    onClick={() => setFilterPlano('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Quitar filtro de Plano"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      <line x1="16" y1="14" x2="22" y2="20" stroke="#ef4444" strokeWidth="2.5" />
                      <line x1="22" y1="14" x2="16" y2="20" stroke="#ef4444" strokeWidth="2.5" />
                    </svg>
                  </button>
                )}
              </div>
            </th>
            <th>REV</th>
            <th>TAG ÚNICO</th>
            <th>TAG EN PLANO</th>
            <th style={{ padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
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
                  <option value="" style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>
                    DETALLE
                  </option>
                  {availableDetalles.map(d => (
                    <option key={d} value={d} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>
                      {d}
                    </option>
                  ))}
                </select>
                {filterDetalle && (
                  <button
                    type="button"
                    onClick={() => setFilterDetalle('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Quitar filtro de Detalle"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      <line x1="16" y1="14" x2="22" y2="20" stroke="#ef4444" strokeWidth="2.5" />
                      <line x1="22" y1="14" x2="16" y2="20" stroke="#ef4444" strokeWidth="2.5" />
                    </svg>
                  </button>
                )}
              </div>
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
