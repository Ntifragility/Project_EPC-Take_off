import React, { useEffect, useMemo, useState } from 'react';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { BductoPrompt, BductoSource, CurveChoice, ElevationLine } from '../../../entities/bducto/model/types';
import { curvesForDiameter, curveDescription } from '../../../entities/bducto/model/catalog';
import { parseBductoSource } from '../../../entities/bducto/model/expandBducto';

export interface BductoPromptModalProps {
  source: BductoSource | null;
  index: number;
  total: number;
  onCancel: () => void;
  onConfirm: (prompt: BductoPrompt) => void;
}

const emptyElevation = (): ElevationLine => ({ lengthM: 0, quantity: 0 });

export const BductoPromptModal: React.FC<BductoPromptModalProps> = ({
  source,
  index,
  total,
  onCancel,
  onConfirm
}) => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [terminalCount, setTerminalCount] = useState(0);
  const [adaptadorCount, setAdaptadorCount] = useState(0);
  const [curves, setCurves] = useState<CurveChoice[]>([]);
  const [elevations, setElevations] = useState<ElevationLine[]>([emptyElevation()]);

  useEffect(() => {
    if (!source) return;
    const parsed = parseBductoSource(source);
    setDesde('');
    setHasta('');
    setTerminalCount(0);
    setAdaptadorCount(0);
    setElevations([emptyElevation()]);
    setCurves(
      typeof parsed === 'string'
        ? []
        : curvesForDiameter(parsed.diameter).map(item => ({
            catalogId: item.id,
            lengthM: item.lengthM,
            quantity: 0
          }))
    );
  }, [source]);

  const parsed = useMemo(() => (source ? parseBductoSource(source) : null), [source]);

  if (!source || !parsed || typeof parsed === 'string') return null;

  const stickSummary =
    parsed.sticks.length === 0
      ? 'Sin tramos'
      : parsed.sticks.every(length => length === parsed.sticks[0])
        ? `${parsed.sticks.length} × ${parsed.sticks[0].toFixed(2)} m`
        : `${parsed.sticks.filter(length => length === 3.05).length} × 3.05 m + ${parsed.sticks[parsed.sticks.length - 1].toFixed(2)} m`;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm({
      desde,
      hasta,
      terminalCount,
      adaptadorCount,
      curves,
      elevations
    });
  };

  return (
    <ModalShell
      title="Completar tramo"
      subtitle={`${index} de ${total} · ${parsed.stem}.${parsed.bankId} · ${parsed.vias} vías · D=${parsed.diameter}`}
      onClose={onCancel}
      maxWidth="880px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body bducto-prompt">
          <p className="bducto-preview">
            Conduit: {stickSummary}. Cinta: {source.quantity.toFixed(2)} m. Uniones:{' '}
            {parsed.unionsPerVia} por vía × {parsed.vias} = {parsed.unionsPerVia * parsed.vias}.
          </p>

          <div className="bducto-prompt-grid">
            <label>
              DESDE
              <input value={desde} onChange={event => setDesde(event.target.value)} placeholder="300-MH-015" />
            </label>
            <label>
              HASTA
              <input value={hasta} onChange={event => setHasta(event.target.value)} placeholder="300-MH-016" />
            </label>
            <label>
              Terminal campana (und)
              <input
                type="number"
                min={0}
                step={1}
                value={terminalCount}
                onChange={event => setTerminalCount(Number(event.target.value))}
              />
            </label>
            <label>
              Adaptador PVC-RGS (und)
              <input
                type="number"
                min={0}
                step={1}
                value={adaptadorCount}
                onChange={event => setAdaptadorCount(Number(event.target.value))}
              />
            </label>
          </div>

          <h3>Curvas</h3>
          {curves.length === 0 ? (
            <p className="bducto-preview">No hay curvas en el catálogo para D={parsed.diameter}.</p>
          ) : (
            <table className="bducto-mini">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Longitud (m)</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {curves.map(choice => {
                  const item = curvesForDiameter(parsed.diameter).find(curve => curve.id === choice.catalogId);
                  return (
                    <tr key={choice.catalogId}>
                      <td>{item ? curveDescription(item) : choice.catalogId}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={choice.lengthM}
                          aria-label={`Longitud ${choice.catalogId}`}
                          onChange={event =>
                            setCurves(current =>
                              current.map(row =>
                                row.catalogId === choice.catalogId
                                  ? { ...row, lengthM: Number(event.target.value) }
                                  : row
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={choice.quantity}
                          aria-label={`Cantidad ${choice.catalogId}`}
                          onChange={event =>
                            setCurves(current =>
                              current.map(row =>
                                row.catalogId === choice.catalogId
                                  ? { ...row, quantity: Number(event.target.value) }
                                  : row
                              )
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="bducto-elev-hd">
            <h3>Longitud de elevación</h3>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setElevations(current => [...current, emptyElevation()])}
            >
              Agregar línea
            </button>
          </div>
          <table className="bducto-mini">
            <thead>
              <tr>
                <th>Longitud (m)</th>
                <th>Cantidad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {elevations.map((line, lineIndex) => (
                <tr key={lineIndex}>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.lengthM || ''}
                      placeholder="0.40"
                      aria-label={`Elevación longitud ${lineIndex + 1}`}
                      onChange={event =>
                        setElevations(current =>
                          current.map((row, index) =>
                            index === lineIndex ? { ...row, lengthM: Number(event.target.value) } : row
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={line.quantity || ''}
                      placeholder="5"
                      aria-label={`Elevación cantidad ${lineIndex + 1}`}
                      onChange={event =>
                        setElevations(current =>
                          current.map((row, index) =>
                            index === lineIndex ? { ...row, quantity: Number(event.target.value) } : row
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        setElevations(current =>
                          current.length === 1 ? [emptyElevation()] : current.filter((_, index) => index !== lineIndex)
                        )
                      }
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Generar metrado
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
