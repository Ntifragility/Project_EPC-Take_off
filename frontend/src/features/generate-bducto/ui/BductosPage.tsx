import React, { useMemo, useState } from 'react';
import { useBductoStore } from '../model/useBductoStore';
import { BductoPromptModal } from './BductoPromptModal';
import { BductoPrompt, BductoSource } from '../../../entities/bducto/model/types';
import { expandBducto, parseBductoSource, parseSourceBlock } from '../../../entities/bducto/model/expandBducto';
import { uid } from '../../../shared/lib/uid';
import './bductos.css';

const COLUMNS: { key: string; label: string; numeric?: boolean }[] = [
  { key: 'partidaSicme', label: 'PARTIDA SICME' },
  { key: 'partida', label: 'PARTIDA' },
  { key: 'sector', label: 'SECTOR' },
  { key: 'wbs', label: 'WBS' },
  { key: 'tagUnico', label: 'TAG UNICO' },
  { key: 'plano', label: 'PLANO' },
  { key: 'rev', label: 'REV' },
  { key: 'seccion', label: 'SECCION' },
  { key: 'desde', label: 'DESDE' },
  { key: 'hasta', label: 'HASTA' },
  { key: 'descripcion', label: 'DESCRIPCION DEL MATERIAL' },
  { key: 'diametro', label: 'DIAMETRO / MATERIAL' },
  { key: 'longitudM', label: 'LONGITUD TRAMO (m)', numeric: true },
  { key: 'cantXd', label: 'CANT X D', numeric: true },
  { key: 'metrado', label: 'METRADO', numeric: true },
  { key: 'und', label: 'UND' }
];

function cellText(key: string, value: string | number): string {
  if (typeof value !== 'number') return value;
  if (key === 'cantXd') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return value.toFixed(2);
}

