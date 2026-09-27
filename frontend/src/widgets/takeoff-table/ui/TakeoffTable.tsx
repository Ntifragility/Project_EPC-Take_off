import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TakeoffItem } from '../../../entities/takeoff-item/model/types';
import { TakeoffRow } from './TakeoffRow';
import { TakeoffTableHeader } from './TakeoffTableHeader';
import {
  BASE_COL_WIDTHS,
  COL_WIDTHS_STORAGE_KEY,
  clampColumnWidth,
  defaultWidths,
  fitWidthsToPane,
  screenCategory,
  sumWidths
} from './columnWidths';
import { COLUMN_LABELS, uniqueColumnValues } from '../model/columnValue';
import { mergeItemsByDetalle } from '../../../entities/takeoff-item/model/itemAggregation';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';

export interface TakeoffTableProps {
  items: TakeoffItem[];
}

function idsInFillRange(
  rows: TakeoffItem[],
  sourceId: string,
  targetId: string,
  colKey: string
): string[] {
  const sourceIdx = rows.findIndex(i => i.id === sourceId);
  const targetIdx = rows.findIndex(i => i.id === targetId);
  if (sourceIdx === -1 || targetIdx === -1 || targetIdx === sourceIdx) return [];
  const start = Math.min(sourceIdx, targetIdx);
  const end = Math.max(sourceIdx, targetIdx);
  const slice = rows.slice(start, end + 1).filter(it => it.id !== sourceId);
  if (colKey === 'plano') return slice.map(i => i.id);
  return slice.filter(it => it.material === 'P').map(i => i.id);
}

