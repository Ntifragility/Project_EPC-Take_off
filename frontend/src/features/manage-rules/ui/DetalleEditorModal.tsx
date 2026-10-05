import React, { useState, useEffect } from 'react';
import { DetalleVariantItem } from '../../../entities/takeoff-rule/model/types';
import { AVAILABLE_CUSTOM_ITEMS } from '../../../entities/takeoff-rule/model/detalleVariants';
import { ModalShell } from '../../../shared/ui/ModalShell';

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

  useEffect(() => {
    if (isOpen) {
      setActiveCode(initialCode);
      setIsCreatingNew(false);
      setCustomNewCode('');
      setIsRenaming(false);
      setRenamedCode('');
      setItems(
        (initialItems || []).map((it, idx) => ({
          id: `item-${idx}-${Date.now()}`,
          desc: it.desc || '',
          ot: it.ot !== undefined ? it.ot : it.qty !== undefined ? it.qty : 1,
          unit: it.unit || 'und',
          material: it.material || 'C'
        }))
      );
    }
  }, [isOpen, initialCode, initialItems]);

  if (!isOpen) return null;

  const normalizeVariant = (list: DetalleVariantItem[]) =>
    JSON.stringify(list.map(it => [it.desc || '', it.ot !== undefined ? it.ot : it.qty !== undefined ? it.qty : 1, it.unit || 'und', it.material || 'C']));
  const isDirty =
    JSON.stringify(items.map(it => [it.desc || '', it.ot ?? '', it.unit || '', it.material || ''])) !==
      normalizeVariant(initialItems || []) ||
    activeCode !== initialCode ||
    isCreatingNew ||
    isRenaming ||
    customNewCode !== '' ||
    renamedCode !== '';

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
      const isVar = String(it.ot).trim().toLowerCase() === 'var.' || String(it.ot).trim().toLowerCase() === 'var';
      const numOt = parseFloat(String(it.ot));
      const parsedOt = isVar ? 'Var.' : isNaN(numOt) ? String(it.ot).trim() : numOt;

      return {
        desc: it.desc.trim(),
        qty: parsedOt,
        unit: it.unit.trim(),
        ot: parsedOt,
        material: it.material
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
      subtitle={`${area} · ${category}. Materiales, cantidades y unidades se guardan en Supabase.`}
      onClose={onClose}
      closeDisabled={isSaving}
      dismiss="dirty-confirm"
      isDirty={isDirty}
      maxWidth="900px"
    >
        <div className="modal-body">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginBottom: '16px',
              padding: '12px',
              background: 'var(--s2)',
              border: '1px solid var(--b1)',
              borderRadius: '8px'
            }}
          >
              {!isCreatingNew && !isRenaming ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {availableCodes.length > 0 ? (
                    <select
                      value={activeCode}
                      onChange={e => handleCodeChange(e.target.value)}
                      style={{
                        background: 'var(--s1)',
                        color: 'var(--tx)',
                        border: '1px solid var(--b1)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontFamily: 'var(--mo)',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Cambiar de detalle para editar"
                    >
                      {availableCodes.map(code => (
                        <option key={code} value={code}>
                          Detalle: {code}
                        </option>
                      ))}
                      <option value="__NEW__">Crear nuevo detalle...</option>
                    </select>
                  ) : (
                    <span
                      style={{
                        background: 'var(--s1)',
                        color: 'var(--tx)',
                        border: '1px solid var(--b1)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontFamily: 'var(--mo)',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    >
                      {activeCode}
                    </span>
                  )}

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setIsRenaming(true);
                      setRenamedCode(activeCode);
                    }}
                    title="Cambiar el nombre / código de este detalle constructivo"
                  >
                    Renombrar código
                  </button>
                </div>
              ) : isRenaming ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 600 }}>CÓDIGO</span>
                  <input
                    type="text"
                    value={renamedCode}
                    onChange={e => setRenamedCode(e.target.value)}
                    placeholder="NUEVO CÓDIGO (ej. 010/17B)"
                    style={{
                      background: 'var(--s1)',
                      color: 'var(--tx)',
                      border: '1px solid var(--b1)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontFamily: 'var(--mo)',
                      fontSize: '13px',
                      fontWeight: 700,
                      width: '210px',
                      textTransform: 'uppercase'
                    }}
                    autoFocus
                  />
                  <span style={{ fontSize: '11px', color: 'var(--mu)' }}>
                    (actual: <strong style={{ color: 'var(--tx)' }}>{activeCode}</strong>)
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setIsRenaming(false);
                      setRenamedCode('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : isCreatingNew ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={customNewCode}
                    onChange={e => setCustomNewCode(e.target.value)}
                    placeholder="CÓDIGO (ej. 009/13 o 010/19)"
                    style={{
                      background: 'var(--s1)',
                      color: 'var(--tx)',
                      border: '1px solid var(--b1)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontFamily: 'var(--mo)',
                      fontSize: '13px',
                      fontWeight: 700,
                      width: '200px'
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setActiveCode(initialCode);
                    }}
                  >
                    Volver a existentes
                  </button>
                </div>
              ) : null}
          </div>
          <datalist id="detalle-materials-list">
            {suggestedMaterials.map((mat: string, i: number) => (
              <option key={i} value={mat} />
            ))}
          </datalist>

          <datalist id="detalle-units-list">
            {COMMON_UNITS.map((u: string, i: number) => (
              <option key={i} value={u} />
            ))}
          </datalist>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              fontFamily: 'var(--mo)',
              marginBottom: '16px'
            }}
          >
            <thead>
              <tr style={{ background: 'var(--s2)', borderBottom: '2px solid var(--b1)' }}>
                <th style={{ padding: '10px 10px', textAlign: 'left', color: 'var(--tx)', fontWeight: 'bold' }}>
                  DESCRIPCIÓN DEL MATERIAL
                </th>
                <th style={{ padding: '10px 8px', width: '120px', textAlign: 'center', color: 'var(--tx)', fontWeight: 'bold' }}>
                  METRADO OT
                </th>
                <th style={{ padding: '10px 8px', width: '140px', textAlign: 'center', color: 'var(--tx)', fontWeight: 'bold' }}>
                  UNIDAD
                </th>
                <th style={{ padding: '10px 8px', width: '95px', textAlign: 'center', color: 'var(--tx)', fontWeight: 'bold' }}>
                  TIPO
                </th>
                <th style={{ padding: '10px 8px', width: '45px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr
                  key={it.id}
                  style={{
                    borderBottom: '1px solid var(--b1)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'
                  }}
                >
                  <td style={{ padding: '8px 10px' }}>
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

                  <td style={{ padding: '8px' }}>
                    <input
                      type="text"
                      value={it.ot}
                      onChange={e => handleUpdateItem(it.id, 'ot', e.target.value)}
                      placeholder="1 ó Var."
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '6px 8px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--mo)',
                        fontWeight: 'bold',
                        border: '1px solid var(--b1)',
                        borderRadius: '4px',
                        background: 'var(--s1)',
                        color: 'var(--tx)'
                      }}
                    />
                  </td>

                  <td style={{ padding: '8px' }}>
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

                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <select
                      value={it.material}
                      onChange={e => handleUpdateItem(it.id, 'material', e.target.value as 'P' | 'C')}
                      style={{
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontFamily: 'var(--mo)',
                        fontWeight: 700,
                        border: '1px solid var(--b1)',
                        borderRadius: '4px',
                        background: it.material === 'P' ? '#eff6ff' : 'var(--s1)',
                        color: it.material === 'P' ? '#1d4ed8' : 'var(--tx)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="P">P (Prin.)</option>
                      <option value="C">C (Cons.)</option>
                    </select>
                  </td>

                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => handleRemoveItem(it.id)}
                      title="Eliminar este ítem"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            className="btn-ghost"
            onClick={handleAddItem}
            style={{
              fontSize: '11px',
              fontFamily: 'var(--mo)',
              padding: '8px 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: '1px dashed var(--b1)',
              borderRadius: '4px'
            }}
          >
            Agregar material
          </button>
        </div>

        <div className="modal-ft" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--mu)' }}>
              Ítems configurados: <strong style={{ color: 'var(--tx)' }}>{items.length}</strong>
            </span>
            {onDelete && !isCreatingNew && (
              <button
                type="button"
                className="btn-danger"
                onClick={async () => {
                  if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el detalle "${activeCode}"? Esta acción borrará todas sus partidas asignadas.`)) {
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
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
    </ModalShell>
  );
};
