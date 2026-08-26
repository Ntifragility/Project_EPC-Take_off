import React, { useState, useEffect } from 'react';
import { TakeoffRule, RuleSubitem } from '../../types/takeoff';
import { uid } from '../../utils/calculations';

interface RuleEditorModalProps {
  isOpen: boolean;
  initialRule: TakeoffRule | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (rule: TakeoffRule, isNew: boolean) => void;
}

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  isOpen,
  initialRule,
  isNew,
  onClose,
  onSave
}) => {
  const [trigger, setTrigger] = useState('');
  const [subitems, setSubitems] = useState<RuleSubitem[]>([]);

  useEffect(() => {
    if (initialRule) {
      setTrigger(initialRule.trigger);
      setSubitems(JSON.parse(JSON.stringify(initialRule.subitems)));
    } else {
      setTrigger('');
      setSubitems([{ id: uid(), desc: '', qty: 1, unit: 'UND' }]);
    }
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const handleAddSubitem = () => {
    setSubitems(prev => [...prev, { id: uid(), desc: '', qty: 1, unit: 'UND' }]);
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
      id: initialRule?.id || uid(),
      trigger: cleanTrigger,
      subitems
    };
    onSave(rule, isNew);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      id="modal-overlay"
      style={{ display: 'flex' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" id="modal-box" style={{ maxWidth: '640px' }}>
        <div className="modal-hd">
          <span className="modal-hd-title" id="modal-title">
            {isNew ? 'NUEVA REGLA' : 'EDITAR REGLA'}
          </span>
          <button className="btn-ghost btn-sm" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="modal-body" id="modal-body">
          <div className="mb-16">
            <div className="field-label" style={{ marginBottom: '6px' }}>
              DISPARADOR
            </div>
            <input
              id="modal-trigger"
              type="text"
              value={trigger}
              style={{ width: '100%', fontFamily: 'var(--mo)', fontSize: '12px' }}
              placeholder="Ej: CABLE DESNUDO 4/0 AWG"
              onChange={e => setTrigger(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}
            >
              <div className="field-label">ÍTEMS ASOCIADOS</div>
              <button className="btn-ghost btn-sm" onClick={handleAddSubitem}>
                + ÍTEM
              </button>
            </div>

            <div id="modal-subitems">
              {subitems.length === 0 ? (
                <div style={{ color: 'var(--mu)', fontSize: '12px', textAlign: 'center', padding: '14px 0' }}>
                  Sin ítems — agrega al menos uno
                </div>
              ) : (
                subitems.map((s, i) => (
                  <div className="sub-row" key={s.id} id={`sub-row-${s.id}`}>
                    <span className="sub-n">{i + 1}</span>
                    <input
                      type="text"
                      value={s.desc}
                      style={{ flex: 3, fontFamily: 'var(--mo)', fontSize: '11px' }}
                      placeholder="Descripción del material..."
                      onChange={e => handleUpdateSubitem(s.id, 'desc', e.target.value)}
                    />
                    <input
                      type="text"
                      value={s.qty}
                      style={{ width: '130px', fontFamily: 'var(--mo)', fontSize: '11px' }}
                      onChange={e => handleUpdateSubitem(s.id, 'qty', e.target.value)}
                    />
                    <input
                      type="text"
                      value={s.unit}
                      style={{ width: '70px', textTransform: 'uppercase' }}
                      onChange={e => handleUpdateSubitem(s.id, 'unit', e.target.value.toUpperCase())}
                    />
                    <button
                      className="sub-del"
                      onClick={() => handleRemoveSubitem(s.id)}
                      title="Eliminar ítem"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>
            CANCELAR
          </button>
          <button className="btn-primary" id="modal-save" onClick={handleSave}>
            GUARDAR REGLA
          </button>
        </div>
      </div>
    </div>
  );
};