function rowInSourceColumn(clientY: number, colKey: string): string | null {
  const cells = document.querySelectorAll(`td[data-col-key="${colKey}"]`);
  for (const td of cells) {
    const rect = td.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      return td.getAttribute('data-item-id');
    }
  }
  return null;
}

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
    columnFilters,
    setColumnFilter,
    searchQuery,
    clearFilters,
    fitTableNonce
  } = useUIStore();

  // Manual drag only. Defaults fill the pane once at load; window resize
  // never touches them. A new storage key drops the broken v1/v2 widths.
  const hasSavedWidths = useRef<boolean>(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      if (saved) {
        hasSavedWidths.current = true;
        const widths = { ...BASE_COL_WIDTHS, ...JSON.parse(saved) };
        return Object.fromEntries(
          Object.keys(BASE_COL_WIDTHS).map(key => [key, clampColumnWidth(key, widths[key])])
        );
      }
    } catch (e) {}
    return defaultWidths(typeof window !== 'undefined' ? window.innerWidth : 1920);
  });

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCategoryRef = useRef<string>(
    typeof window !== 'undefined' ? screenCategory(window.innerWidth) : '22'
  );

  const applyFit = (persist: boolean) => {
    const el = scrollRef.current;
    if (!el || !el.clientWidth) return;
    const next = fitWidthsToPane(el.clientWidth);
    setColWidths(next);
    if (persist) {
      try {
        localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !el.clientWidth) return;
    if (hasSavedWidths.current && sumWidths(colWidths) <= el.clientWidth) {
      return;
    }
    applyFit(!hasSavedWidths.current);
  }, []);

  // Refit when the screen category changes (27" ↔ 22" ↔ 15.6"), not on every pixel.
  useEffect(() => {
    const onResize = () => {
      const next = screenCategory(window.innerWidth);
      if (next === lastCategoryRef.current) return;
      lastCategoryRef.current = next;
      applyFit(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (fitTableNonce === 0) return;
    applyFit(true);
    showToast('Columnas ajustadas al ancho de la pantalla', 'success');
  }, [fitTableNonce]);

  const handleStartResize = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = colWidths[colKey] || BASE_COL_WIDTHS[colKey] || 80;
    resizingRef.current = { colKey, startX: e.clientX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = clampColumnWidth(resizingRef.current.colKey, resizingRef.current.startWidth + delta);
      setColWidths(prev => ({
        ...prev,
        [resizingRef.current!.colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        setColWidths(latest => {
          localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(latest));
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
  }, [pageSize, columnFilters, isMergedView]);

  const availablePlanos = useMemo(
    () =>
      Array.from(new Set(allItems.map(i => i.plano).filter(Boolean))).sort((a, b) =>
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

  const fillSessionRef = useRef(dragFill);
  const visibleItemsRef = useRef(visibleItems);
  visibleItemsRef.current = visibleItems;
  const batchUpdateRef = useRef(batchUpdateField);
  const showToastRef = useRef(showToast);
  const sectionRef = useRef(section);
  batchUpdateRef.current = batchUpdateField;
  showToastRef.current = showToast;
  sectionRef.current = section;
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

  const applyFillHover = (itemId: string, colKey: string) => {
    const session = fillSessionRef.current;
    if (!session.isDragging || session.colKey !== colKey) return;
    const targetIds = idsInFillRange(visibleItemsRef.current, session.sourceItemId, itemId, session.colKey);
    if (sameIds(session.targetItemIds, targetIds)) return;
    const next = { ...session, targetItemIds: targetIds };
    fillSessionRef.current = next;
    setDragFill(next);
  };

  const finishFillDrag = () => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    document.body.classList.remove('is-fill-dragging');
    const session = fillSessionRef.current;
    if (session.isDragging && session.targetItemIds.length > 0) {
      const applied = batchUpdateRef.current(
        session.targetItemIds,
        session.colKey as keyof TakeoffItem,
        session.sourceValue,
        sectionRef.current
      );
      if (applied) {
        const noun = session.colKey === 'plano' ? 'fila(s)' : 'ítem(s) principal(es)';
        showToastRef.current(
          `Copiado "${session.sourceValue ?? ''}" a ${session.targetItemIds.length} ${noun}`,
          'info'
        );
      }
    }
    const cleared = {
      isDragging: false,
      sourceItemId: '',
      colKey: '',
      sourceValue: null,
      targetItemIds: [] as string[]
    };
    fillSessionRef.current = cleared;
    setDragFill(cleared);
  };

  const handleStartFillDrag = (itemId: string, colKey: string, sourceValue: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCleanupRef.current?.();

    const next = {
      isDragging: true,
      sourceItemId: itemId,
      colKey,
      sourceValue,
      targetItemIds: [] as string[]
    };
    fillSessionRef.current = next;
    setDragFill(next);
    document.body.classList.add('is-fill-dragging');

    const onMove = (ev: MouseEvent) => {
      const session = fillSessionRef.current;
      if (!session.isDragging) return;
      const hoveredItemId = rowInSourceColumn(ev.clientY, session.colKey);
      if (!hoveredItemId) return;
      applyFillHover(hoveredItemId, session.colKey);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', finishFillDrag);
    dragCleanupRef.current = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', finishFillDrag);
    };
  };

  const handleCellMouseEnter = (itemId: string, colKey: string) => {
    applyFillHover(itemId, colKey);
  };

  const handleSaveInlineCell = (itemId: string, colKey: string, newValue: any) => {
    setEditingCell(null);
    // System columns are display-only (the store also rejects them).
    if (colKey === 'partida' || colKey === 'partidaBalance') {
      showToast('PARTIDA es de solo lectura: se actualiza desde el maestro PARTIDAS', 'warn');
      return;
    }
    if (colKey === 'tagUnico') {
      showToast('TAG ÚNICO se genera automáticamente', 'warn');
      return;
    }
    let parsedVal = newValue;
    if (colKey === 'desc') {
      parsedVal = String(newValue).toUpperCase().trim();
      if (!parsedVal) {
        showToast('La descripción no puede estar vacía', 'warn');
        return;
      }
    }
    if (colKey === 'plano' || colKey === 'rev') {
      parsedVal = String(newValue).toUpperCase().trim();
    }
    if (colKey === 'metradoOt') {
      parsedVal = String(newValue).trim();
    }
    batchUpdateField([itemId], colKey as keyof TakeoffItem, parsedVal, section);
  };

  const uniqueValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    for (const key of Object.keys(COLUMN_LABELS)) {
      values[key] = uniqueColumnValues(allItems, key);
    }
    return values;
  }, [allItems]);

  const activeColumnFilters = Object.entries(columnFilters);
  const hasActiveFilters = activeColumnFilters.length > 0 || Boolean(searchQuery);

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

          {activeColumnFilters.map(([key, values]) => (
            <button
              key={key}
              onClick={() => setColumnFilter(key, null)}
              style={{
                background: 'rgba(16, 124, 65, 0.12)',
                color: '#107c41',
                border: '1px solid rgba(16, 124, 65, 0.35)',
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
              title={`Quitar filtro de ${COLUMN_LABELS[key] || key}`}
            >
              <span>{COLUMN_LABELS[key] || key}: {values.length}</span>
              <span style={{ fontWeight: 'bold' }}>✕</span>
            </button>
          ))}

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

      <div className="takeoff-table-scroll-container" ref={scrollRef}>
        <table className="takeoff-table">
          <TakeoffTableHeader
            columnFilters={columnFilters}
            uniqueValues={uniqueValues}
            onApplyColumnFilter={setColumnFilter}
            colWidths={colWidths}
            onStartResize={handleStartResize}
          />
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--mu)' }}>
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
