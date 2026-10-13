import React, { useState, useEffect } from 'react';
import { TakeoffRule, RuleSubitem } from '../../../entities/takeoff-rule/model/types';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';
import { formulaHint, shownFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { uid } from '../../../shared/lib/uid';
import { ModalShell } from '../../../shared/ui/ModalShell';

export interface RuleEditorModalProps {
  isOpen: boolean;
  initialRule: TakeoffRule | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (rule: TakeoffRule, isNew: boolean) => void;
  onDelete?: (id: string) => void;
}

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  isOpen,
  initialRule,
  isNew,
  onClose,
  onSave,
  onDelete
}) => {
  const [trigger, setTrigger] = useState('');
  const [subitems, setSubitems] = useState<RuleSubitem[]>([]);

  useEffect(() => {
    if (initialRule) {
      setTrigger(initialRule.trigger);
      const copy: RuleSubitem[] = JSON.parse(JSON.stringify(initialRule.subitems));
      setSubitems(copy.map(item => ({
        ...item,
        formula: shownFormula(item, initialRule.trigger),
        material: componentClass(item.desc, item.material)
      })));
    } else {
      setTrigger('');
      setSubitems([{ id: uid(), desc: '', qty: 1, unit: 'UND', formula: '', material: 'C' }]);
    }
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const initialTrigger = initialRule?.trigger ?? '';
  const baseline = (initialRule?.subitems ?? [{ id: '', desc: '', qty: 1, unit: 'UND' }]).map(item => ({
    ...item,
    formula: initialRule ? shownFormula(item, initialRule.trigger) : '',
    material: componentClass(item.desc, item.material)
  }));
  const subitemsKey = (list: RuleSubitem[]) => JSON.stringify(list.map(s => [s.desc, s.qty, s.unit, s.formula || '', s.material || '']));
  const isDirty = trigger !== initialTrigger || subitemsKey(subitems) !== subitemsKey(baseline);

  const handleAddSubitem = () => {
    setSubitems(prev => [...prev, { id: uid(), desc: '', qty: 1, unit: 'UND', formula: '', material: 'C' }]);
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

  const handleSave = () => {
    const cleanTrigger = trigger.trim().toUpperCase();
    if (!cleanTrigger) return;
    const rule: TakeoffRule = {
      ...initialRule,
      id: initialRule?.id || uid(),
      trigger: cleanTrigger,
      subitems
    };
    onSave(rule, isNew);
    onClose();
  };

  return (
    <ModalShell
      title={isNew ? 'Nueva regla' : 'Editar regla'}
      subtitle={trigger.trim() || 'Regla PAT'}
      onClose={onClose}
      maxWidth="1040px"
      dismiss="dirty-confirm"
      isDirty={isDirty}
    >
        <div className="modal-body prompt">
          <label>
            Disparador
            <input
              id="modal-trigger"
              type="text"
              value={trigger}
              placeholder="CABLE DESNUDO 4/0 AWG"
              onChange={e => setTrigger(e.target.value.toUpperCase())}
            />
          </label>

          <div className="prompt-hd">
            <h3>Ítems asociados</h3>
            <button type="button" className="btn-ghost btn-sm" onClick={handleAddSubitem}>
              Agregar línea
            </button>
          </div>

          {subitems.length === 0 ? (
            <p className="prompt-note">Sin ítems. Agrega al menos una línea.</p>
          ) : (
            <table className="prompt-table" id="modal-subitems">
              <thead>
                <tr>
                  <th>MAT</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Cálculo</th>
                  <th>Unidad</th>
                  <th />
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
                      >
                        <option value="P">P</option>
                        <option value="C">C</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.desc}
                        aria-label={`Descripción ${i + 1}`}
                        placeholder="Descripción del material"
                        onChange={e => handleUpdateSubitem(s.id, 'desc', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.qty}
                        aria-label={`Cantidad ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.formula || ''}
                        aria-label={`Cálculo ${i + 1}`}
                        placeholder="length * 0.375 * 0.5"
                        onChange={e => handleUpdateSubitem(s.id, 'formula', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.unit}
                        aria-label={`Unidad ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'unit', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn-ghost btn-sm" onClick={() => handleRemoveSubitem(s.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="prompt-note">{formulaHint(subitems.map(item => item.formula || ''))}</p>
        </div>

        <div className="modal-ft" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" id="modal-save" onClick={handleSave}>
              Guardar regla
            </button>
          </div>
        </div>
    </ModalShell>
  );
};
