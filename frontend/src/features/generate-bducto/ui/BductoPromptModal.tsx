import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { RESTORE_BUTTON_ID } from '../../../shared/ui/windowMotion';
import { useBductoStore } from '../model/useBductoStore';
import { BductoPrompt, BductoSource } from '../../../entities/bducto/model/types';
import { curvesForDiameter, curveDescription, isRightAngleCurve } from '../../../entities/bducto/model/catalog';
import { parseBductoSource, parseTagEnPlano, splitSticks } from '../../../entities/bducto/model/expandBducto';
import { parseIntegerInput, parseLengthInput, parsePromptNumber, sanitizeIntegerInput, sanitizeLengthInput } from '../model/promptNumber';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';

export interface BductoPromptModalProps {
  source: BductoSource | null;
  index: number;
  total: number;
  canGoBack: boolean;
  minimized: boolean;
  /** Manual tramo: plano and tag are typed here, curvas unlock live once they parse. */
  manual: boolean;
  onMinimize: () => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: (prompt: BductoPrompt) => void;
}

interface CurveDraft {
  catalogId: string;
  length: string;
  quantity: string;
}

interface ElevationDraft {
  length: string;
  quantity: string;
}

const emptyElevation = (): ElevationDraft => ({ length: '0', quantity: '0' });

function draftsUseRightAngle(drafts: CurveDraft[], diameter: string): boolean {
  return drafts.some(choice => {
    const item = curvesForDiameter(diameter).find(curve => curve.id === choice.catalogId);
    return Boolean(item && isRightAngleCurve(item) && parsePromptNumber(choice.quantity) > 0);
  });
}

