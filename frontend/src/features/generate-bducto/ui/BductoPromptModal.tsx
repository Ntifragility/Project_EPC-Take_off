import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { RESTORE_BUTTON_ID } from '../../../shared/ui/windowMotion';
import { useBductoStore } from '../model/useBductoStore';
import { BductoPrompt, BductoSource } from '../../../entities/bducto/model/types';
import { curvesForDiameter, curveDescription, isRightAngleCurve, getCurveCatalog, catalogDiameters, subscribeCurveCatalog } from '../../../entities/bducto/model/catalog';
import { buildTagEnPlano, parseBductoSource, parseTagEnPlano, replaceTagDiameter, splitSticks } from '../../../entities/bducto/model/expandBducto';
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
  onConfirm: (prompt: BductoPrompt, tagEnPlano: string) => void;
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

function savedUsesRightAngle(saved: BductoPrompt | undefined, diameter: string): boolean {
  if (!saved || !diameter) return false;
  return saved.curves.some(choice => {
    if (choice.quantity <= 0) return false;
    const item = curvesForDiameter(diameter).find(curve => curve.id === choice.catalogId);
    return Boolean(item && isRightAngleCurve(item));
  });
}

interface PromptSeed {
  desde: string;
  hasta: string;
  rev: string;
  quantity: string;
  terminalCount: string;
  unionCount: string;
  adaptadorCount: string;
  adaptadorEdited: boolean;
  diameter: string;
  curves: CurveDraft[];
  elevations: ElevationDraft[];
}

function draftFrom(source: BductoSource | null): PromptSeed {
  if (!source) {
    return {
      desde: '',
      hasta: '',
      rev: '0',
      quantity: '',
      terminalCount: '0',
      unionCount: '0',
      adaptadorCount: '0',
      adaptadorEdited: false,
      diameter: '',
      curves: [],
      elevations: [emptyElevation()]
    };
  }
  const parsed = parseBductoSource(source);
  const saved = source.prompt;
  const tag = parseTagEnPlano(source.tagEnPlano);
  const unionCount = saved ? String(saved.unionCount) : typeof parsed === 'string' ? '0' : String(parsed.vias);
  return {
    desde: saved?.desde || source.desde || '',
    hasta: saved?.hasta || source.hasta || '',
    rev: saved?.rev || source.rev || '0',
    quantity:
      saved && typeof saved.quantity === 'number'
        ? String(saved.quantity)
        : source.quantity > 0
          ? String(source.quantity)
          : '',
    terminalCount: saved ? String(saved.terminalCount) : '0',
    unionCount,
    adaptadorCount: saved ? String(saved.adaptadorCount) : '0',
    adaptadorEdited: Boolean(
      saved &&
        savedUsesRightAngle(saved, typeof parsed === 'string' ? '' : parsed.diameter) &&
        saved.adaptadorCount !== saved.unionCount
    ),
    diameter: tag?.diameter || (typeof parsed === 'string' ? '' : parsed.diameter),
    elevations:
      saved && saved.elevations.length > 0
        ? saved.elevations.map(line => ({ length: String(line.lengthM), quantity: String(line.quantity) }))
        : [emptyElevation()],
    curves:
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
  };
}

