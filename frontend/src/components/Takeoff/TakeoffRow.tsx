import React, { useState, useEffect } from 'react';
import { TakeoffItem, MaterialType } from '../../types/takeoff';
import { useTakeoff } from '../../context/TakeoffContext';
import { isCountable } from '../../utils/calculations';
import { detalleEntriesByArea } from '../../data/detalleVariants';

interface TakeoffRowProps {
  item: TakeoffItem;
  index: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export const TakeoffRow: React.FC<TakeoffRowProps> = ({
  item,
  index,
  isEditing,
  onStartEdit,
  onCancelEdit
}) => {
  const { updateItem, deleteItem, section } = useTakeoff();

  // Edit form state
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

  // Reset form when item changes or enters edit mode
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
    updateItem(item.id, {
      material,
      plano: plano.toUpperCase(),
      rev: rev.toUpperCase(),
      tagUnico,
      tagPlano,
      detalle,
      qty: isCountable(item.desc, section) ? (typeof qty === 'number' ? qty : parseFloat(String(qty)) || 0) : qty,
      metradoOt,
      unit: unit.toUpperCase(),
      notes
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const countable = isCountable(item.desc, section);

  if (isEditing) {
    return (
      <tr className="tr-edit">
        <td className="td-n">{index}</td>
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-mat"
            type="text"
            value={material}
            style={{ textTransform: 'uppercase' }}
            onChange={e => setMaterial(e.target.value.toUpperCase() as MaterialType)}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-plano"
            type="text"
            value={plano}
            style={{ textTransform: 'uppercase' }}
            onChange={e => setPlano(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
          />
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
            onChange={e => setTagPlano(e.target.value)}
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
                setDetalle(e.target.value);
                updateItem(item.id, { detalle: e.target.value });
              }}
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.05)',
                color: 'inherit',
                border: 'none'
              }}
            >
              <option value=""></option>
              {detalleEntriesByArea().map(group => (
                <optgroup key={group.area} label={group.area}>
                  {group.entries.map(([k]) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </optgroup>
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
          {countable ? (
            <input
              className="edit-input edit-input-mono"
              id="edit-qty"
              type="number"
              min="0"
              value={qty}
              onChange={e => setQty(parseFloat(e.target.value) || 0)}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <input type="hidden" value={qty} />
          )}
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
        <td>
          <input
            className="edit-input edit-input-mono"
            id="edit-unit"
            type="text"
            value={unit}
            style={{ textTransform: 'uppercase' }}
            onChange={e => setUnit(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td>
          <input
            className="edit-input"
            id="edit-notes"
            type="text"
            value={notes}
            placeholder="Notas..."
            onChange={e => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </td>
        <td className="td-a">
          <div className="act-row">
            <button className="btn-green" onClick={handleSave}>
              ✓ OK
            </button>
            <button className="btn-icon" onClick={onCancelEdit}>
              ✕
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="tr-row">
      <td className="td-n">{index}</td>
      <td className="td-u" style={{ color: 'var(--am)', fontWeight: 'bold' }}>
        {item.material || ''}
      </td>
      <td className="td-u">{item.plano || ''}</td>
      <td className="td-u">{item.rev || ''}</td>
      <td className="td-u">{item.tagUnico || ''}</td>
      <td className="td-u">{item.tagPlano || ''}</td>
      <td className="td-u">{item.detalle || ''}</td>
      <td className="td-d">{item.desc}</td>
      <td className="td-q">{countable ? item.qty : ''}</td>
      <td className="td-u">{item.metradoOt || ''}</td>
      <td className="td-u">{item.unit}</td>
      <td className={`td-no ${item.notes ? 'has-notes' : ''}`}>{item.notes ? item.notes : '—'}</td>
      <td className="td-a">
        <div className="act-row">
          <button className="btn-icon" onClick={onStartEdit} title="Editar fila">
            ✎
          </button>
          <button className="btn-icon btn-danger" onClick={() => deleteItem(item.id)} title="Eliminar">
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
};

