import {
  adaptadorDescription,
  adaptadorDiametro,
  CINTA_DESCRIPTION,
  CINTA_DIAMETRO,
  conduitDescription,
  curveDescription,
  curveDiametro,
  curvesForDiameter,
  getCurveCatalog,
  isRightAngleCurve,
  terminalDescription,
  terminalDiametro,
  unionDescription,
  unionDiametro
} from './catalog';
import {
  BductoPrompt,
  BductoRow,
  BductoSource,
  ParsedBducto,
  STICK_LENGTH_M
} from './types';
import { foldHeaderCell } from '../../../shared/lib/readSheetMatrix';

const STICK_CENTS = Math.round(STICK_LENGTH_M * 100);

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function splitSticks(quantityM: number): number[] {
  const cents = toCents(quantityM);
  if (cents <= 0) return [];
  const full = Math.floor(cents / STICK_CENTS);
  const remainder = cents - full * STICK_CENTS;
  const pieces = Array.from({ length: full }, () => STICK_LENGTH_M);
  if (remainder > 0) pieces.push(remainder / 100);
  return pieces;
}

/** One union per via for each full 3.05 m stick. The short remainder adds none. */
export function unionsPerVia(quantityM: number): number {
  const cents = toCents(quantityM);
  if (cents <= 0) return 0;
  return Math.floor(cents / STICK_CENTS);
}

export function parsePlano(plano: string): { wbs: string; stem: string } | null {
  const parts = plano.trim().toUpperCase().split('-').filter(Boolean);
  if (parts.length < 6) return null;
  const wbs = parts[2];
  const discipline = parts[4];
  const seq = parts[5];
  if (!wbs || !discipline || !seq) return null;
  return { wbs, stem: `${wbs}${discipline}${seq}` };
}

function normalizeDiameter(raw: string): string {
  return raw.trim().replace(/[″”]/g, '"').replace(/\s+/g, ' ');
}

/** BD.A.1 keeps section A. E.1 keeps section E. */
function sectionFromBank(bankId: string): string | null {
  const banco = bankId.match(/^BD\.(.+)\.(\d+)$/);
  if (banco?.[1]) return banco[1];
  const plain = bankId.match(/^([A-Z]+)\.(\d+)$/);
  return plain?.[1] ?? null;
}

export function parseTagEnPlano(
  tagEnPlano: string
): { vias: number; diameter: string; bankId: string; section: string } | null {
  const match = tagEnPlano
    .trim()
    .match(/^(\d+)\s+VIAS?\s*,\s*(.+?)\s*,\s*([A-Z0-9]+(?:\.[A-Z0-9]+)*)\s*$/i);
  if (!match) return null;
  const vias = Number(match[1]);
  const diameter = normalizeDiameter(match[2]);
  const bankId = match[3].toUpperCase();
  const section = sectionFromBank(bankId);
  if (!Number.isFinite(vias) || vias <= 0 || !diameter || !section) return null;
  return { vias, diameter, bankId, section };
}

export function parseBductoSource(source: Pick<BductoSource, 'plano' | 'tagEnPlano' | 'quantity'>): ParsedBducto | string {
  if (!Number.isFinite(source.quantity) || source.quantity <= 0) {
    return 'La longitud debe ser mayor que 0.';
  }
  const plano = parsePlano(source.plano);
  if (!plano) {
    return 'El plano debe tener la forma P22-DA-3300-07-LY-028.';
  }
  const tag = parseTagEnPlano(source.tagEnPlano);
  if (!tag) {
    return 'El tag debe tener la forma 1 VIA, 2", BD.A.1 o 2 VIAS, 2", E.1.';
  }
  return {
    ...tag,
    wbs: plano.wbs,
    stem: plano.stem,
    sticks: splitSticks(source.quantity),
    unionsPerVia: unionsPerVia(source.quantity)
  };
}

export interface ExpandSuccess {
  ok: true;
  parsed: ParsedBducto;
  rows: BductoRow[];
}

