import React, { useState, useEffect } from 'react';
import { TakeoffItem, MaterialType } from '../../../entities/takeoff-item/model/types';
import { AreaType, SectionType } from '../../../shared/types/common';
import { getDetallesForArea, hasSoporteItems, hasJumperItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { useItemsStore } from '../model/useItemsStore';
import { useAppStore } from '../../app-config/model/useAppStore';
import { ModalShell } from '../../../shared/ui/ModalShell';

export interface ItemEditModalProps {
  isOpen: boolean;
  item: TakeoffItem | null;
  onClose: () => void;
}

export const ItemEditModal: React.FC<ItemEditModalProps> = ({ isOpen, item, onClose }) => {
  const { updateItem, items: allItems } = useItemsStore();
  const { activeArea, section } = useAppStore();

  const availablePlanos = React.useMemo(
    () => Array.from(new Set(allItems.map(i => i.plano).filter(Boolean))).sort(),
    [allItems]
  );

  const [plano, setPlano] = useState('');
  const [rev, setRev] = useState('');
  const [tagPlano, setTagPlano] = useState('');
  const [detalle, setDetalle] = useState('');
  const [metradoOt, setMetradoOt] = useState('');
  const [material, setMaterial] = useState<MaterialType>('P');
  const [notes, setNotes] = useState('');
  const [numSoportes, setNumSoportes] = useState(1);
  const [numJumpers, setNumJumpers] = useState(1);

  useEffect(() => {
    if (item) {
      setPlano(item.plano || '');
      setRev(item.rev || '');
      setTagPlano(item.tagPlano || '');
      setDetalle(item.detalle || '');
      setMetradoOt(item.metradoOt || '');
      setMaterial(item.material || 'P');
      setNotes(item.notes || '');
      setNumSoportes(1);
      setNumJumpers(1);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const isR2 = item.ruleId === 'r2';
  const showSoportes = isR2 && hasSoporteItems(detalle, activeArea);
  const showJumpers = isR2 && hasJumperItems(detalle, activeArea);
  const availableDetalles = getDetallesForArea(activeArea).map(([code]) => code);
  const detalleOptions =
    detalle && !availableDetalles.includes(detalle) ? [detalle, ...availableDetalles] : availableDetalles;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (item.material !== 'P') {
      return;
    }

    const applied = updateItem(
      item.id,
      {
        plano: plano.trim().toUpperCase(),
        rev: rev.trim().toUpperCase(),
        tagPlano: tagPlano.trim().toUpperCase(),
        detalle: detalle.trim().toUpperCase(),
        metradoOt: metradoOt.trim(),
        material,
        notes: notes.trim(),
        numSoportes: showSoportes ? numSoportes : undefined,
        numJumpers: showJumpers ? numJumpers : undefined
      },
      section
    );

    // updateItem rejects unknown/unmappable detalles with a toast: keep the
    // modal open so the user can fix the value.
    if (applied) onClose();
  };

  return (
    <ModalShell title="Editar ítem" subtitle={item.desc} onClose={onClose} maxWidth="560px">
        <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                PLANO:
              </label>
              <input
                type="text"
                className="input"
                list="item-edit-planos-list"
                style={{ width: '100%', textTransform: 'uppercase' }}
                value={plano}
                onChange={e => setPlano(e.target.value.toUpperCase())}
                placeholder="P22-DA-2151..."
                required
              />
              <datalist id="item-edit-planos-list">
                {availablePlanos.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                REV:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={rev}
                onChange={e => setRev(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                TAG EN PLANO:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={tagPlano}
                onChange={e => setTagPlano(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                DETALLE:
              </label>
              {isR2 ? (
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={detalle}
                  onChange={e => setDetalle(e.target.value)}
                >
                  <option value="">(Sin Detalle)</option>
                  {detalleOptions.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={detalle}
                  onChange={e => setDetalle(e.target.value)}
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                METRADO OT:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={metradoOt}
                onChange={e => setMetradoOt(e.target.value)}
              />
            </div>
          </div>

          {(showSoportes || showJumpers) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: 'var(--accent-dim)',
                borderRadius: '6px'
              }}
            >
              {showSoportes && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    SOPORTES:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="input"
                    style={{ width: '100%' }}
                    value={numSoportes}
                    onChange={e => setNumSoportes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
              )}
              {showJumpers && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    JUMPERS:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="input"
                    style={{ width: '100%' }}
                    value={numJumpers}
                    onChange={e => setNumJumpers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
              COMENTARIOS / NOTAS:
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas opcionales..."
            />
          </div>

        </div>
          <div className="modal-ft">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar cambios
            </button>
          </div>
        </form>
    </ModalShell>
  );
};
