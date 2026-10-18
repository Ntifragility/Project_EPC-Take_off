import React, { useState, useEffect } from 'react';
import { DetalleVariantItem } from '../../../entities/takeoff-rule/model/types';
import { AVAILABLE_CUSTOM_ITEMS } from '../../../entities/takeoff-rule/model/detalleVariants';
import { formulaHint, isMetradoExpression, shownVariantFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { siteConfirm } from '../../../shared/ui/askSite';

export interface DetalleEditorModalProps {
  isOpen: boolean;
  area: string;
  detalleCode: string;
  category?: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST';
  initialItems: DetalleVariantItem[];
  availableCodes?: string[];
  onSelectDetalle?: (code: string) => void;
  onClose: () => void;
  onSave: (
    area: string,
    detalleCode: string,
    items: DetalleVariantItem[],
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST'
  ) => Promise<boolean>;
  onDelete?: (
    area: string,
    detalleCode: string,
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST'
  ) => Promise<boolean>;
}

interface EditableItem {
  id: string;
  desc: string;
  ot: string | number;
  unit: string;
  material: 'P' | 'C';
}

function displayOt(item: DetalleVariantItem): string {
  const formula = shownVariantFormula(item);
  if (formula) return formula;
  if (item.ot !== undefined && item.ot !== '') return String(item.ot);
  if (item.qty !== undefined && item.qty !== '') return String(item.qty);
  return '1';
}

const COMMON_UNITS = [
  'c/mecha',
  'u / soporte',
  'm/ soporte',
  'c/u',
  'und',
  'm',
  'u / cjto',
  'c/jumper'
];

export const DetalleEditorModal: React.FC<DetalleEditorModalProps> = ({
  isOpen,
  area,
  detalleCode: initialCode,
  category = 'CABLE_2_0',
  initialItems,
  availableCodes = [],
  onSelectDetalle,
  onClose,
  onSave,
  onDelete
}) => {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [activeCode, setActiveCode] = useState(initialCode);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customNewCode, setCustomNewCode] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedCode, setRenamedCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const suggestedMaterials = React.useMemo(() => {
    const set = new Set<string>(AVAILABLE_CUSTOM_ITEMS);
    items.forEach(it => {
      if (it.desc && it.desc.trim()) {
        set.add(it.desc.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const serializeForDirtyCheck = (code: string, currentItems: EditableItem[]) =>
    JSON.stringify({
      code: code.trim().toUpperCase(),
      items: currentItems.map(it => ({
        desc: it.desc.trim().toUpperCase(),
        ot: String(it.ot).trim(),
        unit: it.unit.trim().toUpperCase(),
        material: it.material
      }))
    });

  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setActiveCode(initialCode);
      setIsCreatingNew(false);
      setCustomNewCode('');
      setIsRenaming(false);
      setRenamedCode('');

      const mapped: EditableItem[] = initialItems.map((item, idx) => ({
        id: `item-${idx}-${Date.now()}`,
        desc: item.desc || '',
        ot: displayOt(item),
        unit: item.unit || '',
        material: item.material === 'P' ? 'P' : 'C'
      }));
      setItems(mapped);
      setInitialSnapshot(serializeForDirtyCheck(initialCode, mapped));
    }
  }, [isOpen, initialCode, initialItems]);

  if (!isOpen) return null;

  const currentSnapshot = serializeForDirtyCheck(
    isCreatingNew ? customNewCode : isRenaming ? renamedCode : activeCode,
    items
  );
  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        desc: '',
        ot: 1,
        unit: 'und',
        material: 'C'
      }
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof EditableItem, value: any) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleCodeChange = (newCode: string) => {
    setIsRenaming(false);
    setRenamedCode('');
    if (newCode === '__NEW__') {
      setIsCreatingNew(true);
      setCustomNewCode('');
      setItems([{ id: `item-0-${Date.now()}`, desc: '', ot: 1, unit: 'und', material: 'C' }]);
    } else {
      setIsCreatingNew(false);
      setActiveCode(newCode);
      if (onSelectDetalle) {
        onSelectDetalle(newCode);
      }
    }
  };

  const handleSave = async () => {
    const isRenameAction = isRenaming && renamedCode.trim().toUpperCase() !== activeCode.trim().toUpperCase();
    const finalCode = isCreatingNew
      ? customNewCode.trim().toUpperCase()
      : isRenaming
      ? renamedCode.trim().toUpperCase()
      : activeCode.trim().toUpperCase();

    if (!finalCode) {
      alert('Por favor especifica un código de detalle válido.');
      return;
    }

    const cleanItems = items.filter(it => it.desc.trim().length > 0);
    if (cleanItems.length === 0) {
      alert('Debes incluir al menos un material con descripción.');
      return;
    }

    const payloadItems: DetalleVariantItem[] = cleanItems.map(it => {
      const text = String(it.ot).trim();
      const isVar = text.toLowerCase() === 'var.' || text.toLowerCase() === 'var';
      const expr = isMetradoExpression(text);
      const leading = /^(\d+(?:\.\d+)?)/.exec(text);
      const numOt = parseFloat(text);
      const parsedOt = expr
        ? leading ? Number(leading[1]) : 1
        : isVar
          ? 'Var.'
          : Number.isFinite(numOt) && String(numOt) === text
            ? numOt
            : text;
      const ceilLength = /ceil\s*\(\s*length\s*\/\s*3\s*\)/i.test(text);

      return {
        desc: it.desc.trim(),
        qty: parsedOt,
        unit: it.unit.trim(),
        ot: parsedOt,
        material: it.material,
        formula: expr ? text : '',
        otDynamic: ceilLength ? '1c/3m' : text === '' ? 'empty' : undefined
      };
    });

    setIsSaving(true);
    try {
      const ok = await onSave(area, finalCode, payloadItems, category);
      if (ok) {
        if (isRenameAction && onDelete) {
          await onDelete(area, activeCode, category);
        }
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={isCreatingNew ? 'Nuevo detalle' : 'Editar detalle'}
      subtitle={`${activeCode || 'DETALLE'} · ${area === 'AREA HUMEDA' ? 'ÁREA HÚMEDA' : 'ÁREA SECA'}`}
      onClose={onClose}
      closeDisabled={isSaving}
      dismiss="dirty-confirm"
      isDirty={isDirty}
      maxWidth="1050px"
    >
      <div className="modal-body prompt">
        {/* ROW 1: CÓDIGO DE DETALLE, GRUPO ASOCIADO, ACCIONES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr', gap: '1rem', marginBottom: '1.2rem', alignItems: 'end' }}>
          <label style={{ margin: 0 }}>
            Código de Detalle:
            {!isCreatingNew && !isRenaming ? (
              <select
                value={activeCode}
                onChange={e => handleCodeChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  background: 'var(--s1)',
                  color: 'var(--tx)',
                  border: '1px solid var(--b1)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontFamily: 'var(--mo)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {availableCodes.map(code => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
                <option value="__NEW__">+ Crear nuevo detalle...</option>
              </select>
            ) : (
              <input
                type="text"
                value={isCreatingNew ? customNewCode : renamedCode}
                onChange={e => isCreatingNew ? setCustomNewCode(e.target.value.toUpperCase()) : setRenamedCode(e.target.value.toUpperCase())}
                placeholder={isCreatingNew ? 'NUEVO CÓDIGO (ej. 010/17B)' : 'EDITAR CÓDIGO'}
                style={{
                  width: '100%',
                  height: '36px',
                  fontFamily: 'var(--mo)',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              />
            )}
          </label>

          <label style={{ margin: 0 }}>
            Grupo / Categoría Asociada:
            <input
              type="text"
              value={category.replace(/_/g, ' ')}
              disabled
              style={{
                width: '100%',
                height: '36px',
                background: 'var(--s2)',
                color: 'var(--mu)',
                border: '1px solid var(--b1)',
                borderRadius: '4px',
                padding: '6px 10px',
                fontFamily: 'var(--mo)',
                fontSize: '12px'
              }}
            />
          </label>

          <div>
            {!isCreatingNew && !isRenaming ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setIsRenaming(true);
                  setRenamedCode(activeCode);
                }}
                style={{ width: '100%', height: '36px', fontSize: '12px' }}
              >
                Renombrar código
              </button>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setIsRenaming(false);
                  setIsCreatingNew(false);
                  setRenamedCode('');
                  setCustomNewCode('');
                }}
                style={{ width: '100%', height: '36px', fontSize: '12px' }}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>

        {/* SUBITEMS TABLE */}
        <div className="prompt-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0 }}>Ítems asociados (Lista de Materiales P / C)</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={handleAddItem}>
            + Agregar material
          </button>
        </div>

        <datalist id="detalle-materials-list">
          {suggestedMaterials.map((m: string, i: number) => (
            <option key={i} value={m} />
          ))}
        </datalist>

        <datalist id="detalle-units-list">
          {COMMON_UNITS.map((u: string, i: number) => (
            <option key={i} value={u} />
          ))}
        </datalist>

        <div style={{ overflowX: 'auto' }}>
          <table className="prompt-table" id="modal-detalle-items" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '105px' }}>MAT</th>
                <th>Descripción del Material</th>
                <th style={{ width: '200px', textAlign: 'center' }}>Metrado OT / Cálculo</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Unidad</th>
                <th style={{ width: '50px' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id}>
                  <td>
                    <select
                      value={it.material}
                      aria-label={`MAT ${i + 1}`}
                      onChange={e => handleUpdateItem(it.id, 'material', e.target.value as 'P' | 'C')}
                      style={{
                        width: '100%',
                        minWidth: '95px',
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontFamily: 'var(--mo)',
                        fontWeight: 500,
                        border: it.material === 'P' ? '1px solid #a7f3d0' : '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: it.material === 'P' ? '#f0fdf4' : '#ffffff',
                        color: it.material === 'P' ? '#107c41' : '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="P">P (Prin.)</option>
                      <option value="C">C (Cons.)</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      list="detalle-materials-list"
                      value={it.desc}
                      onChange={e => handleUpdateItem(it.id, 'desc', e.target.value)}
                      placeholder="Escribe o selecciona material..."
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--mo)',
                        border: '1px solid var(--b1)',
                        borderRadius: '4px',
                        background: 'var(--s1)',
                        color: 'var(--tx)'
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={it.ot}
                      onChange={e => handleUpdateItem(it.id, 'ot', e.target.value)}
                      placeholder="1, length, 2 * soportes"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '6px 8px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--mo)',
                        fontWeight: 'normal',
                        border: '1px solid var(--b1)',
                        borderRadius: '4px',
                        background: 'var(--s1)',
                        color: 'var(--tx)'
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      list="detalle-units-list"
                      value={it.unit}
                      onChange={e => handleUpdateItem(it.id, 'unit', e.target.value)}
                      placeholder="c/mecha, und..."
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '6px 8px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--mo)',
                        border: '1px solid var(--b1)',
                        borderRadius: '4px',
                        background: 'var(--s1)',
                        color: 'var(--tx)'
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      aria-label={`Eliminar fila ${i + 1}`}
                      onClick={() => handleRemoveItem(it.id)}
                      style={{ padding: '0.2rem 0.5rem' }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="prompt-note" style={{ margin: '8px 0 16px', fontSize: '11.5px', color: 'var(--mu)' }}>
          {formulaHint(items.map(item => String(item.ot ?? '')))}
        </p>

        <div className="modal-ft" style={{ justifyContent: 'space-between' }}>
          <div>
            {onDelete && !isCreatingNew && (
              <button
                type="button"
                className="btn-danger"
                onClick={async () => {
                  if (await siteConfirm(`¿Estás seguro de que deseas eliminar permanentemente el detalle "${activeCode}"? Esta acción borrará todas sus partidas asignadas.`)) {
                    setIsSaving(true);
                    try {
                      const ok = await onDelete(area, activeCode, category);
                      if (ok) {
                        onClose();
                      }
                    } finally {
                      setIsSaving(false);
                    }
                  }
                }}
                disabled={isSaving}
              >
                Eliminar detalle
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar detalle'}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