export interface ExpandFailure {
  ok: false;
  error: string;
}

function countedAccessory(
  partial: Omit<BductoRow, 'longitudM' | 'cantXd' | 'metrado' | 'und'>,
  count: number
): BductoRow {
  return {
    ...partial,
    longitudM: 1,
    cantXd: count,
    metrado: count,
    und: 'und'
  };
}

export function expandBducto(
  source: BductoSource,
  prompt: BductoPrompt,
  newId: () => string
): ExpandSuccess | ExpandFailure {
  const parsed = parseBductoSource(source);
  if (typeof parsed === 'string') return { ok: false, error: parsed };

  const lengthM =
    typeof prompt.quantity === 'number' && Number.isFinite(prompt.quantity)
      ? round2(prompt.quantity)
      : round2(source.quantity);
  if (lengthM <= 0) return { ok: false, error: 'La longitud debe ser mayor que 0.' };
  const sticks = splitSticks(lengthM);

  const desde = prompt.desde.trim().toUpperCase();
  const hasta = prompt.hasta.trim().toUpperCase();
  const plano = source.plano.trim().toUpperCase();
  let piece = 1;

  const shared = {
    sourceId: source.id,
    partidaSicme: '',
    partida: '',
    sector: '',
    wbs: parsed.wbs,
    plano,
    rev: '',
    seccion: parsed.section,
    desde,
    hasta,
    comentario: ''
  };

  const rows: BductoRow[] = [];

  const pushMeasured = (
    kind: BductoRow['kind'],
    descripcion: string,
    diametro: string,
    longitudM: number,
    cantXd: number,
    tagged: boolean
  ) => {
    rows.push({
      id: newId(),
      ...shared,
      tagUnico: tagged ? `${parsed.stem}.${parsed.bankId}.${piece}` : '',
      descripcion,
      diametro,
      longitudM,
      cantXd,
      metrado: round2(longitudM * cantXd),
      und: 'm',
      kind,
      comentario: kind === 'elevation' ? 'VERTICAL' : ''
    });
    if (tagged) piece += 1;
  };

  for (const length of sticks) {
    pushMeasured('conduit', conduitDescription(parsed.diameter), parsed.diameter, length, parsed.vias, true);
  }

  const terminalCount = Math.round(prompt.terminalCount);
  if (terminalCount > 0) {
    rows.push(
      countedAccessory(
        {
          id: newId(),
          ...shared,
          tagUnico: '',
          descripcion: terminalDescription(parsed.diameter),
          diametro: terminalDiametro(parsed.diameter),
          kind: 'terminal'
        },
        terminalCount
      )
    );
  }

  const unionCount = Math.round(prompt.unionCount);
  if (unionCount > 0) {
    rows.push(
      countedAccessory(
        {
          id: newId(),
          ...shared,
          tagUnico: '',
          descripcion: unionDescription(parsed.diameter),
          diametro: unionDiametro(parsed.diameter),
          kind: 'union'
        },
        unionCount
      )
    );
  }

  for (const line of prompt.elevations) {
    const length = round2(line.lengthM);
    const quantity = Math.round(line.quantity);
    if (length <= 0 || quantity <= 0) continue;
    pushMeasured('elevation', conduitDescription(parsed.diameter), parsed.diameter, length, quantity, true);
  }

  const usesRightAngle = prompt.curves.some(choice => {
    if (Math.round(choice.quantity) <= 0) return false;
    const item = getCurveCatalog().find(curve => curve.id === choice.catalogId);
    return Boolean(item && item.diameter === parsed.diameter && isRightAngleCurve(item));
  });
  const adaptadorCount = Math.round(prompt.adaptadorCount);
  if (usesRightAngle && adaptadorCount > 0) {
    rows.push(
      countedAccessory(
        {
          id: newId(),
          ...shared,
          tagUnico: '',
          descripcion: adaptadorDescription(parsed.diameter),
          diametro: adaptadorDiametro(parsed.diameter),
          kind: 'adaptador'
        },
        adaptadorCount
      )
    );
  }

  for (const choice of prompt.curves) {
    const quantity = Math.round(choice.quantity);
    const length = round2(choice.lengthM);
    if (quantity <= 0 || length <= 0) continue;
    const catalogItem = getCurveCatalog().find(item => item.id === choice.catalogId);
    if (!catalogItem || catalogItem.diameter !== parsed.diameter) continue;
    pushMeasured('curve', curveDescription(catalogItem), curveDiametro(catalogItem), length, quantity, true);
  }

  pushMeasured('cinta', CINTA_DESCRIPTION, CINTA_DIAMETRO, lengthM, 1, false);

  // #region agent log
  fetch('http://127.0.0.1:7553/ingest/a68ab0cd-10e6-497e-8979-86720b62c569',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b40dbc'},body:JSON.stringify({sessionId:'b40dbc',location:'expandBducto.ts:return',message:'row comments',data:{kinds:rows.map(row=>row.kind),comments:rows.map(row=>row.comentario),zeroElevations:prompt.elevations.filter(line=>line.lengthM<=0||line.quantity<=0).length},timestamp:Date.now(),hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  return { ok: true, parsed, rows };
}

export function parseSourceBlock(text: string): { rows: Array<Omit<BductoSource, 'id'>>; errors: string[] } {
  const rows: Array<Omit<BductoSource, 'id'>> = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const columns = splitColumns(line);
    if (columns.length < 3) {
      errors.push(`Línea ${index + 1}: se esperan plano, tag y longitud.`);
      return;
    }
    const [plano, tagEnPlano, qtyRaw] = columns;
    if (/^PLANO$/i.test(plano) && /TAG/i.test(tagEnPlano)) return;
    const quantity = Number(qtyRaw.replace(',', '.'));
    const candidate = { plano, tagEnPlano, quantity };
    const parsed = parseBductoSource(candidate);
    if (typeof parsed === 'string') {
      errors.push(`Línea ${index + 1}: ${parsed}`);
      return;
    }
    rows.push({
      plano: plano.trim().toUpperCase(),
      tagEnPlano: tagEnPlano.trim().toUpperCase().replace(/\s+/g, ' '),
      quantity: round2(quantity)
    });
  });

  return { rows, errors };
}

