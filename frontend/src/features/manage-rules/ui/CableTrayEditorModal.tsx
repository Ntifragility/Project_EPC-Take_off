import React, { useState, useEffect } from 'react';
import { TakeoffRule, CableTrayMatrixItem } from '../../../entities/takeoff-rule/model/types';
import { DEFAULT_CABLE_TRAY_MATRIX } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { AVAILABLE_CUSTOM_ITEMS } from '../../../entities/takeoff-rule/model/detalleVariants';

export interface CableTrayEditorModalProps {
  isOpen: boolean;
  rule: TakeoffRule | null;
  onClose: () => void;
  onSave: (updatedRule: TakeoffRule) => void;
  onDelete?: (id: string) => void;
}

export const CableTrayEditorModal: React.FC<CableTrayEditorModalProps> = ({
  isOpen,
  rule,
  onClose,
  onSave,
  onDelete
}) => {
  const [trigger, setTrigger] = useState('');
  const [detalle, setDetalle] = useState('');
  const [tagPrefix, setTagPrefix] = useState('');
  const [matrixItems, setMatrixItems] = useState<CableTrayMatrixItem[]>([]);

  useEffect(() => {
    if (isOpen && rule) {
      setTrigger(rule.trigger || 'DET.001/2B-X1');
      setDetalle(rule.detalle || '001/2B-X1');
      setTagPrefix(rule.tagPrefix || 'SE');
      const initialMatrix =
        rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0
          ? JSON.parse(JSON.stringify(rule.cableTrayMatrix))
          : JSON.parse(JSON.stringify(DEFAULT_CABLE_TRAY_MATRIX));
      setMatrixItems(initialMatrix);
    }
  }, [isOpen, rule]);

  if (!isOpen || !rule) return null;

  const handleAddItem = () => {
    setMatrixItems(prev => [
      ...prev,
      {
        id: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        desc: '',
        unit: 'und',
        material: 'C',
        w900: '2',
        w600: '2',
        w450: '2',
        w300: '2'
      }
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof CableTrayMatrixItem, value: any) => {
    setMatrixItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setMatrixItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trigger.trim()) {
      alert('Por favor ingresa un nombre para la regla.');
      return;
    }

    const cleanItems = matrixItems.filter(it => it.desc.trim().length > 0);
    if (cleanItems.length === 0) {
      alert('Debes incluir al menos un material con descripción.');
      return;
    }

    // Convert matrix items to standard subitems as fallback
    const fallbackSubitems = cleanItems.map((it, idx) => ({
      id: it.id || `sub-${idx}`,
      desc: it.desc.trim(),
      qty: it.w600,
      unit: it.unit
    }));

    const updatedRule: TakeoffRule = {
      ...rule,
      trigger: trigger.trim(),
      detalle: detalle.trim() || '001/2B-X1',
      tagPrefix: tagPrefix.trim() || 'SE',
      cableTrayMatrix: cleanItems,
      subitems: fallbackSubitems
    };

    onSave(updatedRule);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      id="cable-tray-editor-overlay"
      style={{ display: 'flex', zIndex: 1100 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          maxWidth: '960px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--s1)',
          border: '1px solid var(--b1)',
          borderRadius: '12px',
          padding: '24px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--tx)', letterSpacing: '0.5px' }}>
              EDITAR MATRIZ DE ESCALERILLA &bull; ANCHO DE BANDEJA
            </div>
            <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>
              Define los materiales y los valores correspondientes a los 4 anchos (900 mm, 600 mm, 450 mm, 300 mm).
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{ fontSize: '14px', width: '28px', height: '28px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Metadata Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gap: '12px',
              padding: '12px',
              background: 'var(--s2)',
              border: '1px solid var(--b1)',
              borderRadius: '8px',
              marginBottom: '16px'
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--mu)', marginBottom: '4px', fontWeight: 600 }}>
                NOMBRE / TRIGGER DE LA REGLA
              </label>
              <input
                type="text"
                value={trigger}
                onChange={e => setTrigger(e.target.value)}
                style={{ width: '100%', fontSize: '11.5px', padding: '6px 8px', fontFamily: 'var(--mo)', textTransform: 'uppercase' }}
                placeholder="DET.001/2B-X1"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--mu)', marginBottom: '4px', fontWeight: 600 }}>
                DETALLE CONSTRUCTIVO
              </label>
              <input
                type="text"
                value={detalle}
                onChange={e => setDetalle(e.target.value)}
                style={{ width: '100%', fontSize: '11.5px', padding: '6px 8px', fontFamily: 'var(--mo)', textTransform: 'uppercase' }}
                placeholder="001/2B-X1"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--mu)', marginBottom: '4px', fontWeight: 600 }}>
                PREFIJO TAG EN PLANO
              </label>
              <input
                type="text"
                value={tagPrefix}
                onChange={e => setTagPrefix(e.target.value)}
                style={{ width: '100%', fontSize: '11.5px', padding: '6px 8px', fontFamily: 'var(--mo)', textTransform: 'uppercase' }}
                placeholder="SE"
              />
            </div>
          </div>

          {/* Matrix Table */}
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--b1)', borderRadius: '8px', marginBottom: '16px', background: 'var(--s2)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--mo)' }}>
              <thead>
                <tr style={{ background: 'var(--s1)', position: 'sticky', top: 0, zIndex: 3, borderBottom: '1px solid var(--b1)' }}>
                  <th rowSpan={2} style={{ padding: '8px', width: '35px', textAlign: 'center', borderRight: '1px solid var(--b1)' }}>#</th>
                  <th rowSpan={2} style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid var(--b1)' }}>DESCRIPCIÓN DEL MATERIAL</th>
                  <th rowSpan={2} style={{ padding: '8px', width: '70px', textAlign: 'center', borderRight: '1px solid var(--b1)' }}>UND</th>
                  <th rowSpan={2} style={{ padding: '8px', width: '70px', textAlign: 'center', borderRight: '1px solid var(--b1)' }}>TIPO</th>
                  <th colSpan={4} style={{ padding: '6px', textAlign: 'center', background: 'var(--ad)', borderRight: '1px solid var(--b1)', fontWeight: 'bold' }}>
                    VALOR SEGÚN ANCHO DE BANDEJA
                  </th>
                  <th rowSpan={2} style={{ padding: '8px', width: '40px', textAlign: 'center' }}></th>
                </tr>
                <tr style={{ background: 'var(--s1)', position: 'sticky', top: '29px', zIndex: 3, borderBottom: '1px solid var(--b1)' }}>
                  {['900 mm', '600 mm', '450 mm', '300 mm'].map(w => (
                    <th key={w} style={{ padding: '4px 6px', textAlign: 'center', fontSize: '10px', width: '75px', borderRight: '1px solid var(--b1)' }}>
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--mu)' }}>
                      Sin materiales en la matriz. Haz clic en "+ AGREGAR MATERIAL".
                    </td>
                  </tr>
                ) : (
                  matrixItems.map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--b1)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', color: 'var(--mu)', fontWeight: 'bold', padding: '6px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input
                          type="text"
                          list="custom-materials-list"
                          value={item.desc}
                          onChange={e => handleUpdateItem(idx, 'desc', e.target.value.toUpperCase())}
                          placeholder="Descripción del material..."
                          style={{ width: '100%', fontSize: '11px', padding: '4px 6px', fontFamily: 'var(--mo)' }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <select
                          value={item.unit}
                          onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                          style={{ width: '100%', fontSize: '10.5px', padding: '4px', textAlign: 'center' }}
                        >
                          <option value="m">m</option>
                          <option value="und">und</option>
                          <option value="u / soporte">u/sop</option>
                          <option value="m/ soporte">m/sop</option>
                          <option value="kg">kg</option>
                          <option value="m3">m3</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <select
                          value={item.material || (item.unit === 'm' ? 'P' : 'C')}
                          onChange={e => handleUpdateItem(idx, 'material', e.target.value as 'P' | 'C')}
                          style={{
                            width: '100%',
                            fontSize: '10.5px',
                            padding: '4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: item.material === 'P' ? 'var(--tx)' : 'var(--mu)'
                          }}
                        >
                          <option value="P">P (Ppal)</option>
                          <option value="C">C (Acc)</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="text"
                          value={item.w900}
                          onChange={e => handleUpdateItem(idx, 'w900', e.target.value)}
                          style={{ width: '100%', fontSize: '11px', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px', background: 'rgba(245, 158, 11, 0.06)' }}>
                        <input
                          type="text"
                          value={item.w600}
                          onChange={e => handleUpdateItem(idx, 'w600', e.target.value)}
                          style={{ width: '100%', fontSize: '11px', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}
                          title="Estándar 600 mm"
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="text"
                          value={item.w450}
                          onChange={e => handleUpdateItem(idx, 'w450', e.target.value)}
                          style={{ width: '100%', fontSize: '11px', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input
                          type="text"
                          value={item.w300}
                          onChange={e => handleUpdateItem(idx, 'w300', e.target.value)}
                          style={{ width: '100%', fontSize: '11px', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '4px' }}>
                        <button
                          type="button"
                          className="btn-icon btn-danger"
                          onClick={() => handleRemoveItem(idx)}
                          style={{ fontSize: '11px', width: '22px', height: '22px' }}
                          title="Eliminar fila"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <datalist id="custom-materials-list">
            {AVAILABLE_CUSTOM_ITEMS.map((mat, i) => (
              <option key={i} value={mat} />
            ))}
          </datalist>

          {/* Footer Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddItem}
                style={{ fontSize: '11px', padding: '6px 14px', fontWeight: 600 }}
              >
                + AGREGAR MATERIAL
              </button>

              {rule?.id && onDelete && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de que deseas eliminar completamente la regla "${trigger || rule.trigger}"?`)) {
                      onDelete(rule.id);
                      onClose();
                    }
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '6px 14px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                  title="Elimina esta regla completa del catálogo y de la base de datos"
                >
                  🗑️ ELIMINAR ESTA REGLA COMPLETA
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                style={{ fontSize: '11px', padding: '6px 16px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: '11px', padding: '6px 20px', fontWeight: 700 }}
              >
                GUARDAR MATRIZ
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
