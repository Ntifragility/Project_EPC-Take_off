import {
  adaptadorDescription,
  adaptadorDiametro,
  CINTA_DESCRIPTION,
  CINTA_DIAMETRO,
  conduitDescription,
  curveDescription,
  curveDiametro,
  CURVE_CATALOG,
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

export function parseTagEnPlano(
  tagEnPlano: string
): { vias: number; diameter: string; bankId: string; section: string } | null {
  const match = tagEnPlano
    .trim()
    .match(/^(\d+)\s+VIAS\s*,\s*(.+?)\s*,\s*(BD\.(.+)\.(\d+))\s*$/i);
  if (!match) return null;
  const vias = Number(match[1]);
  const diameter = normalizeDiameter(match[2]);
  const bankId = match[3].toUpperCase();
  const section = match[4].toUpperCase();
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
    return 'El tag debe tener la forma 12 VIAS, 6", BD.K.1.';
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
    hasta
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
      kind
    });
    if (tagged) piece += 1;
  };

  for (const length of parsed.sticks) {
    pushMeasured('conduit', conduitDescription(parsed.diameter), parsed.diameter, length, parsed.vias, true);
  }

  for (const line of prompt.elevations) {
    const length = round2(line.lengthM);
    const quantity = Math.round(line.quantity);
    if (length <= 0 || quantity <= 0) continue;
    pushMeasured('elevation', conduitDescription(parsed.diameter), parsed.diameter, length, quantity, true);
  }

  for (const choice of prompt.curves) {
    const quantity = Math.round(choice.quantity);
    const length = round2(choice.lengthM);
    if (quantity <= 0 || length <= 0) continue;
    const catalogItem = CURVE_CATALOG.find(item => item.id === choice.catalogId);
    if (!catalogItem || catalogItem.diameter !== parsed.diameter) continue;
    pushMeasured('curve', curveDescription(catalogItem), curveDiametro(catalogItem), length, quantity, true);
  }

  pushMeasured('cinta', CINTA_DESCRIPTION, CINTA_DIAMETRO, round2(source.quantity), 1, false);

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

  if (parsed.unionsPerVia > 0) {
    rows.push({
      id: newId(),
      ...shared,
      tagUnico: '',
      descripcion: unionDescription(parsed.diameter),
      diametro: unionDiametro(parsed.diameter),
      longitudM: parsed.unionsPerVia,
      cantXd: parsed.vias,
      metrado: parsed.unionsPerVia * parsed.vias,
      und: 'und',
      kind: 'union'
    });
  }

  const adaptadorCount = Math.round(prompt.adaptadorCount);
  if (adaptadorCount > 0) {
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