export interface BductoRejectedRow {
  fila: number;
  plano: string;
  tagEnPlano: string;
  quantity: string;
  desde: string;
  hasta: string;
  motivo: string;
}

export interface BductoSheetResult {
  rows: Array<Omit<BductoSource, 'id'>>;
  errors: string[];
  rejectedRows: BductoRejectedRow[];
}
/* Header folding is shared via foldHeaderCell (shared/lib/readSheetMatrix.ts). */


/**
 * Reads a sheet laid out as DESDE | HASTA | PLANO | TAG EN PLANO | Quantity.
 * DESDE and HASTA are optional columns. The header row can sit below a title.
 */
export function parseBductoSheet(matrix: unknown[][]): BductoSheetResult {
  const rows: Array<Omit<BductoSource, 'id'>> = [];
  const errors: string[] = [];
  const rejectedRows: BductoRejectedRow[] = [];
  let headerIdx = -1;
  const cols = { desde: -1, hasta: -1, plano: -1, tag: -1, qty: -1 };

  for (let r = 0; r < Math.min(matrix.length, 20); r++) {
    const line = matrix[r] || [];
    const found = { desde: -1, hasta: -1, plano: -1, tag: -1, qty: -1 };
    line.forEach((cell, index) => {
      const name = foldHeaderCell(cell);
      if (name === 'DESDE') found.desde = index;
      else if (name === 'HASTA') found.hasta = index;
      else if (name === 'PLANO') found.plano = index;
      else if (name === 'TAG_EN_PLANO' || name === 'TAG') found.tag = index;
      else if (name === 'QUANTITY' || name === 'CANTIDAD' || name === 'LONGITUD' || name === 'LONGITUD_M') found.qty = index;
    });
    if (found.plano >= 0 && found.tag >= 0 && found.qty >= 0) {
      headerIdx = r;
      Object.assign(cols, found);
      break;
    }
  }

  if (headerIdx < 0) {
    return { rows, errors: ['No encontré las columnas PLANO, TAG EN PLANO y Quantity.'], rejectedRows };
  }

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const plano = String(line[cols.plano] ?? '').trim();
    const tagEnPlano = String(line[cols.tag] ?? '').trim();
    const qtyRaw = line[cols.qty];
    const desde = cols.desde >= 0 ? String(line[cols.desde] ?? '').trim() : '';
    const hasta = cols.hasta >= 0 ? String(line[cols.hasta] ?? '').trim() : '';
    if (!plano && !tagEnPlano && (qtyRaw === '' || qtyRaw == null) && !desde && !hasta) continue;

    const quantity = typeof qtyRaw === 'number' ? qtyRaw : Number(String(qtyRaw ?? '').replace(',', '.'));
    const candidate = { plano, tagEnPlano, quantity };
    const parsed = parseBductoSource(candidate);
    if (typeof parsed === 'string') {
      errors.push(`Fila ${r + 1}: ${parsed}`);
      rejectedRows.push({
        fila: r + 1,
        plano,
        tagEnPlano,
        quantity: typeof qtyRaw === 'number' ? String(qtyRaw) : String(qtyRaw ?? ''),
        desde,
        hasta,
        motivo: parsed
      });
      continue;
    }
    rows.push({
      plano: plano.toUpperCase(),
      tagEnPlano: tagEnPlano.toUpperCase().replace(/\s+/g, ' '),
      quantity: round2(quantity),
      desde: desde.toUpperCase(),
      hasta: hasta.toUpperCase()
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('El Excel no tiene tramos.');
  }
  return { rows, errors, rejectedRows };
}

/** Rebuilds the prompt from generated rows when the tramo was saved before prompts were stored. */
export function promptFromRows(source: BductoSource, rows: BductoRow[]): BductoPrompt | null {
  const own = rows.filter(row => row.sourceId === source.id);
  if (own.length === 0) return null;
  const parsed = parseBductoSource(source);
  if (typeof parsed === 'string') return null;

  const countOf = (kind: BductoRow['kind']) => own.find(row => row.kind === kind)?.cantXd ?? 0;
  const curves = curvesForDiameter(parsed.diameter).map(item => {
    const description = curveDescription(item);
    const row = own.find(candidate => candidate.kind === 'curve' && candidate.descripcion === description);
    return {
      catalogId: item.id,
      lengthM: row ? row.longitudM : item.lengthM,
      quantity: row ? row.cantXd : 0
    };
  });
  const elevations = own
    .filter(row => row.kind === 'elevation')
    .map(row => ({ lengthM: row.longitudM, quantity: row.cantXd }));
  const first = own[0];

  const cinta = own.find(row => row.kind === 'cinta');
  return {
    desde: source.desde || first.desde || '',
    hasta: source.hasta || first.hasta || '',
    quantity: cinta ? cinta.longitudM : source.quantity,
    terminalCount: countOf('terminal'),
    unionCount: countOf('union'),
    adaptadorCount: countOf('adaptador'),
    curves,
    elevations: elevations.length > 0 ? elevations : [{ lengthM: 0, quantity: 0 }]
  };
}

function splitColumns(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map(part => part.trim()).filter(Boolean);
  }
  if (line.includes(';')) {
    return line.split(';').map(part => part.trim()).filter(Boolean);
  }
  const parts = line.split(/\s+/);
  if (parts.length < 3) return parts;
  return [parts[0], parts.slice(1, -1).join(' '), parts[parts.length - 1]];
}
