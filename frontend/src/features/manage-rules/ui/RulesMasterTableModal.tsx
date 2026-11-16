import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cleanFloat } from '../../../shared/lib/cleanNumber';
import { SectionType } from '../../../shared/types/common';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { siteAlert, siteConfirm } from '../../../shared/ui/askSite';
import { ExcelStatusBar, computeSelectionStats } from '../../../shared/ui/ExcelStatusBar';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import {
  CellRef,
  cellKey,
  cellsInRect,
  extendSelection,
  rangeEdgesForCell
} from '../../../widgets/takeoff-table/model/cellRange';
import {
  MasterImportPlan,
  MasterRowOrigen,
  MasterRuleRow,
  buildMasterRuleRows,
  exportMasterRulesExcel,
  parseMasterRulesExcel
} from '../model/rulesMasterTable';

const MASTER_COLS = [
  'area',
  'subArea',
  'origen',
  'ruleTrigger',
  'tagPrefix',
  'detalle',
  'material',
  'desc',
  'formulaMetrado',
  'unit',
  'optional'
] as const;

type MasterColKey = (typeof MASTER_COLS)[number];

const ORIGEN_LABELS: Record<MasterRowOrigen, string> = {
  REGLA: 'Regla',
  CABLE_2_0: 'Cable 2/0',
  BARRA_POT: 'Barra Pot.',
  BARRA_INST: 'Barra Inst.',
  MATRIZ_BANDEJA: 'Matriz Bandeja'
};

interface RulesMasterTableModalProps {
  rules: TakeoffRule[];
  canEdit: boolean;
  section: SectionType;
  detalleVariantsVersion: number;
  onApplyImport: (
    plan: MasterImportPlan,
    section: SectionType
  ) => Promise<{ ok: boolean; remoteSynced: boolean }>;
  onClose: () => void;
}

function getRowCellStatValue(row: MasterRuleRow, colKey: string): string | number {
  switch (colKey as MasterColKey) {
    case 'area':
      return row.area;
    case 'subArea':
      return row.subArea;
    case 'origen':
      return row.origen;
    case 'ruleTrigger':
      return row.ruleTrigger;
    case 'tagPrefix':
      return row.tagPrefix;
    case 'detalle':
      return row.detalle;
    case 'material':
      return row.material;
    case 'desc':
      return row.desc;
    case 'formulaMetrado': {
      const trimmed = row.formulaMetrado.trim();
      if (!trimmed) return '';
      const normalized = trimmed.replace(',', '.');
      if (/^-?\d+(\.\d+)?$/.test(normalized)) {
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) return cleanFloat(parsed);
      }
      return trimmed;
    }
    case 'unit':
      return row.unit;
    case 'optional':
      return row.optional ? 'SI' : 'NO';
    default:
      return '';
  }
}

