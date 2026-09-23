import React, { useState, useEffect, useMemo } from 'react';
import { TakeoffItem } from '../../../entities/takeoff-item/model/types';
import { TakeoffRow } from './TakeoffRow';
import { TakeoffTableHeader } from './TakeoffTableHeader';
import { mergeItemsByDetalle } from '../../../entities/takeoff-item/model/itemAggregation';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';

export interface TakeoffTableProps {
  items: TakeoffItem[];
}

export const TakeoffTable: React.FC<TakeoffTableProps> = ({ items }) => {
  const {
    items: allItems,
    editingItemId,
    setEditingItemId,
    highlightedTag
  } = useItemsStore();

  const {
    filterPlano,
    setFilterPlano,
    filterDetalle,
    setFilterDetalle,
    searchQuery,
    setSearchQuery,
    clearFilters
  } = useUIStore();

  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMergedView, setIsMergedView] = useState<boolean>(false);

  const displayedItems = useMemo(() => {
    if (!isMergedView) {
      return items;
    }
    return mergeItemsByDetalle(items);
  }, [items, isMergedView]);

  useEffect(() => {
    if (highlightedTag) {
      const itemIndex = displayedItems.findIndex(it => it.tagPlano === highlightedTag);
      if (itemIndex !== -1 && pageSize > 0) {
        const targetPage = Math.floor(itemIndex / pageSize) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [highlightedTag, displayedItems, pageSize]);

  useEffect(() => {
    if (!highlightedTag) {
      setCurrentPage(1);
    }
  }, [pageSize, filterPlano, filterDetalle, isMergedView]);

  const availablePlanos = useMemo(
    () =>
      Array.from(new Set(allItems.map(i => i.plano).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      ),
    [allItems]
  );

  const availableDetalles = useMemo(
    () =>
      Array.from(new Set(allItems.map(i => i.detalle).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      ),
    [allItems]
  );

  const totalItems = displayedItems.length;
  const isPaginated = pageSize > 0 && totalItems > pageSize;
  const totalPages = isPaginated ? Math.ceil(totalItems / pageSize) : 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = isPaginated ? (safePage - 1) * pageSize : 0;
  const endIndex = isPaginated ? Math.min(startIndex + pageSize, totalItems) : totalItems;
  const visibleItems = displayedItems.slice(startIndex, endIndex);

  const hasActiveFilters = Boolean(filterPlano || filterDetalle || searchQuery);

  return (
    <div className="takeoff-table-wrapper">
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
          marginBottom: '4px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Toggle buttons for Merged vs Separated */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--s1)',
              borderRadius: '4px',
              border: '1px solid var(--b1)',
              padding: '2px',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => setIsMergedView(false)}
              style={{
                background: !isMergedView ? 'var(--am, #2563eb)' : 'transparent',
                color: !isMergedView ? '#ffffff' : 'var(--mu)',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: !isMergedView ? 700 : 400,
                fontFamily: 'var(--mo, monospace)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Mantener ítems separados (Vista detallada actual)"
            >
              <span>📋 Separado</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMergedView(true)}
              style={{
                background: isMergedView ? 'var(--am, #2563eb)' : 'transparent',
                color: isMergedView ? '#ffffff' : 'var(--mu)',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: isMergedView ? 700 : 400,
                fontFamily: 'var(--mo, monospace)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Fusionar ítems similares de cada DETALLE en una sola fila consolidada"
            >
              <span>📑 Consolidado por Detalle</span>
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'var(--b1)', margin: '0 4px' }} />
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
            {isMergedView ? `✨ ${totalItems} ítems consolidados` : `Mostrando ${startIndex + 1}-${endIndex} de ${totalItems.toLocaleString()} ítems`}
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

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                background: 'transparent',
                color: 'var(--mu)',
                border: '1px dashed var(--b1)',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: '10.5px',
                fontFamily: 'var(--mo)',
                marginLeft: '4px'
              }}
              title="Limpiar todos los filtros"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {isPaginated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              style={{
                background: 'var(--s1)',
                color: 'var(--tx)',
                border: '1px solid var(--b1)',
                borderRadius: '3px',
                padding: '2px 8px',
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                opacity: safePage === 1 ? 0.4 : 1
              }}
              title="Primera página"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={safePage === 1}
              style={{
                background: 'var(--s1)',
                color: 'var(--tx)',
                border: '1px solid var(--b1)',
                borderRadius: '3px',
                padding: '2px 8px',
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                opacity: safePage === 1 ? 0.4 : 1
              }}
              title="Página anterior"
            >
              ‹ Ant
            </button>

            <span style={{ padding: '0 6px' }}>
              Pág. <strong>{safePage}</strong> de <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={safePage === totalPages}
              style={{
                background: 'var(--s1)',
                color: 'var(--tx)',
                border: '1px solid var(--b1)',
                borderRadius: '3px',
                padding: '2px 8px',
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage === totalPages ? 0.4 : 1
              }}
              title="Página siguiente"
            >
              Sig ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              style={{
                background: 'var(--s1)',
                color: 'var(--tx)',
                border: '1px solid var(--b1)',
                borderRadius: '3px',
                padding: '2px 8px',
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage === totalPages ? 0.4 : 1
              }}
              title="Última página"
            >
              »
            </button>
          </div>
        )}
      </div>

      <div className="takeoff-table-scroll-container">
        <table className="takeoff-table">
          <TakeoffTableHeader
            filterPlano={filterPlano}
            setFilterPlano={setFilterPlano}
            availablePlanos={availablePlanos}
            filterDetalle={filterDetalle}
            setFilterDetalle={setFilterDetalle}
            availableDetalles={availableDetalles}
          />
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: 'var(--mu)' }}>
                  {totalItems === 0
                    ? 'No hay ítems registrados en este paquete.'
                    : 'No se encontraron ítems que coincidan con los filtros aplicados.'}
                </td>
              </tr>
            ) : (
              visibleItems.map((item, idx) => (
                <TakeoffRow
                  key={item.id}
                  item={item}
                  index={startIndex + idx + 1}
                  isEditing={editingItemId === item.id}
                  onStartEdit={() => setEditingItemId(item.id)}
                  onCancelEdit={() => setEditingItemId(null)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
