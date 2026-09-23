import React, { useState, useEffect } from 'react';
import { TakeoffItem, MaterialType } from '../../../entities/takeoff-item/model/types';
import { AreaType, SectionType } from '../../../shared/types/common';
import { getDetallesForArea, hasSoporteItems, hasJumperItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { useItemsStore } from '../model/useItemsStore';
import { useAppStore } from '../../app-config/model/useAppStore';

export interface ItemEditModalProps {
  isOpen: boolean;
  item: TakeoffItem | null;
  onClose: () => void;
}

export const ItemEditModal: React.FC<ItemEditModalProps> = ({ isOpen, item, onClose }) => {
  const { updateItem } = useItemsStore();
  const { activeArea, section } = useAppStore();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    updateItem(
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

    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: '560px', width: '92vw' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Editar Ítem</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</div>
          </div>
          <button className="btn btn-icon modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                PLANO:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={plano}
                onChange={e => setPlano(e.target.value)}
                required
              />
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
                  {availableDetalles.map(d => (
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
