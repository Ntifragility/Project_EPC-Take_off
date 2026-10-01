import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TakeoffItem } from '../../../entities/takeoff-item/model/types';
import { TakeoffRow } from './TakeoffRow';
import { TakeoffTableHeader } from './TakeoffTableHeader';
import {
  BASE_COL_WIDTHS,
  COL_WIDTHS_STORAGE_KEY,
  clampColumnWidth,
  defaultWidths,
  fitWidthsToPane
} from './columnWidths';
import { COLUMN_LABELS, uniqueColumnValues } from '../model/columnValue';
import { SELECTABLE_COLS, cellKey, cellsInRect, isSingleCell, rangeEdgesByCol, type CellRef } from '../model/cellRange';
import { isDetalleTriggerRow } from '../../../entities/takeoff-rule/model/instanceRebuild';
import { mergeItemsByDetalle } from '../../../entities/takeoff-item/model/itemAggregation';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';

export interface TakeoffTableProps {
  items: TakeoffItem[];
}

const EMPTY_SELECTED_IDS: string[] = [];

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
  if (colKey === 'detalle') return slice.filter(it => isDetalleTriggerRow(it, rows)).map(i => i.id);
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
    batchUpdateField,
    customPlano,
    customRev,
    syncContextToItemIds
  } = useItemsStore();

  const section = useAppStore(state => state.section);
  const showToast = useUIStore(state => state.showToast);

  const {
    columnFilters,
    setColumnFilter,
    searchQuery,
    clearFilters,
    fitTableNonce,
    isMergedView,
    setSelectedItemIds
  } = useUIStore();

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      if (saved) {
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
  const lastPaneWidthRef = useRef(0);
  const applyFitRef = useRef<(persist: boolean, force?: boolean) => void>(() => {});

  const applyFit = (persist: boolean, force = false) => {
    const el = scrollRef.current;
    if (!el || !el.clientWidth) return;
    if (resizingRef.current) return;
    const pane = el.clientWidth;
    if (!force && Math.abs(pane - lastPaneWidthRef.current) < 2) return;
    lastPaneWidthRef.current = pane;
    const next = fitWidthsToPane(pane);
    setColWidths(next);
    if (persist) {
      try {
        localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
    }
  };
  applyFitRef.current = applyFit;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => applyFitRef.current(true), 80);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    schedule();
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (fitTableNonce === 0) return;
    applyFit(true, true);
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
  const [rangeFocus, setRangeFocus] = useState<CellRef | null>(null);
  const selectedCellRef = useRef(selectedCell);
  const rangeFocusRef = useRef(rangeFocus);
  selectedCellRef.current = selectedCell;
  rangeFocusRef.current = rangeFocus;
  const selectingRangeRef = useRef(false);
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
      if (applied && session.colKey !== 'detalle') {
        showToastRef.current(
          `Copiado "${session.sourceValue ?? ''}" a ${session.targetItemIds.length} ítem(s) principal(es)`,
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

  const handleSelectCell = (itemId: string, colKey: string, value: any, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.excel-fill-handle, .act-row-floating')) return;
    selectingRangeRef.current = true;
    const anchor = selectedCellRef.current;

    if (e.shiftKey && anchor) {
      rangeFocusRef.current = { itemId, colKey };
      setRangeFocus(rangeFocusRef.current);
      return;
    }

    const next = { itemId, colKey, value };
    selectedCellRef.current = next;
    rangeFocusRef.current = null;
    setSelectedCell(next);
    setRangeFocus(null);
  };

  const handleCellMouseEnter = (itemId: string, colKey: string, e?: React.MouseEvent) => {
    applyFillHover(itemId, colKey);
    if (fillSessionRef.current.isDragging) return;
    const dragging = selectingRangeRef.current || (e && e.buttons === 1);
    if (dragging && selectedCellRef.current) {
      rangeFocusRef.current = { itemId, colKey };
      setRangeFocus(rangeFocusRef.current);
    }
  };

  useEffect(() => {
    const onUp = () => {
      selectingRangeRef.current = false;
    };
    const onMove = (ev: MouseEvent) => {
      if (!selectingRangeRef.current || ev.buttons !== 1) return;
      if (fillSessionRef.current.isDragging) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const cell = el?.closest('td.excel-cell') as HTMLElement | null;
      if (!cell) return;
      const itemId = cell.getAttribute('data-item-id');
      const colKey = cell.getAttribute('data-col-key');
      if (!itemId || !colKey) return;
      if (!SELECTABLE_COLS.includes(colKey as (typeof SELECTABLE_COLS)[number])) return;
      const focus = rangeFocusRef.current;
      if (focus?.itemId === itemId && focus?.colKey === colKey) return;
      rangeFocusRef.current = { itemId, colKey };
      setRangeFocus(rangeFocusRef.current);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        selectedCellRef.current = null;
        rangeFocusRef.current = null;
        setSelectedCell(null);
        setRangeFocus(null);
      }
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const rangeKeys = useMemo(() => {
    if (!selectedCell) return new Set<string>();
    return cellsInRect(visibleItems, selectedCell, rangeFocus || selectedCell);
  }, [selectedCell, rangeFocus, visibleItems]);

  const rangeIsSingle = Boolean(selectedCell && isSingleCell(selectedCell, rangeFocus));

  const selectedItemIds = useMemo(() => {
    if (!selectedCell) return EMPTY_SELECTED_IDS;
    const ids = new Set<string>();
    rangeKeys.forEach(key => {
      const id = key.split('::')[0];
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [selectedCell, rangeKeys]);

  useEffect(() => {
    const prev = useUIStore.getState().selectedItemIds;
    const same =
      prev.length === selectedItemIds.length &&
      prev.every((id, i) => id === selectedItemIds[i]);
    if (same) return;
    setSelectedItemIds(selectedItemIds);
  }, [selectedItemIds, setSelectedItemIds]);

  useEffect(() => {
    return () => {
      if (useUIStore.getState().selectedItemIds.length === 0) return;
      setSelectedItemIds(EMPTY_SELECTED_IDS);
    };
  }, [setSelectedItemIds]);

  const handleSyncPlanoRev = () => {
    if (selectedItemIds.length === 0) {
      showToast('Selecciona celdas para sincronizar plano y rev', 'warn');
      return;
    }
    const applied = syncContextToItemIds(selectedItemIds, section);
    if (applied) {
      showToast(
        `Plano "${customPlano || '—'}" / Rev "${customRev || '—'}" aplicado a la selección`,
        'success'
      );
    }
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
    const row = allItems.find(it => it.id === itemId);
    if (row && row.material !== 'P') {
      showToast('Solo se editan ítems principales (P). Los consumibles se actualizan desde el P.', 'warn');
      return;
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

          {selectedItemIds.length > 0 && (
            <button
              type="button"
              className="btn-sync-selection"
              onClick={handleSyncPlanoRev}
              title={`Aplicar plano ${customPlano || '(vacío)'} y rev ${customRev || '(vacío)'} del panel a las filas seleccionadas`}
            >
              ↻ Plano / Rev
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
                const isActiveRow = selectedCell?.itemId === item.id;
                const isEditingThisRow = editingCell?.itemId === item.id;
                const isTargetRow = dragFill.isDragging && dragFill.targetItemIds.includes(item.id);
                const rowSelectedCols = SELECTABLE_COLS.filter(c => rangeKeys.has(cellKey(item.id, c)));
                const rowRangeEdges = rangeEdgesByCol(visibleItems, rangeKeys, item.id);

                return (
                  <TakeoffRow
                    key={item.id}
                    item={item}
                    index={startIndex + idx + 1}
                    isEditing={editingItemId === item.id}
                    availablePlanos={availablePlanos}
                    onStartEdit={() => setEditingItemId(item.id)}
                    onCancelEdit={() => setEditingItemId(null)}
                    selectedColKey={isActiveRow ? selectedCell?.colKey : isTargetRow ? dragFill.colKey : null}
                    selectedColKeys={rowSelectedCols}
                    rangeEdgesByCol={rowRangeEdges}
                    editingColKey={isEditingThisRow ? editingCell?.colKey : null}
                    isFillTarget={isTargetRow}
                    showFillHandle={rangeIsSingle && !dragFill.isDragging}
                    onSelectCell={(colKey, val, e) => {
                      handleSelectCell(item.id, colKey, val, e);
                    }}
                    onStartInlineEdit={(colKey) => {
                      setEditingCell({ itemId: item.id, colKey });
                    }}
                    onSaveInlineEdit={(colKey, val) => {
                      handleSaveInlineCell(item.id, colKey, val);
                    }}
                    onCancelInlineEdit={() => setEditingCell(null)}
                    onStartFillDrag={(colKey, val, e) => {
                      if (!rangeIsSingle) return;
                      handleStartFillDrag(item.id, colKey, val, e);
                    }}
                    onCellMouseEnter={(colKey, e) => {
                      handleCellMouseEnter(item.id, colKey, e);
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
