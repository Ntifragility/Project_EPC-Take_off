import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TakeoffItem } from '../../../entities/takeoff-item/model/types';
import { TakeoffRow } from './TakeoffRow';
import { TakeoffTableHeader } from './TakeoffTableHeader';
import { mergeItemsByDetalle } from '../../../entities/takeoff-item/model/itemAggregation';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';

export interface TakeoffTableProps {
  items: TakeoffItem[];
}

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  partida: 85,
  num: 40,
  mat: 48,
  plano: 140,
  rev: 50,
  tagUnico: 150,
  tagPlano: 130,
  detalle: 110,
  desc: 280,
  metradoOt: 90,
  unit: 75
};

export const TakeoffTable: React.FC<TakeoffTableProps> = ({ items }) => {
  const {
    items: allItems,
    editingItemId,
    setEditingItemId,
    highlightedTag,
    batchUpdateField
  } = useItemsStore();

  const section = useAppStore(state => state.section);
  const showToast = useUIStore(state => state.showToast);

  const {
    filterPlano,
    setFilterPlano,
    filterDetalle,
    setFilterDetalle,
    searchQuery,
    setSearchQuery,
    clearFilters
  } = useUIStore();

  // Column resizing state
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('epc-table-col-widths');
      if (saved) return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_COL_WIDTHS;
  });

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const handleStartResize = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = colWidths[colKey] || DEFAULT_COL_WIDTHS[colKey] || 80;
    resizingRef.current = { colKey, startX: e.clientX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(35, resizingRef.current.startWidth + delta);
      setColWidths(prev => ({
        ...prev,
        [resizingRef.current!.colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        setColWidths(latest => {
          localStorage.setItem('epc-table-col-widths', JSON.stringify(latest));
          return latest;
        });
        resizingRef.current = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Excel Cell Selection & Drag-to-Fill State
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; colKey: string; value: any } | null>(null);
  const [editingCell, setEditingCell] = useState<{ itemId: string; colKey: string } | null>(null);
  const [dragFill, setDragFill] = useState<{
    isDragging: boolean;
    sourceItemId: string;
    colKey: string;
    sourceValue: any;
    targetItemIds: string[];
  }>({
    isDragging: false,
    sourceItemId: '',
    colKey: '',
    sourceValue: null,
    targetItemIds: []
  });

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

  const handleStartFillDrag = (itemId: string, colKey: string, sourceValue: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragFill({
      isDragging: true,
      sourceItemId: itemId,
      colKey,
      sourceValue,
      targetItemIds: []
    });
  };

  const handleCellMouseEnter = (itemId: string, colKey: string) => {
    if (!dragFill.isDragging || dragFill.colKey !== colKey) return;
    const sourceIdx = visibleItems.findIndex(i => i.id === dragFill.sourceItemId);
    const targetIdx = visibleItems.findIndex(i => i.id === itemId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    if (targetIdx > sourceIdx) {
      const targetSlice = visibleItems.slice(sourceIdx + 1, targetIdx + 1);
      const targetIds = targetSlice.filter(it => it.material === 'P').map(i => i.id);
      setDragFill(prev => ({ ...prev, targetItemIds: targetIds }));
    } else {
      setDragFill(prev => ({ ...prev, targetItemIds: [] }));
    }
  };

  useEffect(() => {
    if (!dragFill.isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const td = el.closest('td[data-item-id]');
      if (!td) return;

      const hoveredItemId = td.getAttribute('data-item-id');
      if (!hoveredItemId) return;

      const sourceIdx = visibleItems.findIndex(i => i.id === dragFill.sourceItemId);
      const targetIdx = visibleItems.findIndex(i => i.id === hoveredItemId);
      if (sourceIdx === -1 || targetIdx === -1) return;

      if (targetIdx > sourceIdx) {
        const targetSlice = visibleItems.slice(sourceIdx + 1, targetIdx + 1);
        const targetIds = targetSlice.filter(it => it.material === 'P').map(i => i.id);
        setDragFill(prev => ({ ...prev, targetItemIds: targetIds }));
      } else {
        setDragFill(prev => ({ ...prev, targetItemIds: [] }));
      }
    };

    const handleGlobalMouseUp = () => {
      if (dragFill.targetItemIds.length > 0) {
        batchUpdateField(
          dragFill.targetItemIds,
          dragFill.colKey as keyof TakeoffItem,
          dragFill.sourceValue,
          section
        );
        showToast(
          `Copiado "${dragFill.sourceValue ?? ''}" a ${dragFill.targetItemIds.length} ítem(s) principal(es) y actualizados sus consumibles`,
          'info'
        );
      }
      setDragFill({
        isDragging: false,
        sourceItemId: '',
        colKey: '',
        sourceValue: null,
        targetItemIds: []
      });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragFill.isDragging, dragFill.sourceItemId, dragFill.colKey, dragFill.sourceValue, dragFill.targetItemIds, visibleItems, batchUpdateField, section, showToast]);

  const handleSaveInlineCell = (itemId: string, colKey: string, newValue: any) => {
    setEditingCell(null);
    let parsedVal = newValue;
    if (colKey === 'plano' || colKey === 'rev') {
      parsedVal = String(newValue).toUpperCase().trim();
    }
    if (colKey === 'metradoOt') {
      parsedVal = String(newValue).trim();
    }
    batchUpdateField([itemId], colKey as keyof TakeoffItem, parsedVal, section);
  };

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
            colWidths={colWidths}
            onStartResize={handleStartResize}
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
              visibleItems.map((item, idx) => {
                const isSelectedRow = selectedCell?.itemId === item.id;
                const isEditingThisRow = editingCell?.itemId === item.id;
                const isTargetRow = dragFill.isDragging && dragFill.targetItemIds.includes(item.id);

                return (
                  <TakeoffRow
                    key={item.id}
                    item={item}
                    index={startIndex + idx + 1}
                    isEditing={editingItemId === item.id}
                    availablePlanos={availablePlanos}
                    onStartEdit={() => setEditingItemId(item.id)}
                    onCancelEdit={() => setEditingItemId(null)}
                    selectedColKey={isSelectedRow ? selectedCell?.colKey : isTargetRow ? dragFill.colKey : null}
                    editingColKey={isEditingThisRow ? editingCell?.colKey : null}
                    isFillTarget={isTargetRow}
                    onSelectCell={(colKey, val) => {
                      setSelectedCell({ itemId: item.id, colKey, value: val });
                    }}
                    onStartInlineEdit={(colKey) => {
                      setEditingCell({ itemId: item.id, colKey });
                    }}
                    onSaveInlineEdit={(colKey, val) => {
                      handleSaveInlineCell(item.id, colKey, val);
                    }}
                    onCancelInlineEdit={() => setEditingCell(null)}
                    onStartFillDrag={(colKey, val, e) => {
                      handleStartFillDrag(item.id, colKey, val, e);
                    }}
                    onCellMouseEnter={(colKey) => {
                      handleCellMouseEnter(item.id, colKey);
                    }}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <datalist id="available-planos-list">
        {availablePlanos.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
};
