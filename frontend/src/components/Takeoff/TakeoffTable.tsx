import React from 'react';
import { TakeoffItem } from '../../types/takeoff';
import { TakeoffRow } from './TakeoffRow';
import { useTakeoff } from '../../context/TakeoffContext';

interface TakeoffTableProps {
  items: TakeoffItem[];
}

export const TakeoffTable: React.FC<TakeoffTableProps> = ({ items }) => {
  const {
    items: allItems,
    filterDetalle,
    setFilterDetalle,
    editingItemId,
    setEditingItemId
  } = useTakeoff();

  // Extract unique detalle values for filter
  const availableDetalles = Array.from(
    new Set(allItems.map(i => i.detalle).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <table>
      <colgroup>
        <col className="c-n" />
        <col className="c-mat" />
        <col className="c-plano" />
        <col className="c-rev" />
        <col className="c-t-unico" />
        <col className="c-t-plano" />
        <col className="c-det" />
        <col className="c-d" />
        <col className="c-q" />
        <col className="c-mo" />
        <col className="c-u" />
      </colgroup>
      <thead>
        <tr style={{ color: 'var(--di)', opacity: 0.8 }}>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>40px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>40px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>170px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>30px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>140px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>75px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>95px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>AUTO</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>70px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>75px</th>
          <th style={{ padding: '2px', fontSize: '10px', fontWeight: 400, borderBottom: 'none', fontFamily: 'var(--mo)' }}>90px</th>
        </tr>
        <tr>
          <th>#</th>
          <th>MAT</th>
          <th>PLANO</th>
          <th>REV</th>
          <th>TAG ÚNICO</th>
          <th>TAG EN PLANO</th>
          <th style={{ padding: 0 }}>
            <select
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 'inherit',
                fontSize: 'inherit',
                width: '100%',
                cursor: 'pointer',
                outline: 'none'
              }}
              value={filterDetalle}
              onChange={e => setFilterDetalle(e.target.value)}
            >
              <option value="" style={{ color: '#000' }}>
                DETALLE (FILTRO)
              </option>
              {availableDetalles.map(d => (
                <option key={d} value={d} style={{ color: '#000' }}>
                  {d}
                </option>
              ))}
            </select>
          </th>
          <th>DESCRIPCIÓN</th>
          <th>CANT.</th>
          <th>METRADO OT</th>
          <th>UNID</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, idx) => (
          <TakeoffRow
            key={it.id}
            item={it}
            index={idx + 1}
            isEditing={editingItemId === it.id}
            onStartEdit={() => setEditingItemId(it.id)}
            onCancelEdit={() => setEditingItemId(null)}
          />
        ))}
      </tbody>
    </table>
  );
};