function remapCurves(previous: CurveDraft[], nextDiameter: string): CurveDraft[] {
  const byShape = new Map<string, CurveDraft>();
  for (const choice of previous) {
    const item = getCurveCatalog().find(curve => curve.id === choice.catalogId);
    if (item) byShape.set(`${item.angle}|${item.radius}`, choice);
  }
  return curvesForDiameter(nextDiameter).map(item => {
    const carried = byShape.get(`${item.angle}|${item.radius}`);
    return {
      catalogId: item.id,
      length: String(item.lengthM),
      quantity: carried ? carried.quantity : '0'
    };
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
  const seed = draftFrom(source);
  const [desde, setDesde] = useState(seed.desde);
  const [hasta, setHasta] = useState(seed.hasta);
  const [rev, setRev] = useState(seed.rev);
  const [quantity, setQuantity] = useState<string | null>(seed.quantity);
  const [terminalCount, setTerminalCount] = useState(seed.terminalCount);
  const [unionCount, setUnionCount] = useState(seed.unionCount);
  const [adaptadorCount, setAdaptadorCount] = useState(seed.adaptadorCount);
  const [curves, setCurves] = useState<CurveDraft[]>(seed.curves);
  const [elevations, setElevations] = useState<ElevationDraft[]>(seed.elevations);
  const [diameterText, setDiameterText] = useState(seed.diameter);
  const adaptadorEdited = useRef(seed.adaptadorEdited);
  const diameterBaseline = useRef(seed.diameter);
  const [catalogSize, setCatalogSize] = useState(() => getCurveCatalog().length);

  const initialTag = parseTagEnPlano(source?.tagEnPlano || '');
  const [manualVias, setManualVias] = useState(() => initialTag ? String(initialTag.vias) : '1');
  const [manualBank, setManualBank] = useState(() => initialTag ? initialTag.bankId : 'BD.C.1');

  const onViasChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setManualVias(clean);
    const v = parseInt(clean, 10) || 1;
    const d = (manual ? tagInfo?.diameter : diameterText) || '3"';
    const b = (manualBank || 'BD.C.1').trim().toUpperCase();
    patchManualDraft({ tagEnPlano: buildTagEnPlano(v, d, b) });
  };

  const onBankChange = (val: string) => {
    const b = val.toUpperCase();
    setManualBank(b);
    const v = parseInt(manualVias, 10) || 1;
    const d = (manual ? tagInfo?.diameter : diameterText) || '3"';
    patchManualDraft({ tagEnPlano: buildTagEnPlano(v, d, b) });
  };

  const onRevChange = (val: string) => {
    const clean = val.toUpperCase();
    setRev(clean);
    if (manual) patchManualDraft({ rev: clean });
  };

  useEffect(() => {
    return subscribeCurveCatalog(() => {
      setCatalogSize(getCurveCatalog().length);
      setCurves(current => (current.length > 0 ? current : draftFrom(source).curves));
    });
  }, [source]);

  useEffect(() => {
    if (!source) return;
    const next = draftFrom(source);
    setDesde(next.desde);
    setHasta(next.hasta);
    setRev(next.rev);
    setQuantity(next.quantity);
    setTerminalCount(next.terminalCount);
    setUnionCount(next.unionCount);
    setAdaptadorCount(next.adaptadorCount);
    adaptadorEdited.current = next.adaptadorEdited;
    diameterBaseline.current = next.diameter;
    setDiameterText(next.diameter);
    setElevations(next.elevations);
    setCurves(next.curves);
    if (source) {
      const info = parseTagEnPlano(source.tagEnPlano);
      if (info) {
        setManualVias(String(info.vias));
        setManualBank(info.bankId);
      }
    }
    // Keyed by tramo id (not the object): typing the manual plano/tag must not wipe the form,
    // and table edits behind the window must not reset it either.
  }, [source?.id]);

  // Manual tramo: plano/tag arrive keystroke by keystroke, so parse from the live
  // form values (including the typed longitud). File tramos parse from the source.
  const activeTag = !source
    ? ''
    : manual
      ? source.tagEnPlano
      : (replaceTagDiameter(source.tagEnPlano, diameterText) ?? source.tagEnPlano);

  const parsed = useMemo(() => {
    if (!source) return null;
    if (manual) {
      const typed = quantity == null ? source.quantity : parseLengthInput(quantity);
      return parseBductoSource({ plano: source.plano, tagEnPlano: source.tagEnPlano, quantity: typed });
    }
    const typed = quantity == null ? source.quantity : parseLengthInput(quantity);
    const quantityForParse = typed > 0 ? typed : source.quantity;
    return parseBductoSource({ plano: source.plano, tagEnPlano: activeTag, quantity: quantityForParse });
  }, [source, manual, quantity, activeTag]);

  useEffect(() => {
    if (manual) return;
    const next = diameterText.trim();
    if (!next || next === diameterBaseline.current) return;
    diameterBaseline.current = next;
    setCurves(current => remapCurves(current, next));
  }, [manual, diameterText]);

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

  useEffect(() => {
    if (adaptadorEdited.current) return;
    setAdaptadorCount(usesRightAngle ? (unionCount === '' ? '0' : unionCount) : '0');
  }, [usesRightAngle, unionCount]);

  const applyCurveQuantity = (catalogId: string, quantity: string) => {
    setCurves(current => {
      const next = current.map(row => (row.catalogId === catalogId ? { ...row, quantity } : row));
      if (!parsed || typeof parsed === 'string') return next;
      if (!draftsUseRightAngle(next, parsed.diameter)) {
        adaptadorEdited.current = false;
        setAdaptadorCount('0');
      }
      return next;
    });
  };

  if (!source) return null;
  const invalid = !parsed || typeof parsed === 'string';
  if (!manual && invalid) return null;

  const savedPrompt = source.prompt;
  const parsedVias = parsed && typeof parsed !== 'string' ? parsed.vias : 0;
  const baselineQuantity =
    savedPrompt && typeof savedPrompt.quantity === 'number'
      ? String(savedPrompt.quantity)
      : source.quantity > 0
        ? String(source.quantity)
        : '';
  const elevationBaseline =
    savedPrompt && savedPrompt.elevations.length > 0 ? savedPrompt.elevations : [{ lengthM: 0, quantity: 0 }];
  const elevationsDirty =
    elevations.length !== elevationBaseline.length ||
    elevations.some((line, lineIndex) => {
      const base = elevationBaseline[lineIndex];
      return !base || line.length !== String(base.lengthM) || line.quantity !== String(base.quantity);
    });
  const curvesDirty = curves.some(choice => {
    const savedChoice = savedPrompt?.curves.find(curve => curve.catalogId === choice.catalogId);
    const catalogLength = curvesForDiameter(diameter).find(item => item.id === choice.catalogId)?.lengthM;
    const baseLength = String(savedChoice ? savedChoice.lengthM : catalogLength ?? choice.length);
    const baseQty = String(savedChoice ? savedChoice.quantity : 0);
    return choice.length !== baseLength || choice.quantity !== baseQty;
  });
  const isDirty =
    desde !== (savedPrompt?.desde || source.desde || '') ||
    hasta !== (savedPrompt?.hasta || source.hasta || '') ||
    rev !== (savedPrompt?.rev || source.rev || '0') ||
    (quantity ?? '') !== baselineQuantity ||
    terminalCount !== (savedPrompt ? String(savedPrompt.terminalCount) : '0') ||
    unionCount !== (savedPrompt ? String(savedPrompt.unionCount) : String(parsedVias)) ||
    adaptadorCount !== (savedPrompt ? String(savedPrompt.adaptadorCount) : '0') ||
    (!manual && diameterText !== (parseTagEnPlano(source.tagEnPlano)?.diameter ?? '')) ||
    curvesDirty ||
    elevationsDirty;

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
    const tagEnPlano = manual
      ? buildTagEnPlano(manualVias || '1', (manual ? tagInfo?.diameter : diameterText) || '3"', manualBank || 'BD.C.1')
      : (replaceTagDiameter(source.tagEnPlano, diameterText) ?? '');
    if (!parseTagEnPlano(tagEnPlano)) {
      showToast('Elige un diámetro del catálogo y escribe un tag válido.', 'warn');
      return;
    }
    const prompt: BductoPrompt = {
      desde,
      hasta,
      rev: rev.trim().toUpperCase() || '0',
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
    onConfirm(prompt, tagEnPlano);
  };

  const title = source.prompt ? 'Editar tramo' : 'Completar tramo';
  const subtitle =
    invalid || typeof parsed === 'string'
      ? 'Tramo manual'
      : `${index} de ${total} · ${parsed.stem}.${parsed.bankId} · ${parsed.vias} vías · D=${parsed.diameter}${rev ? ` · REV=${rev}` : ''}`;

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
        <div className="modal-body prompt bducto-prompt">
          {manual && (
            <div className="bducto-prompt-grid" style={{ marginBottom: '10px' }}>
              <label>
                PLANO
                <input
                  value={source.plano}
                  onChange={event => patchManualDraft({ plano: event.target.value.toUpperCase() })}
                  placeholder="P22-DA-3300-07-LY-028"
                />
              </label>
              <label>
                REV
                <input
                  value={rev}
                  aria-label="Revisión"
                  onChange={event => onRevChange(event.target.value)}
                  placeholder="0"
                  maxLength={6}
                />
              </label>
              <label>
                N° VÍAS
                <input
                  inputMode="numeric"
                  value={manualVias}
                  aria-label="Número de vías"
                  onChange={event => onViasChange(event.target.value)}
                  placeholder="1"
                />
              </label>
              <label>
                TAG
                <input
                  value={manualBank}
                  aria-label="Tag"
                  onChange={event => onBankChange(event.target.value)}
                  placeholder="BD.C.1"
                />
              </label>
            </div>
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
              PULGADAS
              <select
                aria-label="Pulgadas"
                value={(manual ? tagInfo?.diameter : diameterText) || ''}
                disabled={manual && !tagInfo}
                onChange={event => {
                  const value = event.target.value;
                  if (manual && source) {
                    const v = parseInt(manualVias, 10) || 1;
                    const b = (manualBank || 'BD.C.1').trim().toUpperCase();
                    patchManualDraft({ tagEnPlano: buildTagEnPlano(v, value, b) });
                    return;
                  }
                  setDiameterText(value);
                }}
              >
                {catalogDiameters(manual ? tagInfo?.diameter : diameterText).map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <label>
              DESDE
              <input value={desde} onChange={event => setDesde(event.target.value)} placeholder="300-MH-015" />
            </label>
            <label>
              HASTA
              <input value={hasta} onChange={event => setHasta(event.target.value)} placeholder="300-MH-016" />
            </label>
            <label>
              Longitud tubería (m)
              <input
                inputMode="decimal"
                value={quantity ?? ''}
                aria-label="Longitud tubería"
                title="Longitud: hasta 2 decimales"
                onChange={event => setQuantity(sanitizeLengthInput(event.target.value))}
                placeholder={manual ? '2.2' : undefined}
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
              {`Adaptador PVC-RGS${diameter ? ` D=${diameter}` : ''} (und)`}
              <input
                inputMode={usesRightAngle ? 'numeric' : 'text'}
                value={usesRightAngle ? adaptadorCount : '- -'}
                disabled={!usesRightAngle}
                aria-label="Adaptador PVC-RGS"
                title={
                  usesRightAngle
                    ? 'Por defecto, igual al número de uniones. Puede editarse, o quedar en 0 si no se usa.'
                    : 'Solo aplica cuando hay curvas de 90°'
                }
                onChange={event => {
                  adaptadorEdited.current = true;
                  setAdaptadorCount(sanitizeIntegerInput(event.target.value));
                }}
              />
            </label>
            {!manual && (
              <label>
                REV
                <input
                  value={rev}
                  aria-label="Revisión"
                  title="Revisión del tramo (ej. 0, A, B)"
                  onChange={event => onRevChange(event.target.value)}
                  placeholder="0"
                  maxLength={6}
                />
              </label>
            )}
          </div>

          <h3>Curvas</h3>
          {!diameter ? (
            <p className="bducto-preview">Escribe el tag en plano para ver sus curvas.</p>
          ) : curves.length === 0 ? (
            <p className="bducto-preview">
              {catalogSize === 0
                ? 'El catálogo de curvas se carga desde Supabase.'
                : `No hay curvas en el catálogo para D=${diameter}.`}
            </p>
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
