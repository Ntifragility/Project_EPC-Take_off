import { BductoSource } from './types';

const UL = ' - CERTIFICACIÓN UL';

export interface CurveCatalogItem {
  id: string;
  angle: string;
  radius: string;
  diameter: string;
  lengthM: number;
  /** Stored description. The built label is used when this is empty. */
  descripcion?: string;
  diametro?: string;
}

export const CINTA_DESCRIPTION = 'CINTA DE RIESGO ELECTRICO COLOR ROJO';
export const CINTA_DIAMETRO = 'CINTA ROJA';

export function conduitDescription(diameter: string): string {
  return `CONDUIT PVC SCH 40 D=${diameter}${UL}`;
}

export function terminalDescription(diameter: string): string {
  return `TERMINAL CAMPANA (END BELL) D=${diameter}${UL}`;
}

export function unionDescription(diameter: string): string {
  return `UNION PVC SCH 40 D=${diameter}${UL}`;
}

export function adaptadorDescription(diameter: string): string {
  return `ADAPTADOR PVC - RGS D=${diameter}${UL}`;
}

let activeCatalog: CurveCatalogItem[] = [];
const catalogListeners = new Set<() => void>();

/** Curves loaded from bducto_curve_catalog. Empty until that table is fetched. */
export function getCurveCatalog(): CurveCatalogItem[] {
  return activeCatalog;
}

/** Replaces the in-memory copy with the rows stored in Supabase. */
export function setCurveCatalog(items: CurveCatalogItem[]): void {
  activeCatalog = items;
  catalogListeners.forEach(listener => listener());
}

export function subscribeCurveCatalog(listener: () => void): () => void {
  catalogListeners.add(listener);
  return () => {
    catalogListeners.delete(listener);
  };
}

export function curveDescription(item: CurveCatalogItem): string {
  return item.descripcion || `CURVA ${item.angle} RADIO ${item.radius} PVC SCH 40 D=${item.diameter}${UL}`;
}

export function curveDiametro(item: CurveCatalogItem): string {
  return item.diametro || `CURVA ${item.diameter} ${item.angle} RADIO ${item.radius}`;
}

export function terminalDiametro(diameter: string): string {
  return `CAMPANA ${diameter}`;
}

export function unionDiametro(diameter: string): string {
  return `UNION ${diameter}`;
}

export function adaptadorDiametro(diameter: string): string {
  return `ADAPTADOR ${diameter}`;
}

export function isRightAngleCurve(item: { angle: string }): boolean {
  return item.angle.replace(/\s/g, '').startsWith('90');
}

const MENU_SHAPES = ['30°|30"', '45°|30"', '90°|30"', '90°|36"'];

export function curvesForDiameter(diameter: string): CurveCatalogItem[] {
  return activeCatalog
    .filter(item => item.diameter === diameter)
    .sort((left, right) => {
      const leftRank = MENU_SHAPES.indexOf(`${left.angle}|${left.radius}`);
      const rightRank = MENU_SHAPES.indexOf(`${right.angle}|${right.radius}`);
      return (leftRank === -1 ? MENU_SHAPES.length : leftRank) - (rightRank === -1 ? MENU_SHAPES.length : rightRank);
    });
}

function measure(value: string): number {
  const cleaned = value.replace(/["°]/g, '').trim();
  const mixed = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const whole = Number(cleaned);
  return Number.isFinite(whole) ? whole : 99;
}

function diameterRank(value: string): number {
  return measure(value);
}

/** Catalog order: inches, then angle, then radius. */
export function compareCurves(
  left: Pick<CurveCatalogItem, 'diameter' | 'angle' | 'radius'>,
  right: Pick<CurveCatalogItem, 'diameter' | 'angle' | 'radius'>
): number {
  return measure(left.diameter) - measure(right.diameter)
    || measure(left.angle) - measure(right.angle)
    || measure(left.radius) - measure(right.radius);
}

/** Sizes that have curves, smallest first. The open tramo's size is included even if it has none. */
export function catalogDiameters(current?: string): string[] {
  const sizes = [...new Set(activeCatalog.map(item => item.diameter))];
  if (current && !sizes.includes(current)) sizes.push(current);
  return sizes.sort((left, right) => diameterRank(left) - diameterRank(right));
}

export const SAMPLE_LY028: Array<Omit<BductoSource, 'id'>> = [
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '12 VIAS, 6", BD.K.1', quantity: 19.3 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '15 VIAS, 6", BD.I.1', quantity: 56.3 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '20 VIAS, 6", BD.F.1', quantity: 2.2 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '20 VIAS, 6", BD.F.2', quantity: 2.5 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '3 VIAS, 6", BD.J.1', quantity: 11.9 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '4 VIAS, 6", BD.G.1', quantity: 3.6 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '4 VIAS, 6", BD.G.2', quantity: 6.5 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '6 VIAS, 6", BD.H.1', quantity: 8.4 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '6 VIAS, 6", BD.L.1', quantity: 4.2 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '8 VIAS, 6", BD.M.1', quantity: 42.5 },
  { plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '8 VIAS, 6", BD.M.2', quantity: 13.3 }
];
