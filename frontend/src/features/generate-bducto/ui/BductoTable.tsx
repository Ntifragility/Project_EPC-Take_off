import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BductoRow } from '../../../entities/bducto/model/types';
import { applyBductoGroupField, isBductoEditableColumn } from '../../../entities/bducto/model/bductoEdit';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { cellKey, cellsInRect, extendSelection, isSingleCell, rangeEdgesByCol, type CellRef, type RangeEdges } from '../../../widgets/takeoff-table/model/cellRange';
import { ExcelColumnFilter } from '../../../widgets/takeoff-table/ui/ExcelColumnFilter';
import { useBductoStore } from '../model/useBductoStore';
import { BductoDisplayRow, presentBductoRows } from '../model/bductoView';
import { BDUCTO_COLUMNS, bductoCell } from '../model/exportBductosExcel';

const SELECTABLE = BDUCTO_COLUMNS.map(column => column.key);
const NUM_WIDTH = 52;

const WIDTH_KEY = 'epc-bducto-col-widths-v1';

const BASE_WIDTHS: Record<string, number> = {
  partidaSicme: 120,
  partida: 110,
  sector: 78,
  wbs: 68,
  tagUnico: 190,
  plano: 168,
  rev: 52,
  seccion: 78,
  desde: 118,
  hasta: 118,
  descripcion: 280,
  diametro: 150,
  longitudM: 108,
  cantXd: 78,
  metrado: 88,
  und: 56,
  comentario: 110
};

function minWidth(key: string): number {
  return Math.round((BASE_WIDTHS[key] ?? 80) * 0.7);
}

function maxWidth(key: string): number {
  return Math.round((BASE_WIDTHS[key] ?? 80) * 2);
}

function clampWidth(key: string, width: number): number {
  return Math.min(maxWidth(key), Math.max(minWidth(key), Math.round(width)));
}

function fitWidths(paneWidth: number): Record<string, number> {
  const keys = BDUCTO_COLUMNS.map(column => column.key);
  const usable = Math.max(320, Math.floor(paneWidth) - 8 - NUM_WIDTH);
  const mins = Object.fromEntries(keys.map(key => [key, minWidth(key)]));
  const minSum = keys.reduce((sum, key) => sum + mins[key], 0);
  if (usable <= minSum) return mins;

  const baseSum = keys.reduce((sum, key) => sum + (BASE_WIDTHS[key] ?? 80), 0);
  const scale = usable / baseSum;
  const entries = keys.map(key => ({
    key,
    width: Math.max(mins[key], Math.round((BASE_WIDTHS[key] ?? 80) * scale))
  }));

  let overflow = entries.reduce((sum, col) => sum + col.width, 0) - usable;
  for (const key of ['descripcion', 'tagUnico', 'plano', 'diametro', 'desde', 'hasta']) {
    if (overflow <= 0) break;
    const col = entries.find(entry => entry.key === key);
    if (!col) continue;
    const take = Math.min(overflow, col.width - mins[key]);
    col.width -= take;
    overflow -= take;
  }

  const leftover = usable - entries.reduce((sum, col) => sum + col.width, 0);
  const desc = entries.find(entry => entry.key === 'descripcion');
  if (desc && leftover > 0) desc.width += leftover;
  return Object.fromEntries(entries.map(col => [col.key, col.width]));
}

function cellText(key: string, value: string | number): string {
  if (typeof value !== 'number') return value;
  if (key === 'cantXd') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return value.toFixed(2);
}

function filterText(row: BductoRow, key: string): string {
  return cellText(key, bductoCell(row, key));
}

function rowMatchesFilters(row: BductoRow, columnFilters: Record<string, string[]>): boolean {
  for (const [key, allowed] of Object.entries(columnFilters)) {
    if (!allowed.includes(filterText(row, key))) return false;
  }
  return true;
}

/** Excel status bar: Recuento is non-empty cells, Suma adds numbers only. */
function selectionStats(rows: BductoRow[], keys: Set<string>): { count: number; sum: number; hasNumbers: boolean } {
  const byId = new Map(rows.map(row => [row.id, row]));
  let count = 0;
  let sum = 0;
  let hasNumbers = false;
  keys.forEach(key => {
    const split = key.indexOf('::');
    const row = byId.get(key.slice(0, split));
    if (!row) return;
    const value = bductoCell(row, key.slice(split + 2));
    if (value === '') return;
    count += 1;
    if (typeof value === 'number' && Number.isFinite(value)) {
      sum += value;
      hasNumbers = true;
    }
  });
  return { count, sum: Math.round(sum * 100) / 100, hasNumbers };
}

