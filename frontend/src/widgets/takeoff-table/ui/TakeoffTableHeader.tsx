import React from 'react';

export interface TakeoffTableHeaderProps {
  filterPlano: string;
  setFilterPlano: (plano: string) => void;
  availablePlanos: string[];
  filterDetalle: string;
  setFilterDetalle: (detalle: string) => void;
  availableDetalles: string[];
}

export const TakeoffTableHeader: React.FC<TakeoffTableHeaderProps> = ({
  filterPlano,
  setFilterPlano,
  availablePlanos,
  filterDetalle,
  setFilterDetalle,
  availableDetalles
}) => {
  return (
    <thead>
      <tr>
        <th className="th-u" style={{ color: 'var(--am)' }}>
          PARTIDA
        </th>
        <th className="th-n">N°</th>
        <th className="th-u">MAT</th>
        <th className="th-u" style={{ padding: '0 4px', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <span>PLANO</span>
            {availablePlanos.length > 1 && (
              <select
                value={filterPlano}
                onChange={e => setFilterPlano(e.target.value)}
                style={{
                  background: filterPlano ? 'var(--am, #2563eb)' : 'var(--s2)',
                  color: filterPlano ? '#ffffff' : 'var(--tx)',
                  border: filterPlano ? '1px solid var(--am, #2563eb)' : '1px solid var(--b1)',
                  borderRadius: '3px',
                  fontSize: '9px',
                  padding: '1px 2px',
                  cursor: 'pointer',
                  maxWidth: '75px',
                  fontWeight: filterPlano ? 'bold' : 'normal'
                }}
                title="Filtrar por Plano"
              >
                <option value="" style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>Todos ({availablePlanos.length})</option>
                {availablePlanos.map(p => (
                  <option key={p} value={p} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </th>
        <th className="th-u">REV</th>
        <th className="th-u">TAG UNICO</th>
        <th className="th-u">TAG EN PLANO</th>
        <th className="th-u" style={{ padding: '0 4px', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <span>DETALLE</span>
            {availableDetalles.length > 1 && (
              <select
                value={filterDetalle}
                onChange={e => setFilterDetalle(e.target.value)}
                style={{
                  background: filterDetalle ? 'var(--am, #2563eb)' : 'var(--s2)',
                  color: filterDetalle ? '#ffffff' : 'var(--tx)',
                  border: filterDetalle ? '1px solid var(--am, #2563eb)' : '1px solid var(--b1)',
                  borderRadius: '3px',
                  fontSize: '9px',
                  padding: '1px 2px',
                  cursor: 'pointer',
                  maxWidth: '75px',
                  fontWeight: filterDetalle ? 'bold' : 'normal'
                }}
                title="Filtrar por Detalle"
              >
                <option value="" style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>Todos ({availableDetalles.length})</option>
                {availableDetalles.map(d => (
                  <option key={d} value={d} style={{ backgroundColor: 'var(--s1)', color: 'var(--tx)' }}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </th>
        <th className="th-d">DESCRIPCION</th>
        <th className="th-u">METRADO OT</th>
        <th className="th-u">UND</th>
      </tr>
    </thead>
  );
};
