import React from 'react';

export type ColumnKey =
  | 'partida'
  | 'num'
  | 'mat'
  | 'plano'
  | 'rev'
  | 'tagUnico'
  | 'tagPlano'
  | 'detalle'
  | 'desc'
  | 'metradoOt'
  | 'unit';

export interface TakeoffTableHeaderProps {
  filterPlano: string;
  setFilterPlano: (plano: string) => void;
  availablePlanos: string[];
  filterDetalle: string;
  setFilterDetalle: (detalle: string) => void;
  availableDetalles: string[];
  colWidths?: Record<string, number>;
  onStartResize?: (colKey: string, e: React.MouseEvent) => void;
}

export const TakeoffTableHeader: React.FC<TakeoffTableHeaderProps> = ({
  filterPlano,
  setFilterPlano,
  availablePlanos,
  filterDetalle,
  setFilterDetalle,
  availableDetalles,
  colWidths = {},
  onStartResize
}) => {
  return (
    <thead>
      <tr>
        <th
          className="th-u th-resizable"
          style={{ width: colWidths.partida || 85, color: 'var(--am)' }}
        >
          <span>PARTIDA</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('partida', e)} />}
        </th>

        <th
          className="th-n th-resizable"
          style={{ width: colWidths.num || 40 }}
        >
          <span>N°</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('num', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.mat || 48 }}
        >
          <span>MAT</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('mat', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.plano || 140, padding: '0 4px', verticalAlign: 'middle' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>PLANO</span>
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
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('plano', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.rev || 50 }}
        >
          <span>REV</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('rev', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.tagUnico || 150 }}
        >
          <span>TAG UNICO</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('tagUnico', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.tagPlano || 130 }}
        >
          <span>TAG EN PLANO</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('tagPlano', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.detalle || 110, padding: '0 4px', verticalAlign: 'middle' }}
        >
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
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('detalle', e)} />}
        </th>

        <th
          className="th-d th-resizable"
          style={{ width: colWidths.desc || 280 }}
        >
          <span>DESCRIPCION</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('desc', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.metradoOt || 90 }}
        >
          <span>METRADO OT</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('metradoOt', e)} />}
        </th>

        <th
          className="th-u th-resizable"
          style={{ width: colWidths.unit || 75 }}
        >
          <span>UND</span>
          {onStartResize && <div className="col-resizer" onMouseDown={e => onStartResize('unit', e)} />}
        </th>
      </tr>
    </thead>
  );
};