function formatStat(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function edgeClass(edges?: RangeEdges): string {
  if (!edges) return '';
  return [
    'is-range-selected',
    edges.top ? 'is-range-edge-top' : '',
    edges.bottom ? 'is-range-edge-bottom' : '',
    edges.left ? 'is-range-edge-left' : '',
    edges.right ? 'is-range-edge-right' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function idsInFillRange(rows: BductoDisplayRow[], sourceId: string, targetId: string): string[] {
  const sourceIdx = rows.findIndex(row => row.id === sourceId);
  const targetIdx = rows.findIndex(row => row.id === targetId);
  if (sourceIdx < 0 || targetIdx < 0 || sourceIdx === targetIdx) return [];
  const start = Math.min(sourceIdx, targetIdx);
  const end = Math.max(sourceIdx, targetIdx);
  return rows.slice(start, end + 1).filter(row => row.id !== sourceId).map(row => row.id);
}

export const BductoTable: React.FC<{ rows: BductoRow[] }> = ({ rows }) => {
  const fitTableNonce = useUIStore(state => state.fitTableNonce);
  const showToast = useUIStore(state => state.showToast);
  const patchRows = useBductoStore(state => state.patchRows);
  const detailView = useBductoStore(state => state.detailView);
  const accessoryView = useBductoStore(state => state.accessoryView);
  const displayRows = useMemo(() => presentBductoRows(rows, detailView, accessoryView), [rows, detailView, accessoryView]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastPaneRef = useRef(0);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(WIDTH_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, number>;
        return Object.fromEntries(BDUCTO_COLUMNS.map(column => [column.key, clampWidth(column.key, parsed[column.key] || BASE_WIDTHS[column.key])]));
      }
    } catch {
      /* use the fitted defaults */
    }
    return fitWidths(typeof window !== 'undefined' ? window.innerWidth : 1400);
  });

  const applyFit = (force = false) => {
    const el = scrollRef.current;
    if (!el || !el.clientWidth || resizingRef.current) return;
    if (!force && Math.abs(el.clientWidth - lastPaneRef.current) < 2) return;
    lastPaneRef.current = el.clientWidth;
    const next = fitWidths(el.clientWidth);
    setColWidths(next);
    try {
      localStorage.setItem(WIDTH_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => applyFit(false), 80);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    schedule();
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const fitSeenRef = useRef(fitTableNonce);

  useEffect(() => {
    if (fitTableNonce === fitSeenRef.current) return;
    fitSeenRef.current = fitTableNonce;
    applyFit(true);
    showToast('Columnas ajustadas al ancho de la pantalla', 'success');
  }, [fitTableNonce]);

  const startResize = (key: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    resizingRef.current = { key, startX: event.clientX, startWidth: colWidths[key] || BASE_WIDTHS[key] };

    const onMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const next = clampWidth(resizingRef.current.key, resizingRef.current.startWidth + moveEvent.clientX - resizingRef.current.startX);
      setColWidths(current => ({ ...current, [resizingRef.current!.key]: next }));
    };
    const onUp = () => {
      resizingRef.current = null;
      setColWidths(latest => {
        try {
          localStorage.setItem(WIDTH_KEY, JSON.stringify(latest));
        } catch {
          /* ignore */
        }
        return latest;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const [selectedCell, setSelectedCell] = useState<CellRef | null>(null);
  const [rangeFocus, setRangeFocus] = useState<CellRef | null>(null);
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [dragFill, setDragFill] = useState<{ sourceId: string; colKey: string; value: string; targetIds: string[] } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const selectedRef = useRef(selectedCell);
  const rangeRef = useRef(rangeFocus);
  const selectingRef = useRef(false);
  const fillRef = useRef(dragFill);
  const rowsRef = useRef(rows);
  const visibleRef = useRef<BductoDisplayRow[]>(rows);
  const editingRef = useRef(editingCell);
  const patchRef = useRef(patchRows);
  const toastRef = useRef(showToast);
  selectedRef.current = selectedCell;
  rangeRef.current = rangeFocus;
  fillRef.current = dragFill;
  const columnValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    for (const column of BDUCTO_COLUMNS) {
      const unique = new Set(displayRows.map(row => filterText(row, column.key)));
      values[column.key] = Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }
    return values;
  }, [displayRows]);

  const visibleRows = useMemo(
    () => displayRows.filter(row => rowMatchesFilters(row, columnFilters)),
    [displayRows, columnFilters]
  );
  const numberById = useMemo(() => new Map(rows.map((row, index) => [row.id, index + 1])), [rows]);

  rowsRef.current = rows;
  visibleRef.current = visibleRows;
  editingRef.current = editingCell;
  patchRef.current = patchRows;
  toastRef.current = showToast;

  const rangeKeys = useMemo(() => {
    if (!selectedCell) return new Set<string>();
    return cellsInRect(visibleRows, selectedCell, rangeFocus || selectedCell, SELECTABLE);
  }, [visibleRows, selectedCell, rangeFocus]);

  const applyColumnFilter = (key: string, values: string[] | null) => {
    setColumnFilters(current => {
      const next = { ...current };
      if (values == null) delete next[key];
      else next[key] = values;
      return next;
    });
    setSelectedCell(null);
    setRangeFocus(null);
  };

  const rangeIsSingle = Boolean(selectedCell && isSingleCell(selectedCell, rangeFocus));
  const stats = useMemo(() => (rangeKeys.size === 0 ? null : selectionStats(visibleRows, rangeKeys)), [visibleRows, rangeKeys]);

  const storedSeeds = (target: BductoDisplayRow): BductoRow[] => {
    if (!target.viewMemberIds) return rowsRef.current.filter(row => row.id === target.id);
    const ids = new Set(target.viewMemberIds);
    return rowsRef.current.filter(row => ids.has(row.id));
  };

  const applyEdits = (targets: BductoDisplayRow[], key: string, value: string) => {
    if (targets.some(row => row.viewEdit === 'locked')) {
      toastRef.current('Esta fila junta varios tramos. Vuelve a Separados para editarla.', 'warn');
      return;
    }
    if (key === 'tagUnico' && targets.some(row => row.viewEdit === 'group')) {
      toastRef.current('Los tags de esta fila son distintos. Vuelve a Separado para editarlos.', 'warn');
      return;
    }
    const seeds = targets.flatMap(storedSeeds);
    const result = applyBductoGroupField(rowsRef.current, seeds, key, value);
    if (result.ok === false) {
      toastRef.current(result.error, 'warn');
      return;
    }
    if (result.rows.length === 0) return;
    patchRef.current(result.rows);
    const count = result.rows.length;
    if (key === 'plano') {
      toastRef.current(`Plano aplicado al tramo (${count} filas). Cada tag único usa la nueva raíz.`, 'info');
    } else if (key === 'rev') {
      toastRef.current(`REV aplicada al tramo (${count} filas).`, 'info');
    } else if (count > 1) {
      toastRef.current(`Copiado a ${count} filas.`, 'info');
    }
  };

  const commitEdit = (row: BductoDisplayRow, key: string, value: string) => {
    if (!editingRef.current) return;
    editingRef.current = null;
    setEditingCell(null);
    applyEdits([row], key, value);
  };

  const finishFill = () => {
    const session = fillRef.current;
    fillRef.current = null;
    setDragFill(null);
    document.body.classList.remove('is-fill-dragging');
    if (!session || session.targetIds.length === 0) return;
    const targets = session.targetIds
      .map(id => visibleRef.current.find(row => row.id === id))
      .filter((row): row is BductoDisplayRow => Boolean(row));
    applyEdits(targets, session.colKey, session.value);
  };

  useEffect(() => {
    const onUp = () => {
      selectingRef.current = false;
    };
    const onMove = (event: MouseEvent) => {
      if (fillRef.current) {
        const cells = document.querySelectorAll(`td[data-col-key="${fillRef.current.colKey}"]`);
        let hovered: string | null = null;
        for (const cell of cells) {
          const rect = cell.getBoundingClientRect();
          if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
            hovered = cell.getAttribute('data-item-id');
            break;
          }
        }
        if (!hovered || !fillRef.current) return;
        const targetIds = idsInFillRange(visibleRef.current, fillRef.current.sourceId, hovered);
        if (targetIds.join() === fillRef.current.targetIds.join()) return;
        const next = { ...fillRef.current, targetIds };
        fillRef.current = next;
        setDragFill(next);
        return;
      }
      if (!selectingRef.current || event.buttons !== 1 || !selectedRef.current) return;
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const cell = el?.closest('td.excel-cell') as HTMLElement | null;
      const itemId = cell?.getAttribute('data-item-id');
      const colKey = cell?.getAttribute('data-col-key');
      if (!itemId || !colKey || !(SELECTABLE as string[]).includes(colKey)) return;
      if (rangeRef.current?.itemId === itemId && rangeRef.current.colKey === colKey) return;
      const focus = { itemId, colKey };
      rangeRef.current = focus;
      setRangeFocus(focus);
    };
    const onKey = (event: KeyboardEvent) => {
      if (editingRef.current) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], .modal, .excel-filter-menu')) return;
      if (event.key === 'Escape') {
        selectedRef.current = null;
        rangeRef.current = null;
        setSelectedCell(null);
        setRangeFocus(null);
        return;
      }
      if (!event.shiftKey || !selectedRef.current) return;
      const next = extendSelection(visibleRef.current, SELECTABLE, selectedRef.current, rangeRef.current, event.key);
      if (!next) return;
      event.preventDefault();
      if (next.itemId === (rangeRef.current ?? selectedRef.current).itemId && next.colKey === (rangeRef.current ?? selectedRef.current).colKey) return;
      rangeRef.current = next;
      setRangeFocus(next);
      document
        .querySelector(`td[data-item-id="${CSS.escape(next.itemId)}"][data-col-key="${CSS.escape(next.colKey)}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseup', finishFill);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseup', finishFill);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('is-fill-dragging');
    };
  }, []);

  useEffect(() => {
    selectedRef.current = null;
    rangeRef.current = null;
    setSelectedCell(null);
    setRangeFocus(null);
  }, [detailView, accessoryView]);

  const tableWidth = NUM_WIDTH + BDUCTO_COLUMNS.reduce((sum, column) => sum + (colWidths[column.key] || BASE_WIDTHS[column.key]), 0);

  const activeFilters = Object.entries(columnFilters);

  return (
    <div className="takeoff-table-wrapper bducto-sheet">
      {activeFilters.length > 0 && (
        <div className="bducto-filter-bar">
          {activeFilters.map(([key, values]) => (
            <button key={key} type="button" className="bducto-filter-chip" onClick={() => applyColumnFilter(key, null)}>
              <span>{BDUCTO_COLUMNS.find(column => column.key === key)?.label || key}: {values.length}</span>
              <span>✕</span>
            </button>
          ))}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setColumnFilters({});
              setSelectedCell(null);
              setRangeFocus(null);
            }}
          >
            Quitar filtros
          </button>
        </div>
      )}
      <div className="takeoff-table-scroll-container" ref={scrollRef}>
        <table className="takeoff-table" style={{ width: tableWidth }}>
          <thead>
            <tr>
              <th className="th-n" style={{ width: NUM_WIDTH }}>
                <div className="th-filter-row">
                  <span>N°</span>
                </div>
              </th>
              {BDUCTO_COLUMNS.map(column => {
                const width = colWidths[column.key] || BASE_WIDTHS[column.key];
                return (
                  <th key={column.key} className="th-resizable" style={{ width }}>
                    <div className="th-filter-row">
                      <span>{column.label}</span>
                      <ExcelColumnFilter
                        values={columnValues[column.key] || []}
                        selected={columnFilters[column.key]}
                        onApply={values => applyColumnFilter(column.key, values)}
                      />
                    </div>
                    <div
                      className="col-resizer"
                      title="Arrastra para ajustar la columna"
                      onMouseDown={event => startResize(column.key, event)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td className="td-d" colSpan={BDUCTO_COLUMNS.length + 1}>
                  Ninguna fila coincide con el filtro.
                </td>
              </tr>
            )}
            {visibleRows.map((row, index) => {
              const edges = rangeEdgesByCol(visibleRows, rangeKeys, row.id, SELECTABLE);
              const memberNumbers = row.viewMemberIds
                ?.map(id => numberById.get(id))
                .filter((value): value is number => value != null) ?? [];
              const rowNumber = numberById.get(row.id) ?? (memberNumbers.length > 0 ? Math.min(...memberNumbers) : index + 1);
              return (
                <tr key={row.id} data-kind={row.kind} data-tag={row.tagUnico}>
                  <td className="td-n" style={{ width: NUM_WIDTH }}>
                    <span>{rowNumber}</span>
                  </td>
                  {BDUCTO_COLUMNS.map(column => {
                    const value = bductoCell(row, column.key);
                    const text = cellText(column.key, value);
                    const columnEditable = isBductoEditableColumn(column.key);
                    const editable = columnEditable && row.viewEdit !== 'locked' && !(row.viewEdit === 'group' && column.key === 'tagUnico');
                    const isEditing = editingCell?.itemId === row.id && editingCell.colKey === column.key;
                    const isFillTarget = Boolean(dragFill && dragFill.colKey === column.key && dragFill.targetIds.includes(row.id));
                    const showHandle = editable && rangeIsSingle && selectedCell?.itemId === row.id && selectedCell.colKey === column.key && !dragFill && !isEditing;
                    const title = row.viewEdit === 'locked'
                      ? 'Esta fila junta varios tramos. Vuelve a Separados para editarla.'
                      : row.viewEdit === 'group' && column.key === 'tagUnico'
                        ? 'Los tags de esta fila son distintos. Vuelve a Separado para editarlos.'
                        : column.key === 'descripcion'
                          ? 'La descripción no se edita'
                          : editable
                            ? 'Doble clic para editar. PLANO y REV se aplican a todo el tramo, y cada tag único sigue la nueva raíz.'
                            : 'Solo lectura';
                    return (
                      <td
                        key={column.key}
                        className={`excel-cell ${column.key === 'descripcion' ? 'td-d' : 'td-u'} ${column.numeric ? 'bducto-num' : ''} ${edgeClass(edges[column.key])} ${isFillTarget ? 'excel-cell-fill-target' : ''}`}
                        style={{ width: colWidths[column.key] }}
                        data-item-id={row.id}
                        data-col-key={column.key}
                        title={title}
                        onMouseDown={event => {
                          if (event.button !== 0) return;
                          if ((event.target as HTMLElement).closest('.excel-fill-handle')) return;
                          selectingRef.current = true;
                          if (event.shiftKey && selectedRef.current) {
                            const focus = { itemId: row.id, colKey: column.key };
                            rangeRef.current = focus;
                            setRangeFocus(focus);
                            return;
                          }
                          const next = { itemId: row.id, colKey: column.key };
                          selectedRef.current = next;
                          rangeRef.current = null;
                          setSelectedCell(next);
                          setRangeFocus(null);
                        }}
                        onDoubleClick={() => {
                          if (!editable) {
                            if (row.viewEdit === 'locked') toastRef.current('Esta fila junta varios tramos. Vuelve a Separados para editarla.', 'warn');
                            else if (row.viewEdit === 'group' && column.key === 'tagUnico') toastRef.current('Los tags de esta fila son distintos. Vuelve a Separado para editarlos.', 'warn');
                            else if (column.key === 'descripcion') toastRef.current('La descripción no se edita.', 'warn');
                            return;
                          }
                          const next = { itemId: row.id, colKey: column.key };
                          editingRef.current = next;
                          setEditingCell(next);
                        }}
                      >
                        {isEditing ? (
                          <input
                            className="excel-inline-input"
                            defaultValue={text}
                            autoFocus
                            aria-label={`Editar ${column.label}`}
                            onBlur={event => commitEdit(row, column.key, event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                commitEdit(row, column.key, event.currentTarget.value);
                              } else if (event.key === 'Escape') {
                                editingRef.current = null;
                                setEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <span>{text}</span>
                        )}
                        {showHandle && (
                          <div
                            className="excel-fill-handle"
                            role="button"
                            aria-label={`Copiar ${column.label} hacia abajo`}
                            onMouseDown={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              selectingRef.current = false;
                              const session = { sourceId: row.id, colKey: column.key, value: text, targetIds: [] as string[] };
                              fillRef.current = session;
                              setDragFill(session);
                              document.body.classList.add('is-fill-dragging');
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="excel-status-bar" role="status" aria-live="polite">
        {stats && stats.count > 0 && <span>Recuento: <strong>{stats.count}</strong></span>}
        {stats && stats.hasNumbers && <span>Suma: <strong>{formatStat(stats.sum)}</strong></span>}
      </div>
    </div>
  );
};