export const RulesMasterTableModal: React.FC<RulesMasterTableModalProps> = ({
  rules,
  canEdit,
  section,
  detalleVariantsVersion,
  onApplyImport,
  onClose
}) => {
  const showToast = useUIStore(s => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [areaFilter, setAreaFilter] = useState<'TODAS' | 'AREA SECA' | 'AREA HUMEDA'>('TODAS');
  const [subAreaFilter, setSubAreaFilter] = useState<'TODAS' | 'CORROSIVO' | 'NO_CORROSIVO'>('TODAS');
  const [origenFilter, setOrigenFilter] = useState<'TODOS' | MasterRowOrigen>('TODOS');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const [anchor, setAnchor] = useState<CellRef | null>(null);
  const [focus, setFocus] = useState<CellRef | null>(null);
  const isDraggingRef = useRef(false);

  const allRows = useMemo(
    () => buildMasterRuleRows(rules),
    [rules, detalleVariantsVersion]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toUpperCase();
    return allRows.filter(row => {
      if (areaFilter !== 'TODAS' && row.area !== areaFilter) return false;
      if (subAreaFilter !== 'TODAS' && row.subArea !== subAreaFilter) return false;
      if (origenFilter !== 'TODOS' && row.origen !== origenFilter) return false;
      if (!q) return true;
      const haystack = [
        row.area,
        row.subArea,
        row.origen,
        row.ruleTrigger,
        row.tagPrefix,
        row.detalle,
        row.desc,
        row.formulaMetrado,
        row.unit
      ]
        .join(' ')
        .toUpperCase();
      return haystack.includes(q);
    });
  }, [allRows, areaFilter, subAreaFilter, origenFilter, search]);

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (!anchor) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setAnchor(null);
        setFocus(null);
        return;
      }
      if (event.shiftKey && event.key.startsWith('Arrow')) {
        const next = extendSelection(filteredRows, MASTER_COLS, anchor, focus, event.key);
        if (next) {
          event.preventDefault();
          setFocus(next);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anchor, focus, filteredRows]);

  const selectedKeys = useMemo(() => {
    if (!anchor) return new Set<string>();
    return cellsInRect(filteredRows, anchor, focus ?? anchor, MASTER_COLS);
  }, [filteredRows, anchor, focus]);

  const selectionStats = useMemo(
    () => computeSelectionStats(filteredRows, selectedKeys, getRowCellStatValue),
    [filteredRows, selectedKeys]
  );

  const handleCellMouseDown = (event: React.MouseEvent, itemId: string, colKey: MasterColKey) => {
    if (event.button !== 0) return;
    const cell: CellRef = { itemId, colKey };
    if (event.shiftKey && anchor) {
      setFocus(cell);
      return;
    }
    setAnchor(cell);
    setFocus(null);
    isDraggingRef.current = true;
  };

  const handleCellMouseEnter = (itemId: string, colKey: MasterColKey) => {
    if (!isDraggingRef.current || !anchor) return;
    setFocus({ itemId, colKey });
  };

  const renderCellClasses = (itemId: string, colKey: MasterColKey, extra?: string) => {
    const edges = rangeEdgesForCell(filteredRows, selectedKeys, itemId, colKey, MASTER_COLS);
    const classes = ['excel-cell'];
    if (extra) classes.push(extra);
    if (edges) {
      classes.push('is-range-selected');
      if (edges.top) classes.push('is-range-edge-top');
      if (edges.bottom) classes.push('is-range-edge-bottom');
      if (edges.left) classes.push('is-range-edge-left');
      if (edges.right) classes.push('is-range-edge-right');
    }
    return classes.join(' ');
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportMasterRulesExcel(filteredRows);
      showToast(`Exportadas ${filteredRows.length} líneas de reglas y detalles a Excel.`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      await siteAlert(`No se pudo exportar el Excel: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const plan = await parseMasterRulesExcel(file, rules);
      const totalChanges = plan.variants.length + plan.updatedRules.length + plan.createdRules.length;

      if (totalChanges === 0) {
        const detail =
          plan.rejectedRows.length > 0
            ? `\n\nMotivo principal: ${plan.rejectedRows[0].reason}`
            : '';
        await siteAlert(`No se detectaron reglas ni variantes válidas para importar.${detail}`);
        return;
      }

      const lines = [
        `Archivo: ${file.name} (${plan.totalRowsRead} filas leídas)`,
        `• Variantes de detalle a actualizar: ${plan.variants.length}`,
        `• Reglas existentes a actualizar: ${plan.updatedRules.length}`,
        `• Nuevas reglas a crear: ${plan.createdRules.length}`
      ];
      if (plan.rejectedRows.length > 0) {
        const previewErrors = plan.rejectedRows
          .slice(0, 3)
          .map(r => `Fila ${r.rowNumber}: ${r.reason}`)
          .join(' | ');
        lines.push(`• Filas omitidas: ${plan.rejectedRows.length} (${previewErrors})`);
      }
      lines.push('', '¿Aplicar esta actualización al catálogo de reglas y detalles?');

      const confirmed = await siteConfirm(lines.join('\n'));
      if (!confirmed) return;

      const result = await onApplyImport(plan, section);
      if (result.ok) {
        showToast(
          result.remoteSynced
            ? `Importación aplicada (${plan.variants.length} variantes, ${plan.updatedRules.length} actualizadas, ${plan.createdRules.length} nuevas) y sincronizada con Base de Datos.`
            : `Importación aplicada localmente (${plan.variants.length} variantes, ${plan.updatedRules.length} actualizadas, ${plan.createdRules.length} nuevas). Base de Datos no disponible.`,
          result.remoteSynced ? 'success' : 'info'
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al leer el archivo';
      await siteAlert(`Error al importar Excel: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Tabla general de reglas y detalles"
      subtitle={`Vista consolidada de todas las reglas y variantes (${filteredRows.length} de ${allRows.length} líneas)`}
      maxWidth="1280px"
      closeDisabled={busy}
      onClose={onClose}
    >
      <div
        className="modal-body"
        style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <select
              aria-label="Filtrar por Área"
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value as 'TODAS' | 'AREA SECA' | 'AREA HUMEDA')}
              style={{ width: 'auto', minWidth: '140px' }}
            >
              <option value="TODAS">Área: Todas</option>
              <option value="AREA SECA">Área Seca</option>
              <option value="AREA HUMEDA">Área Húmeda</option>
            </select>

            <select
              aria-label="Filtrar por Sub-área"
              value={subAreaFilter}
              onChange={e => setSubAreaFilter(e.target.value as 'TODAS' | 'CORROSIVO' | 'NO_CORROSIVO')}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="TODAS">Sub-área: Todas</option>
              <option value="NO_CORROSIVO">No corrosivo</option>
              <option value="CORROSIVO">Corrosivo</option>
            </select>

            <select
              aria-label="Filtrar por Origen"
              value={origenFilter}
              onChange={e => setOrigenFilter(e.target.value as 'TODOS' | MasterRowOrigen)}
              style={{ width: 'auto', minWidth: '165px' }}
            >
              <option value="TODOS">Origen: Todos</option>
              <option value="REGLA">Regla</option>
              <option value="CABLE_2_0">Cable 2/0</option>
              <option value="BARRA_POT">Barra Pot.</option>
              <option value="BARRA_INST">Barra Inst.</option>
              <option value="MATRIZ_BANDEJA">Matriz Bandeja</option>
            </select>

            <input
              type="text"
              placeholder="Buscar regla, detalle o material..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '240px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy || filteredRows.length === 0}
              onClick={handleExport}
            >
              Exportar Excel
            </button>

            {canEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {busy ? 'Procesando...' : 'Importar Excel'}
                </button>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: '280px',
            overflow: 'auto',
            border: '1px solid var(--bd)',
            borderRadius: '4px'
          }}
        >
          <table className="takeoff-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Área</th>
                <th>Sub-área</th>
                <th>Origen</th>
                <th>Regla / Disparador</th>
                <th>Prefijo</th>
                <th>Detalle</th>
                <th>Mat</th>
                <th>Descripción del Material</th>
                <th>Fórmula / Metrado</th>
                <th>Unidad</th>
                <th>Opcional</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--mu)' }}>
                    No hay reglas o variantes que coincidan con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRows.map(row => (
                  <tr key={row.id}>
                    <td
                      data-cell-key={cellKey(row.id, 'area')}
                      className={renderCellClasses(row.id, 'area')}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'area')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'area')}
                    >
                      {row.area}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'subArea')}
                      className={renderCellClasses(row.id, 'subArea')}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'subArea')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'subArea')}
                    >
                      {row.subArea}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'origen')}
                      className={renderCellClasses(row.id, 'origen')}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'origen')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'origen')}
                    >
                      {ORIGEN_LABELS[row.origen]}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'ruleTrigger')}
                      className={renderCellClasses(row.id, 'ruleTrigger')}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'ruleTrigger')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'ruleTrigger')}
                    >
                      {row.ruleTrigger}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'tagPrefix')}
                      className={renderCellClasses(row.id, 'tagPrefix')}
                      style={{ textAlign: 'center' }}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'tagPrefix')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'tagPrefix')}
                    >
                      {row.tagPrefix || '—'}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'detalle')}
                      className={renderCellClasses(row.id, 'detalle')}
                      style={{ textAlign: 'center' }}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'detalle')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'detalle')}
                    >
                      {row.detalle || '—'}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'material')}
                      className={renderCellClasses(row.id, 'material')}
                      style={{ textAlign: 'center', fontWeight: 700 }}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'material')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'material')}
                    >
                      {row.material}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'desc')}
                      className={renderCellClasses(row.id, 'desc')}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'desc')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'desc')}
                    >
                      {row.desc}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'formulaMetrado')}
                      className={renderCellClasses(row.id, 'formulaMetrado')}
                      style={{ textAlign: 'right', fontFamily: 'var(--mo)' }}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'formulaMetrado')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'formulaMetrado')}
                    >
                      {row.formulaMetrado}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'unit')}
                      className={renderCellClasses(row.id, 'unit')}
                      style={{ textAlign: 'center' }}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'unit')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'unit')}
                    >
                      {row.unit}
                    </td>
                    <td
                      data-cell-key={cellKey(row.id, 'optional')}
                      className={renderCellClasses(row.id, 'optional')}
                      style={{ textAlign: 'center' }}
                      onMouseDown={e => handleCellMouseDown(e, row.id, 'optional')}
                      onMouseEnter={() => handleCellMouseEnter(row.id, 'optional')}
                    >
                      {row.optional ? 'SI' : 'NO'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ExcelStatusBar stats={selectionStats} />
      </div>
    </ModalShell>
  );
};
