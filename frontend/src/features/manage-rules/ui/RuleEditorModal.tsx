import React, { useState, useEffect } from 'react';
import { TakeoffRule, RuleSubitem, DetalleDefinition } from '../../../entities/takeoff-rule/model/types';
import { AreaType } from '../../../shared/types/common';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';
import { formulaHint, shownFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { fetchDetalleCatalog } from '../../../entities/takeoff-rule/api/ruleRepository';
import { getRuleDetallesForArea } from '../../../entities/takeoff-rule/model/areaCatalog';
import { uid } from '../../../shared/lib/uid';
import { ModalShell } from '../../../shared/ui/ModalShell';

export interface RuleEditorModalProps {
  isOpen: boolean;
  initialRule: TakeoffRule | null;
  isNew: boolean;
  activeArea?: AreaType;
  onClose: () => void;
  onSave: (rule: TakeoffRule, isNew: boolean) => void;
  onDelete?: (id: string) => void;
}

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  isOpen,
  initialRule,
  isNew,
  activeArea = 'AREA SECA',
  onClose,
  onSave,
  onDelete
}) => {
  const currentArea = activeArea || 'AREA SECA';
  const [trigger, setTrigger] = useState('');
  const [detalle, setDetalle] = useState('');
  const [tagPrefix, setTagPrefix] = useState('M');
  const [allowDetalleEdit, setAllowDetalleEdit] = useState(true);
  const [subitems, setSubitems] = useState<RuleSubitem[]>([]);
  const [detalleOptions, setDetalleOptions] = useState<DetalleDefinition[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDetalleCatalog().then(setDetalleOptions).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialRule) {
      setTrigger(initialRule.trigger);
      setTagPrefix(initialRule.tagPrefix || 'M');
      setAllowDetalleEdit(initialRule.allowDetalleEdit !== false);

      // Auto-resolve DETALLE for the currently active area
      const resolvedDetalle =
        initialRule.areaDetalles?.[currentArea] ||
        (initialRule.areas?.includes(currentArea) ? (initialRule.defaultDetalle || initialRule.detalle) : '') ||
        getRuleDetallesForArea(initialRule.trigger, currentArea)[0] ||
        initialRule.defaultDetalle ||
        initialRule.detalle ||
        '';
      setDetalle(resolvedDetalle);

      const copy: RuleSubitem[] = JSON.parse(JSON.stringify(initialRule.subitems || []));
      setSubitems(copy.map(item => ({
        ...item,
        formula: shownFormula(item, initialRule.trigger),
        material: componentClass(item.desc, item.material),
        optional: Boolean(item.optional)
      })));
    } else {
      setTrigger('');
      setTagPrefix('M');
      setAllowDetalleEdit(true);
      const defaultDet = getRuleDetallesForArea('', currentArea)[0] || (currentArea === 'AREA HUMEDA' ? '008/3A' : '151');
      setDetalle(defaultDet);
      setSubitems([{ id: uid(), desc: '', qty: 1, unit: 'UND', formula: '', material: 'C', optional: false }]);
    }
  }, [initialRule, isOpen, currentArea]);

  if (!isOpen) return null;

  const handleAddSubitem = () => {
    setSubitems(prev => [...prev, { id: uid(), desc: '', qty: 1, unit: 'UND', formula: '', material: 'C', optional: false }]);
  };

  const handleUpdateSubitem = (id: string, field: keyof RuleSubitem, value: any) => {
    setSubitems(prev =>
      prev.map(s => {
        if (s.id === id) {
          if (field === 'qty') {
            const num = Number(value);
            return { ...s, qty: isNaN(num) || String(value).trim() === '' ? value : num };
          }
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleRemoveSubitem = (id: string) => {
    setSubitems(prev => prev.filter(s => s.id !== id));
  };

  const handleTriggerChange = (newTrigger: string) => {
    setTrigger(newTrigger);
    if (isNew) {
      const defs = getRuleDetallesForArea(newTrigger, currentArea);
      if (defs.length > 0 && defs[0]) {
        setDetalle(defs[0]);
      }
    }
  };

  const handleSave = () => {
    const cleanTrigger = trigger.trim().toUpperCase();
    if (!cleanTrigger) return;
    const cleanDetalle = detalle.trim().toUpperCase();

    const updatedAreaDetalles: Record<string, string> = {
      ...(initialRule?.areaDetalles || {}),
      [currentArea]: cleanDetalle
    };

    const rule: TakeoffRule = {
      ...initialRule,
      id: initialRule?.id || uid(),
      trigger: cleanTrigger,
      defaultDetalle: cleanDetalle,
      detalle: cleanDetalle,
      tagPrefix: tagPrefix.trim().toUpperCase() || 'M',
      allowDetalleEdit,
      areas: [currentArea],
      areaDetalles: updatedAreaDetalles,
      subitems: subitems.map(s => {
        const { subitemDetalle, ...rest } = s;
        return rest;
      })
    };
    onSave(rule, isNew);
    onClose();
  };

  const filteredDetalleOptions = detalleOptions.filter(
    d => d.area === currentArea || d.area === 'GENERAL'
  );

  return (
    <ModalShell
      title={isNew ? 'Nueva regla de metrado' : 'Editar regla de metrado'}
      subtitle={trigger.trim() || 'Regla'}
      onClose={onClose}
      maxWidth="1050px"
    >
      <div className="modal-body prompt">
        {/* ROW 1: DISPARADOR, DETALLE CONSTRUCTIVO, PREFIJO TAG IN ONE CLEAN LINE */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr', gap: '1rem', marginBottom: '1.2rem', alignItems: 'end' }}>
          <label style={{ margin: 0 }}>
            Disparador / Nombre de Regla:
            <input
              id="modal-trigger"
              type="text"
              value={trigger}
              placeholder="e.g. CABLE DESNUDO 4/0 AWG"
              onChange={e => handleTriggerChange(e.target.value.toUpperCase())}
            />
          </label>

          <label style={{ margin: 0 }}>
            DETALLE Constructivo:
            <input
              type="text"
              value={detalle}
              list="catalog-detalles-list"
              placeholder="e.g. 167/G1, 008/3A"
              onChange={e => setDetalle(e.target.value.toUpperCase())}
            />
            <datalist id="catalog-detalles-list">
              {filteredDetalleOptions.map(d => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.description || d.area}
                </option>
              ))}
            </datalist>
          </label>

          <label style={{ margin: 0 }}>
            Prefijo TAG (M, C, TT, PC, SE):
            <input
              type="text"
              value={tagPrefix}
              placeholder="e.g. C"
              onChange={e => setTagPrefix(e.target.value.toUpperCase())}
            />
          </label>
        </div>



        {/* SUBITEMS TABLE (NO REDUNDANT DETALLE COLUMN) */}
        <div className="prompt-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0 }}>Ítems asociados (Lista de Materiales P / C)</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={handleAddSubitem}>
            + Agregar material
          </button>
        </div>

        {subitems.length === 0 ? (
          <p className="prompt-note">Sin materiales asociados. Agrega al menos una línea.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="prompt-table" id="modal-subitems" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '105px' }}>MAT</th>
                  <th>Descripción del Material</th>
                  <th style={{ width: '85px' }}>Cantidad</th>
                  <th style={{ width: '190px' }}>Fórmula / Expresión</th>
                  <th style={{ width: '75px' }}>Unidad</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Opcional</th>
                  <th style={{ width: '50px' }} />
                </tr>
              </thead>
              <tbody>
                {subitems.map((s, i) => (
                  <tr key={s.id} id={`sub-row-${s.id}`}>
                    <td>
                      <select
                        value={s.material === 'P' ? 'P' : 'C'}
                        aria-label={`MAT ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'material', e.target.value)}
                        style={{
                          width: '100%',
                          minWidth: '95px',
                          padding: '6px 4px',
                          fontSize: '11px',
                          fontFamily: 'var(--mo)',
                          fontWeight: 500,
                          border: s.material === 'P' ? '1px solid #a7f3d0' : '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: s.material === 'P' ? '#f0fdf4' : '#ffffff',
                          color: s.material === 'P' ? '#107c41' : '#111827',
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
                        value={s.desc}
                        aria-label={`Descripción ${i + 1}`}
                        placeholder="Descripción técnica del material"
                        onChange={e => handleUpdateSubitem(s.id, 'desc', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.qty}
                        aria-label={`Cantidad ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'qty', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.formula || ''}
                        aria-label={`Fórmula ${i + 1}`}
                        placeholder="count * 1 o length * 0.5"
                        onChange={e => handleUpdateSubitem(s.id, 'formula', e.target.value)}
                        style={{ width: '100%', fontFamily: 'monospace' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.unit}
                        aria-label={`Unidad ${i + 1}`}
                        placeholder="UND, m"
                        onChange={e => handleUpdateSubitem(s.id, 'unit', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(s.optional)}
                        aria-label={`Opcional ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'optional', e.target.checked)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        aria-label={`Eliminar fila ${i + 1}`}
                        onClick={() => handleRemoveSubitem(s.id)}
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
        )}

        <div className="prompt-note" style={{ marginTop: '0.8rem' }}>
          {formulaHint(subitems.map(s => s.formula || ''))}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--b2, #181c24)' }}>
          <div>
            {!isNew && onDelete && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (confirm(`¿Eliminar la regla "${trigger}"?`)) {
                    onDelete(initialRule?.id || '');
                    onClose();
                  }
                }}
              >
                Eliminar regla
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Guardar regla
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