export const BductoPromptModal: React.FC<BductoPromptModalProps> = ({
  source,
  index,
  total,
  canGoBack,
  minimized,
  manual,
  onMinimize,
  onBack,
  onCancel,
  onConfirm
}) => {
  const armRestore = useBductoStore(state => state.armRestore);
  const patchManualDraft = useBductoStore(state => state.patchManualDraft);
  const showToast = useUIStore(state => state.showToast);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [quantity, setQuantity] = useState<string | null>(null);
  const [terminalCount, setTerminalCount] = useState('0');
  const [unionCount, setUnionCount] = useState('0');
  const [adaptadorCount, setAdaptadorCount] = useState('0');
  const [curves, setCurves] = useState<CurveDraft[]>([]);
  const [elevations, setElevations] = useState<ElevationDraft[]>([emptyElevation()]);
  const adaptadorEdited = useRef(false);

  useEffect(() => {
    if (!source) return;
    const parsed = parseBductoSource(source);
    const saved = source.prompt;
    setDesde(saved?.desde || source.desde || '');
    setHasta(saved?.hasta || source.hasta || '');
    setQuantity(
      saved && typeof saved.quantity === 'number'
        ? String(saved.quantity)
        : source.quantity > 0
          ? String(source.quantity)
          : ''
    );
    setTerminalCount(saved ? String(saved.terminalCount) : '0');
    setUnionCount(saved ? String(saved.unionCount) : typeof parsed === 'string' ? '0' : String(parsed.vias));
    setAdaptadorCount(saved ? String(saved.adaptadorCount) : '0');
    adaptadorEdited.current = Boolean(saved && typeof parsed !== 'string' && saved.adaptadorCount !== parsed.vias);
    setElevations(
      saved && saved.elevations.length > 0
        ? saved.elevations.map(line => ({ length: String(line.lengthM), quantity: String(line.quantity) }))
        : [emptyElevation()]
    );
    setCurves(
      typeof parsed === 'string'
        ? []
        : curvesForDiameter(parsed.diameter).map(item => {
            const choice = saved?.curves.find(curve => curve.catalogId === item.id);
            return {
              catalogId: item.id,
              length: String(choice ? choice.lengthM : item.lengthM),
              quantity: String(choice ? choice.quantity : 0)
            };
          })
    );
    // Keyed by tramo id (not the object): typing the manual plano/tag must not wipe the form,
    // and table edits behind the window must not reset it either.
  }, [source?.id]);

  // Manual tramo: plano/tag arrive keystroke by keystroke, so parse from the live
  // form values (including the typed longitud). File tramos parse from the source.
  const parsed = useMemo(() => {
    if (!source) return null;
    if (!manual) return parseBductoSource(source);
    const typed = quantity == null ? source.quantity : parseLengthInput(quantity);
    return parseBductoSource({ plano: source.plano, tagEnPlano: source.tagEnPlano, quantity: typed });
  }, [source, manual, quantity]);

  // Manual tramo: diameter/vias resolve from the tag alone so its curvas show
  // at once; the full parse (plano + longitud too) gates the metrado preview.
  const tagInfo = manual && source ? parseTagEnPlano(source.tagEnPlano) : null;
  const diameter =
    parsed && typeof parsed !== 'string' ? parsed.diameter : tagInfo?.diameter ?? '';
  const vias = parsed && typeof parsed !== 'string' ? parsed.vias : tagInfo?.vias ?? 0;

  // Manual tramo: when the typed tag resolves to a new diameter (or vía count),
  // offer that diameter's curvas and default the unión count to its vías.
  useEffect(() => {
    if (!manual || !diameter || !vias) return;
    setCurves(
      curvesForDiameter(diameter).map(item => ({
        catalogId: item.id,
        length: String(item.lengthM),
        quantity: '0'
      }))
    );
    setUnionCount(current => (current === '0' || current === '' ? String(vias) : current));
  }, [manual, diameter, vias]);

  const usesRightAngle =
    parsed && typeof parsed !== 'string' ? draftsUseRightAngle(curves, parsed.diameter) : false;

  const applyCurveQuantity = (catalogId: string, quantity: string) => {
    setCurves(current => {
      const next = current.map(row => (row.catalogId === catalogId ? { ...row, quantity } : row));
      if (!parsed || typeof parsed === 'string') return next;
      if (!draftsUseRightAngle(next, parsed.diameter)) {
        adaptadorEdited.current = false;
        setAdaptadorCount('0');
      } else if (!adaptadorEdited.current) {
        setAdaptadorCount(String(parsed.vias));
      }
      return next;
    });
  };

  if (!source) return null;
  const invalid = !parsed || typeof parsed === 'string';
  if (!manual && invalid) return null;
  const adaptadorInfo = !invalid && parsed && typeof parsed !== 'string' ? parsed : null;

  const savedPrompt = source.prompt;
  const parsedVias = parsed && typeof parsed !== 'string' ? parsed.vias : 0;
  const nonZeroEntry = (value: string) => value !== '' && value !== '0';
  const isDirty =
    desde !== (savedPrompt?.desde || source.desde || '') ||
    hasta !== (savedPrompt?.hasta || source.hasta || '') ||
    (quantity ?? '') !== (savedPrompt && typeof savedPrompt.quantity === 'number' ? String(savedPrompt.quantity) : source.quantity > 0 ? String(source.quantity) : '') ||
    terminalCount !== (savedPrompt ? String(savedPrompt.terminalCount) : '0') ||
    unionCount !== (savedPrompt ? String(savedPrompt.unionCount) : String(parsedVias)) ||
    adaptadorCount !== (savedPrompt ? String(savedPrompt.adaptadorCount) : '0') ||
    curves.some(choice => nonZeroEntry(choice.quantity)) ||
    elevations.some(line => nonZeroEntry(line.length) || nonZeroEntry(line.quantity));

  const lengthM = invalid ? 0 : quantity == null ? source.quantity : parseLengthInput(quantity);
  const sticks = lengthM > 0 ? splitSticks(lengthM) : [];
  const stickSummary =
    sticks.length === 0
      ? 'Sin tramos'
      : sticks.every(length => length === sticks[0])
        ? `${sticks.length} × ${sticks[0].toFixed(2)} m`
        : `${sticks.filter(length => length === 3.05).length} × 3.05 m + ${sticks[sticks.length - 1].toFixed(2)} m`;

  const submitPrompt = () => {
    if (manual && invalid) {
      showToast(typeof parsed === 'string' ? parsed : 'Escribe el plano, el tag y la longitud.', 'warn');
      return;
    }
    const prompt: BductoPrompt = {
      desde,
      hasta,
      quantity: lengthM,
      terminalCount: parseIntegerInput(terminalCount),
      unionCount: parseIntegerInput(unionCount),
      adaptadorCount: usesRightAngle ? parseIntegerInput(adaptadorCount) : 0,
      curves: curves.map(choice => ({
        catalogId: choice.catalogId,
        lengthM: parseLengthInput(choice.length),
        quantity: parseIntegerInput(choice.quantity)
      })),
      elevations: elevations.map(line => ({
        lengthM: parseLengthInput(line.length),
        quantity: parseIntegerInput(line.quantity)
      }))
    };
    // #region agent log
    fetch('http://127.0.0.1:7553/ingest/a68ab0cd-10e6-497e-8979-86720b62c569',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b40dbc'},body:JSON.stringify({sessionId:'b40dbc',location:'BductoPromptModal.tsx:submit',message:'prompt numbers kept',data:{terminalRaw:terminalCount,adaptadorRaw:adaptadorCount,terminalCount:prompt.terminalCount,adaptadorCount:prompt.adaptadorCount,elevationsRaw:elevations,elevations:prompt.elevations,curveQtyRaw:curves.map(choice=>choice.quantity)},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    onConfirm(prompt);
  };

  const title = source.prompt ? 'Editar tramo' : 'Completar tramo';
  const subtitle =
    invalid || typeof parsed === 'string'
      ? 'Tramo manual'
      : `${index} de ${total} · ${parsed.stem}.${parsed.bankId} · ${parsed.vias} vías · D=${parsed.diameter}`;

  if (minimized) return null;

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onCancel}
      dismissOnOverlay={false}
      dismiss="dirty-confirm"
      isDirty={isDirty}
      onMinimize={onMinimize}
      onPrepareMinimize={() => flushSync(() => armRestore())}
      minimizeTargetId={RESTORE_BUTTON_ID}
      maxWidth="880px"
    >
      <form
        onSubmit={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      >
        <div className="modal-body bducto-prompt">
          {manual && (
            <>
              <label>
                PLANO
                <input
                  value={source.plano}
                  onChange={event => patchManualDraft({ plano: event.target.value.toUpperCase() })}
                  placeholder="P22-DA-3300-07-LY-028"
                />
              </label>
              <label style={{ marginTop: '8px' }}>
                TAG EN PLANO
                <input
                  value={source.tagEnPlano}
                  onChange={event => patchManualDraft({ tagEnPlano: event.target.value.toUpperCase() })}
                  placeholder='1 VIA, 3", BD.C.1'
                />
              </label>
            </>
          )}
          {invalid ? (
            <p className="bducto-preview" style={manual ? { marginTop: '8px' } : undefined}>
              {typeof parsed === 'string' ? parsed : 'Escribe el plano, el tag y la longitud.'}
            </p>
          ) : (
            <p className="bducto-preview">
              Conduit: {stickSummary}. Cinta: {lengthM.toFixed(2)} m. Unión PVC SCH 40 D=
              {parsed.diameter}: por defecto {parsed.vias}.
            </p>
          )}
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
              Quantity (m)
              <input
                inputMode="decimal"
                value={quantity ?? ''}
                aria-label="Quantity"
                title="Longitud: hasta 2 decimales"
                onChange={event => setQuantity(sanitizeLengthInput(event.target.value))}
                placeholder={manual ? '2.2' : undefined}
              />
            </label>
            <label>
              Terminal campana (und)
              <input
                inputMode="numeric"
                value={terminalCount}
                aria-label="Terminal campana"
                title="Cantidad: solo números enteros"
                onChange={event => setTerminalCount(sanitizeIntegerInput(event.target.value))}
              />
            </label>
            <label>
              {`Union PVC SCH 40${diameter ? ` D=${diameter}` : ''} (und)`}
              <input
                inputMode="numeric"
                value={unionCount}
                aria-label="Union PVC"
                title="Cantidad: solo números enteros"
                onChange={event => setUnionCount(sanitizeIntegerInput(event.target.value))}
              />
            </label>
          </div>

          <h3>Curvas</h3>
          {!diameter ? (
            <p className="bducto-preview">Escribe el tag en plano para ver sus curvas.</p>
          ) : curves.length === 0 ? (
            <p className="bducto-preview">No hay curvas en el catálogo para D={diameter}.</p>
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
                  const item = curvesForDiameter(diameter).find(curve => curve.id === choice.catalogId);
                  return (
                    <tr key={choice.catalogId}>
                      <td>{item ? curveDescription(item) : choice.catalogId}</td>
                      <td>
                        <input
                          inputMode="decimal"
                          value={choice.length}
                          aria-label={`Longitud ${choice.catalogId}`}
                          title="Longitud: hasta 2 decimales"
                          onChange={event =>
                            setCurves(current =>
                              current.map(row =>
                                row.catalogId === choice.catalogId
                                  ? { ...row, length: sanitizeLengthInput(event.target.value) }
                                  : row
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          inputMode="numeric"
                          value={choice.quantity}
                          aria-label={`Cantidad ${choice.catalogId}`}
                          title="Cantidad: solo números enteros"
                          onChange={event => applyCurveQuantity(choice.catalogId, sanitizeIntegerInput(event.target.value))}
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
                      inputMode="decimal"
                      value={line.length}
                      placeholder="0.40"
                      aria-label={`Elevación longitud ${lineIndex + 1}`}
                      title="Longitud: hasta 2 decimales"
                      onChange={event =>
                        setElevations(current =>
                          current.map((row, index) =>
                            index === lineIndex ? { ...row, length: sanitizeLengthInput(event.target.value) } : row
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      inputMode="numeric"
                      value={line.quantity}
                      placeholder="5"
                      aria-label={`Elevación cantidad ${lineIndex + 1}`}
                      title="Cantidad: solo números enteros"
                      onChange={event =>
                        setElevations(current =>
                          current.map((row, index) =>
                            index === lineIndex ? { ...row, quantity: sanitizeIntegerInput(event.target.value) } : row
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
          {usesRightAngle && adaptadorInfo ? (
            <label className="bducto-adaptador">
              {`Adaptador PVC-RGS D=${adaptadorInfo.diameter} (und)`}
              <input
                inputMode="numeric"
                value={adaptadorCount}
                aria-label="Adaptador PVC-RGS"
                title="Cantidad: solo números enteros"
                onChange={event => {
                  adaptadorEdited.current = true;
                  setAdaptadorCount(sanitizeIntegerInput(event.target.value));
                }}
              />
              <span>Junto a la elevación. Por defecto {adaptadorInfo.vias}, igual a las vías. Puede ser mayor, o 0 si no se usa.</span>
            </label>
          ) : (
            <p className="bducto-preview">El adaptador PVC-RGS se pide junto a la elevación solo cuando hay curvas de 90°.</p>
          )}
        </div>
        <div className="modal-ft">
          <button type="button" className="btn-ghost bducto-back" onClick={onBack} disabled={!canGoBack}>
            Atrás
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={submitPrompt}>
            {source.prompt ? 'Actualizar metrado' : 'Generar metrado'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