export const BductosPage: React.FC = () => {
  const sources = useBductoStore(state => state.sources);
  const rows = useBductoStore(state => state.rows);
  const addSources = useBductoStore(state => state.addSources);
  const loadSample = useBductoStore(state => state.loadSample);
  const removeSource = useBductoStore(state => state.removeSource);
  const clearSources = useBductoStore(state => state.clearSources);
  const replaceRowsForSource = useBductoStore(state => state.replaceRowsForSource);
  const clearRows = useBductoStore(state => state.clearRows);

  const [plano, setPlano] = useState('P22-DA-3300-07-LY-028');
  const [tagEnPlano, setTagEnPlano] = useState('12 VIAS, 6", BD.K.1');
  const [quantity, setQuantity] = useState('19.3');
  const [paste, setPaste] = useState('');
  const [formError, setFormError] = useState('');
  const [queue, setQueue] = useState<BductoSource[]>([]);
  const [wizardTotal, setWizardTotal] = useState(0);

  const openWizard = (list: BductoSource[]) => {
    setWizardTotal(list.length);
    setQueue(list);
  };

  const rowCountBySource = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(row => counts.set(row.sourceId, (counts.get(row.sourceId) || 0) + 1));
    return counts;
  }, [rows]);

  const current = queue[0] ?? null;

  const addOne = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedQty = Number(quantity.replace(',', '.'));
    const candidate = { plano, tagEnPlano, quantity: parsedQty };
    const parsed = parseBductoSource(candidate);
    if (typeof parsed === 'string') {
      setFormError(parsed);
      return;
    }
    addSources([
      {
        plano: plano.trim().toUpperCase(),
        tagEnPlano: tagEnPlano.trim().toUpperCase().replace(/\s+/g, ' '),
        quantity: parsedQty
      }
    ]);
    setFormError('');
  };

  const addPasted = () => {
    const { rows: parsedRows, errors } = parseSourceBlock(paste);
    if (errors.length > 0) {
      setFormError(errors.join(' '));
    } else {
      setFormError('');
    }
    if (parsedRows.length > 0) {
      addSources(parsedRows);
      setPaste('');
    }
  };

  const confirmPrompt = (prompt: BductoPrompt) => {
    if (!current) return;
    const result = expandBducto(current, prompt, uid);
    if (result.ok === false) {
      setFormError(result.error);
      return;
    }
    replaceRowsForSource(current.id, result.rows);
    setFormError('');
    setQueue(pending => pending.slice(1));
  };

  return (
    <div className="bducto-page">
      <section className="bducto-entry">
        <h2>Tramo de bducto</h2>
        <form className="bducto-form" onSubmit={addOne}>
          <label>
            Plano
            <input value={plano} onChange={event => setPlano(event.target.value)} aria-label="Plano" />
          </label>
          <label>
            Tag en plano
            <input value={tagEnPlano} onChange={event => setTagEnPlano(event.target.value)} aria-label="Tag en plano" />
          </label>
          <label>
            Longitud (m)
            <input value={quantity} onChange={event => setQuantity(event.target.value)} aria-label="Longitud" />
          </label>
          <div className="bducto-actions">
            <button type="submit" className="btn-primary">
              Agregar tramo
            </button>
          </div>
        </form>
        <div className="bducto-paste">
          <label>
            Pegar listado (plano, tag, longitud)
            <textarea
              value={paste}
              onChange={event => setPaste(event.target.value)}
              placeholder={'P22-DA-3300-07-LY-028\t12 VIAS, 6", BD.K.1\t19.3'}
              aria-label="Pegar listado"
            />
          </label>
        </div>
        <div className="bducto-actions">
          <button type="button" className="btn-ghost" onClick={addPasted} disabled={!paste.trim()}>
            Agregar pegados
          </button>
          <button type="button" className="btn-ghost" onClick={loadSample}>
            Cargar ejemplo LY-028
          </button>
          <button type="button" className="btn-ghost" onClick={clearSources} disabled={sources.length === 0}>
            Limpiar
          </button>
        </div>
        {formError ? <p className="bducto-error">{formError}</p> : null}
      </section>

      <section className="bducto-card">
        <div className="bducto-elev-hd">
          <h2>Tramos ({sources.length})</h2>
          <button
            type="button"
            className="btn-primary"
            disabled={sources.length === 0}
            onClick={() => openWizard(sources)}
          >
            Generar todos
          </button>
        </div>
        {sources.length === 0 ? (
          <p className="bducto-preview">Agrega un tramo o carga el ejemplo.</p>
        ) : (
          <table className="bducto-sources">
            <thead>
              <tr>
                <th>PLANO</th>
                <th>TAG EN PLANO</th>
                <th>LONGITUD</th>
                <th>FILAS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id}>
                  <td>{source.plano}</td>
                  <td>{source.tagEnPlano}</td>
                  <td className="bducto-num">{source.quantity.toFixed(2)}</td>
                  <td className="bducto-num">{rowCountBySource.get(source.id) || 0}</td>
                  <td>
                    <button type="button" className="btn-ghost" onClick={() => openWizard([source])}>
                      Generar
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => removeSource(source.id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bducto-card">
        <div className="bducto-elev-hd">
          <h2>Metrado ({rows.length})</h2>
          <button type="button" className="btn-ghost" onClick={clearRows} disabled={rows.length === 0}>
            Limpiar metrado
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="bducto-preview">El metrado aparece aquí después de confirmar cada tramo.</p>
        ) : (
          <div className="takeoff-table-wrapper">
            <div className="takeoff-table-scroll-container">
              <table className="takeoff-table">
                <thead>
                  <tr>
                    {COLUMNS.map(column => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} data-kind={row.kind} data-tag={row.tagUnico}>
                      {COLUMNS.map(column => {
                        const value = row[column.key as keyof typeof row];
                        return (
                          <td key={column.key} className={column.numeric ? 'bducto-num' : undefined}>
                            {cellText(column.key, value as string | number)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <BductoPromptModal
        key={current?.id ?? 'closed'}
        source={current}
        index={wizardTotal - queue.length + 1}
        total={wizardTotal}
        onCancel={() => setQueue([])}
        onConfirm={confirmPrompt}
      />
    </div>
  );
};
