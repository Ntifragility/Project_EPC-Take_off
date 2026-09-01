import React, { useState, useEffect } from 'react';
import { type DetalleVariantItem, AVAILABLE_CUSTOM_ITEMS } from '../../data/detalleVariants';

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
  onSave
}) => {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [activeCode, setActiveCode] = useState(initialCode);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customNewCode, setCustomNewCode] = useState('');
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

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
    const finalCode = isCreatingNew ? customNewCode.trim().toUpperCase() : activeCode.trim().toUpperCase();

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
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          background: 'var(--s1)',
          color: 'var(--tx)',
          border: '1px solid var(--b1)',
          borderRadius: '8px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          maxWidth: '900px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          className="modal-hd"
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--b1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold' }}>EDITAR DETALLE:</span>

              {/* Detalle Selector Dropdown */}
              {!isCreatingNew && availableCodes.length > 0 ? (
                <select
                  value={activeCode}
                  onChange={e => handleCodeChange(e.target.value)}
                  style={{
                    background: 'var(--ad)',
                    color: 'var(--tx)',
                    border: '1px solid var(--b1)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontFamily: 'var(--mo)',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                  title="Cambiar de detalle para editar"
                >
                  {availableCodes.map(code => (
                    <option key={code} value={code}>
                      Detalle: {code}
                    </option>
                  ))}
                  <option value="__NEW__">+ Crear Nuevo Detalle...</option>
                </select>
              ) : isCreatingNew ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="text"
                    value={customNewCode}
                    onChange={e => setCustomNewCode(e.target.value)}
                    placeholder="CÓDIGO (ej. 009/13 o 010/19)"
                    style={{
                      background: 'var(--s2)',
                      color: 'var(--tx)',
                      border: '1px solid var(--b1)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontFamily: 'var(--mo)',
                      fontSize: '13px',
                      fontWeight: 'bold',
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
                    style={{ fontSize: '10px', padding: '4px 8px' }}
                  >
                    Volver a existentes
                  </button>
                </div>
              ) : (
                <span
                  style={{
                    background: 'var(--ad)',
                    color: 'var(--tx)',
                    border: '1px solid var(--b1)',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontFamily: 'var(--mo)',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  {activeCode}
                </span>
              )}

              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--tx2)',
                  fontWeight: 'normal',
                  background: 'var(--s2)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--b1)'
                }}
              >
                {area} &bull; {category}
              </span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--tx2)', marginTop: '6px' }}>
              Modifica los materiales, cantidades y unidades. Al guardar, se actualiza directamente en Supabase y en los cálculos del metrado.
            </div>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            disabled={isSaving}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--tx2)',
              padding: '2px 8px',
              fontWeight: 'bold'
            }}
          >
            X
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '18px 22px' }}>
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
                  {/* Desc */}
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

                  {/* Metrado OT */}
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

                  {/* Unidad */}
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

                  {/* Material Type (P / C) */}
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

                  {/* Action Delete */}
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      title="Eliminar este ítem"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        fontSize: '16px',
                        padding: '4px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      X
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
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>+</span> AGREGAR MATERIAL
          </button>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--b1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--s2)',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--tx2)' }}>
            Ítems configurados: <strong>{items.length}</strong>
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={isSaving}
              style={{ fontSize: '11px', padding: '8px 18px', cursor: 'pointer' }}
            >
              CANCELAR
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                fontSize: '11px',
                padding: '8px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? 'GUARDANDO EN SUPABASE...' : 'GUARDAR EN BASE DE DATOS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
