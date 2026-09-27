import React, { useState, useEffect, useRef } from 'react';
import { TakeoffItem, MaterialType } from '../../../entities/takeoff-item/model/types';
import { isCountable } from '../../../entities/takeoff-item/model/materialClassifier';
import { generateTagUnico } from '../../../entities/takeoff-item/model/tagGenerator';
import { getDetallesForArea, hasSoporteItems, hasJumperItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { isDetalleTriggerRow } from '../../../entities/takeoff-rule/model/instanceRebuild';

export interface TakeoffRowProps {
  item: TakeoffItem;
  index: number;
  isEditing: boolean;
  availablePlanos?: string[];
  onStartEdit: () => void;
  onCancelEdit: () => void;
  selectedColKey?: string | null;
  selectedColKeys?: string[];
  editingColKey?: string | null;
  isFillTarget?: boolean;
  showFillHandle?: boolean;
  onSelectCell?: (colKey: string, value: any, e: React.MouseEvent) => void;
  onStartInlineEdit?: (colKey: string) => void;
  onSaveInlineEdit?: (colKey: string, value: any) => void;
  onCancelInlineEdit?: () => void;
  onStartFillDrag?: (colKey: string, value: any, e: React.MouseEvent) => void;
  onCellMouseEnter?: (colKey: string, e: React.MouseEvent) => void;
}

export const TakeoffRow = React.memo<TakeoffRowProps>(({
  item,
  index,
  isEditing,
  availablePlanos = [],
  onStartEdit,
  onCancelEdit,
  selectedColKey = null,
  selectedColKeys = [],
  editingColKey = null,
  isFillTarget = false,
  showFillHandle = true,
  onSelectCell,
  onStartInlineEdit,
  onSaveInlineEdit,
  onCancelInlineEdit,
  onStartFillDrag,
  onCellMouseEnter
}) => {
  const { updateItem, deleteItem, highlightedTag, items: allStoreItems } = useItemsStore();
  const { section, activeArea } = useAppStore();
  const rowRef = useRef<HTMLTableRowElement>(null);

  const [material, setMaterial] = useState<MaterialType>(item.material || 'P');
  const [plano, setPlano] = useState(item.plano || '');
  const [rev, setRev] = useState(item.rev || '');
  const [tagUnico, setTagUnico] = useState(item.tagUnico || '');
  const [tagPlano, setTagPlano] = useState(item.tagPlano || '');
  const [detalle, setDetalle] = useState(item.detalle || '');
  const [qty, setQty] = useState<number | string>(item.qty);
  const [metradoOt, setMetradoOt] = useState(item.metradoOt || '');
  const [unit, setUnit] = useState(item.unit || '');
  const [notes, setNotes] = useState(item.notes || '');

  useEffect(() => {
    if (highlightedTag && item.tagPlano === highlightedTag) {
      if (item.material === 'P' || item.desc.toUpperCase().includes('CABLE')) {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedTag, item.tagPlano, item.material, item.desc]);

  useEffect(() => {
    setMaterial(item.material || 'P');
    setPlano(item.plano || '');
    setRev(item.rev || '');
    setTagUnico(item.tagUnico || '');
    setTagPlano(item.tagPlano || '');
    setDetalle(item.detalle || '');
    setQty(item.qty);
    setMetradoOt(item.metradoOt || '');
    setUnit(item.unit || '');
    setNotes(item.notes || '');
  }, [item, isEditing]);

  const handleSave = () => {
    const finalPlano = plano.toUpperCase();
    const finalTagPlano = tagPlano.trim();

    updateItem(
      item.id,
      {
        material,
        plano: finalPlano,
        rev: rev.toUpperCase(),
        tagPlano: finalTagPlano,
        detalle,
        qty: isCountable(item.desc, section) ? (typeof qty === 'number' ? qty : parseFloat(String(qty)) || 0) : qty,
        metradoOt,
        unit: unit.toUpperCase(),
        notes
      },
      section
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const isHighlighted = Boolean(highlightedTag && item.tagPlano === highlightedTag);

  if (isEditing) {
    return (
      <tr ref={rowRef} className={`tr-edit ${isHighlighted ? 'tr-amber-pulse' : ''}`}>
        <td className="td-n">{index}</td>
        <td className="td-u" style={{ color: item.partida && item.partida !== 'NA' ? 'var(--am)' : 'var(--mu)', fontWeight: 700 }}>
          {item.partida || 'NA'}
        </td>
        <td className="td-u" style={{ color: item.partidaBalance && item.partidaBalance !== 'NA' ? 'var(--am)' : 'var(--mu)', fontWeight: 700 }}>
          {item.partidaBalance || 'NA'}
        </td>
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-mat"
            type="text"
            value={material}
            style={{ textTransform: 'uppercase' }}
            onChange={e => {
              const newMat = e.target.value.toUpperCase() as MaterialType;
              setMaterial(newMat);
              if (newMat === 'P') {
                setTagUnico(generateTagUnico(plano, tagPlano, 'P'));
              } else {
                setTagUnico('');
              }
            }}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <input
              className="edit-input edit-input-mono"
              id="edit-plano"
              type="text"
              list="available-planos-list"
              value={plano}
              style={{ textTransform: 'uppercase', flex: 1, minWidth: '70px' }}
              onChange={e => {
                const newPlano = e.target.value.toUpperCase();
                setPlano(newPlano);
                if (material === 'P') {
                  setTagUnico(generateTagUnico(newPlano, tagPlano, 'P'));
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="PLANO..."
            />
            {availablePlanos && availablePlanos.length > 0 && (
              <select
                value=""
                onChange={e => {
                  if (e.target.value) {
                    const newPlano = e.target.value.toUpperCase();
                    setPlano(newPlano);
                    if (material === 'P') {
                      setTagUnico(generateTagUnico(newPlano, tagPlano, 'P'));
                    }
                  }
                }}
                style={{
                  width: '16px',
                  height: '22px',
                  padding: 0,
                  background: 'var(--s2)',
                  border: '1px solid var(--b1)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  color: 'var(--tx)',
                  fontSize: '9px',
                  textAlign: 'center'
                }}
                title="Seleccionar plano existente"
              >
                <option value="" disabled>▼</option>
                {availablePlanos.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </td>
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-rev"
            type="text"
            value={rev}
            style={{ textTransform: 'uppercase' }}
            onChange={e => setRev(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-t-unico"
            type="text"
            value={tagUnico}
            onChange={e => setTagUnico(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-t-plano"
            type="text"
            value={tagPlano}
            onChange={e => {
              const newTag = e.target.value;
              setTagPlano(newTag);
              if (material === 'P') {
                setTagUnico(generateTagUnico(plano, newTag, 'P'));
              }
            }}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td>
          {item.ruleId === 'r2' ? (
            <select
              className="edit-input edit-input-mono"
              id="edit-det"
              value={detalle}
              onChange={e => {
                const newDet = e.target.value;
                setDetalle(newDet);
                let numSoportes = 1;
                let numJumpers = 1;
                if (hasSoporteItems(newDet, activeArea)) {
                  const sAns = window.prompt(
                    `¿Cuántos soportes se requieren por mecha para el detalle ${newDet}?\n(Multiplica los materiales "u / soporte" y "m/ soporte")`,
                    '1'
                  );
                  if (sAns !== null) numSoportes = parseInt(sAns, 10) || 1;
                }
                if (hasJumperItems(newDet, activeArea)) {
                  const jAns = window.prompt(
                    `¿Cuántos jumpers se requieren por mecha para el detalle ${newDet}?\n(Multiplica los materiales con Jumper)`,
                    '1'
                  );
                  if (jAns !== null) numJumpers = parseInt(jAns, 10) || 1;
                }
                updateItem(
                  item.id,
                  {
                    detalle: newDet,
                    numSoportes,
                    numJumpers
                  },
                  section
                );
              }}
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--s1)',
                color: 'var(--tx)',
                border: '1px solid var(--b1)'
              }}
            >
              <option value="" style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}></option>
              {getDetallesForArea(activeArea).map(([k]) => (
                <option key={k} value={k} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>
                  {k}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="edit-input edit-input-mono"
              id="edit-det"
              type="text"
              value={detalle}
              onChange={e => setDetalle(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          )}
        </td>
        <td className="td-d" style={{ fontFamily: 'var(--mo)', fontSize: '11px' }}>
          {item.desc}
        </td>
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-mot"
            type="text"
            value={metradoOt}
            onChange={e => setMetradoOt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td style={{ position: 'relative' }}>
          <input
            className="edit-input edit-input-mono"
            id="edit-unit"
            type="text"
            value={unit}
            style={{ textTransform: 'uppercase' }}
            onChange={e => setUnit(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
          />
          <div className="act-row-floating is-editing">
            <button className="btn-green" onClick={handleSave} style={{ fontSize: '11px', padding: '2px 6px' }}>
              OK
            </button>
            <button className="btn-icon" onClick={onCancelEdit} title="Cancelar" style={{ fontSize: '11px', padding: '2px 6px' }}>
              ESC
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const isMainItem = item.material === 'P';
  const isTriggerRow = isDetalleTriggerRow(item, allStoreItems);
  const canInteract = (colKey: string) =>
    isMainItem || colKey === 'plano' || (colKey === 'detalle' && isTriggerRow);
  // PARTIDA SICME / PARTIDA BALANCE come from the PARTIDAS master;
  // TAG UNICO is derived. All three are system columns (display-only).
  const isSystemColumn = (colKey: string) =>
    colKey === 'partida' || colKey === 'partidaBalance' || colKey === 'tagUnico';

  // Excel-like Cell Renderer
  const renderCell = (
    colKey: string,
    value: any,
    className: string = 'td-u',
    customStyle: React.CSSProperties = {}
  ) => {
    const isActive = selectedColKey === colKey;
    const isSelected = isActive || selectedColKeys.includes(colKey);
    const editable = canInteract(colKey) && !isSystemColumn(colKey);
    const isEditingThisCell = editable && editingColKey === colKey;
    const isTarget = isFillTarget && (isMainItem || colKey === 'plano' || colKey === 'detalle');
    const dragValue = colKey === 'plano' ? (item.plano || '') : value;

    const cellTitle = isSystemColumn(colKey)
      ? (colKey === 'tagUnico'
        ? 'TAG ÚNICO se genera automáticamente'
        : 'PARTIDA de solo lectura: proviene del maestro PARTIDAS')
      : !editable
      ? 'Consumible derivado: se actualiza desde el ítem principal'
      : colKey === 'detalle' && isTriggerRow
      ? 'Cambiar DETALLE pide actualizar TAG EN PLANO e inserta las filas debajo'
      : !isMainItem
      ? 'PLANO se puede editar y arrastrar. Solo el ítem principal cambia DETALLE'
      : isActive && showFillHandle
      ? 'Doble clic para editar, o arrastra la esquina para copiar hacia abajo'
      : isSelected
      ? 'Mayús + clic en otra celda para ajustar el rango'
      : 'Clic para seleccionar. Mayús + clic en otra celda selecciona el rango';

    return (
      <td
        className={`${className} excel-cell ${isSelected ? 'is-range-selected' : ''} ${isActive ? 'is-selected' : ''} ${isTarget ? 'excel-cell-fill-target' : ''} ${!isMainItem ? 'excel-cell-consumable' : ''}`}
        style={customStyle}
        data-item-id={item.id}
        data-col-key={colKey}
        data-material={item.material}
        title={cellTitle}
        onMouseDown={e => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest('.excel-fill-handle')) return;
          onSelectCell?.(colKey, dragValue, e);
        }}
        onDoubleClick={() => {
          if (editable) {
            onStartInlineEdit?.(colKey);
          }
        }}
        onMouseEnter={e => {
          onCellMouseEnter?.(colKey, e);
        }}
      >
        {isEditingThisCell ? (
          <input
            className="excel-inline-input"
            defaultValue={value ?? ''}
            autoFocus
            onBlur={e => onSaveInlineEdit?.(colKey, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSaveInlineEdit?.(colKey, (e.target as HTMLInputElement).value);
              } else if (e.key === 'Escape') {
                onCancelInlineEdit?.();
              }
            }}
          />
        ) : (
          <span>{value || (colKey === 'plano' ? '—' : '')}</span>
        )}

        {editable && isActive && showFillHandle && !isEditingThisCell && onStartFillDrag && (
          <div
            className="excel-fill-handle"
            role="button"
            aria-label={
              colKey === 'plano'
                ? 'Arrastrar plano hacia otras filas'
                : 'Arrastrar valor hacia ítems principales'
            }
            title={
              colKey === 'plano'
                ? 'Arrastra para copiar el plano hacia abajo, incluyendo consumibles'
                : 'Arrastra para copiar el valor a los ítems principales de abajo'
            }
            onDragStart={e => e.preventDefault()}
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              onStartFillDrag(colKey, dragValue, e);
            }}
          />
        )}
      </td>
    );
  };

  return (
    <tr
      ref={rowRef}
      className={`tr-row ${isHighlighted ? 'tr-amber-pulse' : ''} ${!isMainItem ? 'tr-consumable-row' : ''}`}
      data-item-id={item.id}
      data-material={item.material}
    >
      <td className="td-n" data-item-id={item.id}><span>{index}</span></td>

      {renderCell('partida', item.partida || 'NA', 'td-u', {
        color: item.partida && item.partida !== 'NA' ? 'var(--am)' : 'var(--mu)',
        fontWeight: 700
      })}

      {renderCell('partidaBalance', item.partidaBalance || 'NA', 'td-u', {
        color: item.partidaBalance && item.partidaBalance !== 'NA' ? 'var(--am)' : 'var(--mu)',
        fontWeight: 700
      })}

      {renderCell('material', item.material || '', 'td-u', {
        color: isMainItem ? 'var(--excel-green, #107c41)' : 'var(--tx)',
        fontWeight: 'bold'
      })}

      {/* PLANO Column */}
      {renderCell('plano', item.plano || '—', 'td-u', {
        fontWeight: 600
      })}

      {renderCell('rev', item.rev || '', 'td-u')}
      {renderCell('tagUnico', item.tagUnico || '', 'td-u')}
      {renderCell('tagPlano', item.tagPlano || '', 'td-u')}
      {renderCell('detalle', item.detalle || '', 'td-u')}
      {renderCell('desc', item.desc, 'td-d')}
      {renderCell('metradoOt', item.metradoOt || '', 'td-u')}

      <td
        className={`td-u excel-cell ${selectedColKeys.includes('unit') || selectedColKey === 'unit' ? 'is-range-selected' : ''} ${selectedColKey === 'unit' ? 'is-selected' : ''} ${isFillTarget && selectedColKey === 'unit' ? 'excel-cell-fill-target' : ''}`}
        style={{ position: 'relative' }}
        data-item-id={item.id}
        data-col-key="unit"
        data-material={item.material}
        onMouseDown={e => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest('.excel-fill-handle, .act-row-floating')) return;
          onSelectCell?.('unit', item.unit, e);
        }}
        onDoubleClick={() => {
          if (isMainItem) onStartInlineEdit?.('unit');
        }}
        onMouseEnter={e => {
          onCellMouseEnter?.('unit', e);
        }}
      >
        {isMainItem && editingColKey === 'unit' ? (
          <input
            className="excel-inline-input"
            defaultValue={item.unit ?? ''}
            autoFocus
            onBlur={e => onSaveInlineEdit?.('unit', e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSaveInlineEdit?.('unit', (e.target as HTMLInputElement).value);
              } else if (e.key === 'Escape') {
                onCancelInlineEdit?.();
              }
            }}
          />
        ) : (
          <span>{item.unit}</span>
        )}

        {isMainItem && selectedColKey === 'unit' && showFillHandle && editingColKey !== 'unit' && onStartFillDrag && (
          <div
            className="excel-fill-handle"
            role="button"
            aria-label="Arrastrar unidad hacia ítems principales"
            title="Arrastra para copiar hacia abajo"
            onDragStart={e => e.preventDefault()}
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              onStartFillDrag('unit', item.unit, e);
            }}
          />
        )}

        <div className="act-row-floating">
          {isMainItem && (
            <button
              className="btn-icon"
              onClick={onStartEdit}
              title="Editar fila completa"
              style={{ fontSize: '10px', padding: '2px 5px', fontFamily: 'var(--mo)' }}
            >
              EDIT
            </button>
          )}
          <button
            className="btn-icon btn-danger"
            onClick={() => deleteItem(item.id, section)}
            title="Eliminar fila"
            style={{ fontSize: '10px', padding: '2px 5px', fontFamily: 'var(--mo)' }}
          >
            DEL
          </button>
        </div>
      </td>
    </tr>
  );
});

