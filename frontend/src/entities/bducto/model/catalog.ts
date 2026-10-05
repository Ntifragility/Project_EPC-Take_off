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

/** Piece length (m) of one curve, from the LONGITUD table. 3" repeats the 2" rows. */
export const CURVE_CATALOG: CurveCatalogItem[] = [
  { id: 'c30-r15-d2', angle: '30°', radius: '15"', diameter: '2"', lengthM: 0.25 },
  { id: 'c30-r15-d3', angle: '30°', radius: '15"', diameter: '3"', lengthM: 0.25 },
  { id: 'c30-r30-d6', angle: '30°', radius: '30"', diameter: '6"', lengthM: 0.44 },
  { id: 'c45-r15-d112', angle: '45°', radius: '15"', diameter: '1 1/2"', lengthM: 0.35 },
  { id: 'c45-r15-d2', angle: '45°', radius: '15"', diameter: '2"', lengthM: 0.35 },
  { id: 'c45-r15-d3', angle: '45°', radius: '15"', diameter: '3"', lengthM: 0.35 },
  { id: 'c45-r30-d4', angle: '45°', radius: '30"', diameter: '4"', lengthM: 0.46 },
  { id: 'c45-r30-d6', angle: '45°', radius: '30"', diameter: '6"', lengthM: 0.59 },
  { id: 'c90-r15-d112', angle: '90°', radius: '15"', diameter: '1 1/2"', lengthM: 0.65 },
  { id: 'c90-r15-d1', angle: '90°', radius: '15"', diameter: '1"', lengthM: 0.64 },
  { id: 'c90-r15-d2', angle: '90°', radius: '15"', diameter: '2"', lengthM: 0.65 },
  { id: 'c90-r15-d3', angle: '90°', radius: '15"', diameter: '3"', lengthM: 0.65 },
  { id: 'c90-r30-d4', angle: '90°', radius: '30"', diameter: '4"', lengthM: 0.84 },
  { id: 'c90-r30-d6', angle: '90°', radius: '30"', diameter: '6"', lengthM: 1.12 },
  { id: 'c90-r36-d6', angle: '90°', radius: '36"', diameter: '6"', lengthM: 1.05 },
  { id: 'c90-r95-d2', angle: '90°', radius: '9.5"', diameter: '2"', lengthM: 0.43 },
  { id: 'c90-r95-d3', angle: '90°', radius: '9.5"', diameter: '3"', lengthM: 0.43 }
];

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

let activeCatalog: CurveCatalogItem[] = CURVE_CATALOG;

/** Catalog used by the prompt. Starts as the code table and can be replaced from the database. */
export function getCurveCatalog(): CurveCatalogItem[] {
  return activeCatalog;
}

/** Database rows win for the same id. Curves that exist only in code stay available. */
export function mergeCurveCatalog(remote: CurveCatalogItem[]): CurveCatalogItem[] {
  const byId = new Map(remote.map(item => [item.id, item]));
  const merged = CURVE_CATALOG.map(item => byId.get(item.id) ?? item);
  const known = new Set(CURVE_CATALOG.map(item => item.id));
  for (const item of remote) {
    if (!known.has(item.id)) merged.push(item);
  }
  activeCatalog = merged;
  return merged;
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

export function curvesForDiameter(diameter: string): CurveCatalogItem[] {
  return activeCatalog.filter(item => item.diameter === diameter);
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
