import { BductoSource } from './types';

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

const STRIP_UL_REGEX = /\s*-\s*CERTIFICACI[OÓ]N\s+UL/gi;

export function conduitDescription(diameter: string): string {
  const found = activeMaterialCatalog.find(m => m.category === 'tubo' && m.diameter === diameter);
  return (found?.descripcion || `CONDUIT PVC SCH 40 D=${diameter}`).replace(STRIP_UL_REGEX, '');
}

export function terminalDescription(diameter: string): string {
  const found = activeMaterialCatalog.find(m => m.category === 'campana' && m.diameter === diameter);
  return (found?.descripcion || `TERMINAL CAMPANA (END BELL) D=${diameter}`).replace(STRIP_UL_REGEX, '');
}

export function unionDescription(diameter: string): string {
  const found = activeMaterialCatalog.find(m => m.category === 'union' && m.diameter === diameter);
  return (found?.descripcion || `UNION PVC SCH 40 D=${diameter}`).replace(STRIP_UL_REGEX, '');
}

export function adaptadorDescription(diameter: string): string {
  const found = activeMaterialCatalog.find(m => m.category === 'adaptador' && m.diameter === diameter);
  return (found?.descripcion || `ADAPTADOR PVC - RGS D=${diameter}`).replace(STRIP_UL_REGEX, '');
}

export function cintaDescription(): string {
  const found = activeMaterialCatalog.find(m => m.category === 'cinta');
  return found?.descripcion || CINTA_DESCRIPTION;
}

let activeCatalog: CurveCatalogItem[] = [];
const catalogListeners = new Set<() => void>();

/** Curves loaded from bducto_curve_catalog. Empty until that table is fetched. */
export function getCurveCatalog(): CurveCatalogItem[] {
  return activeCatalog;
}

/** Replaces the in-memory copy with the rows stored in Supabase. */
export function setCurveCatalog(items: CurveCatalogItem[]): void {
  activeCatalog = items.map(item => ({
    ...item,
    descripcion: item.descripcion ? item.descripcion.replace(STRIP_UL_REGEX, '') : item.descripcion
  }));
  catalogListeners.forEach(listener => listener());
}

export function subscribeCurveCatalog(listener: () => void): () => void {
  catalogListeners.add(listener);
  return () => {
    catalogListeners.delete(listener);
  };
}

export function curveDescription(item: CurveCatalogItem): string {
  const desc = item.descripcion || `CURVA ${item.angle} RADIO ${item.radius} PVC SCH 40 D=${item.diameter}`;
  return desc.replace(STRIP_UL_REGEX, '');
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


export interface JointLossCatalogItem {
  id: string;
  diameter: string;
  lossM: number;
  descripcion?: string;
  orderIndex: number;
}

export const DEFAULT_JOINT_LOSSES: JointLossCatalogItem[] = [
  { id: 'loss-6', diameter: '6"', lossM: 0.13, descripcion: 'Pérdida por embone D=6"', orderIndex: 1 },
  { id: 'loss-4', diameter: '4"', lossM: 0.09, descripcion: 'Pérdida por embone D=4"', orderIndex: 2 },
  { id: 'loss-3', diameter: '3"', lossM: 0.07, descripcion: 'Pérdida por embone D=3"', orderIndex: 3 },
  { id: 'loss-2', diameter: '2"', lossM: 0.05, descripcion: 'Pérdida por embone D=2"', orderIndex: 4 },
];

let activeJointLossCatalog: JointLossCatalogItem[] = [...DEFAULT_JOINT_LOSSES];
const jointLossListeners = new Set<() => void>();

export function getJointLossCatalog(): JointLossCatalogItem[] {
  return activeJointLossCatalog;
}

export function setJointLossCatalog(items: JointLossCatalogItem[]): void {
  activeJointLossCatalog = items && items.length > 0 ? items : [...DEFAULT_JOINT_LOSSES];
  jointLossListeners.forEach(listener => listener());
}

export function subscribeJointLossCatalog(listener: () => void): () => void {
  jointLossListeners.add(listener);
  return () => {
    jointLossListeners.delete(listener);
  };
}


export type MaterialCategory = 'tubo' | 'union' | 'adaptador' | 'campana' | 'cinta';

export interface MaterialCatalogItem {
  id: string;
  category: MaterialCategory;
  diameter?: string | null;
  descripcion: string;
  codigoSicme?: string;
  unidad?: string;
  sortOrder?: number;
}

export const DEFAULT_MATERIALS: MaterialCatalogItem[] = [
  // Tubos
  { id: 'mat-tubo-6', category: 'tubo', diameter: '6"', descripcion: 'CONDUIT PVC SCH 40 D=6"', unidad: 'm', sortOrder: 10 },
  { id: 'mat-tubo-4', category: 'tubo', diameter: '4"', descripcion: 'CONDUIT PVC SCH 40 D=4"', unidad: 'm', sortOrder: 20 },
  { id: 'mat-tubo-3', category: 'tubo', diameter: '3"', descripcion: 'CONDUIT PVC SCH 40 D=3"', unidad: 'm', sortOrder: 30 },
  { id: 'mat-tubo-2', category: 'tubo', diameter: '2"', descripcion: 'CONDUIT PVC SCH 40 D=2"', unidad: 'm', sortOrder: 40 },
  { id: 'mat-tubo-1.5', category: 'tubo', diameter: '1 1/2"', descripcion: 'CONDUIT PVC SCH 40 D=1 1/2"', unidad: 'm', sortOrder: 50 },
  { id: 'mat-tubo-1', category: 'tubo', diameter: '1"', descripcion: 'CONDUIT PVC SCH 40 D=1"', unidad: 'm', sortOrder: 60 },

  // Uniones
  { id: 'mat-union-6', category: 'union', diameter: '6"', descripcion: 'UNION PVC SCH 40 D=6"', unidad: 'und', sortOrder: 110 },
  { id: 'mat-union-4', category: 'union', diameter: '4"', descripcion: 'UNION PVC SCH 40 D=4"', unidad: 'und', sortOrder: 120 },
  { id: 'mat-union-3', category: 'union', diameter: '3"', descripcion: 'UNION PVC SCH 40 D=3"', unidad: 'und', sortOrder: 130 },
  { id: 'mat-union-2', category: 'union', diameter: '2"', descripcion: 'UNION PVC SCH 40 D=2"', unidad: 'und', sortOrder: 140 },
  { id: 'mat-union-1.5', category: 'union', diameter: '1 1/2"', descripcion: 'UNION PVC SCH 40 D=1 1/2"', unidad: 'und', sortOrder: 150 },
  { id: 'mat-union-1', category: 'union', diameter: '1"', descripcion: 'UNION PVC SCH 40 D=1"', unidad: 'und', sortOrder: 160 },

  // Adaptadores
  { id: 'mat-adapt-6', category: 'adaptador', diameter: '6"', descripcion: 'ADAPTADOR PVC - RGS D=6"', unidad: 'und', sortOrder: 210 },
  { id: 'mat-adapt-4', category: 'adaptador', diameter: '4"', descripcion: 'ADAPTADOR PVC - RGS D=4"', unidad: 'und', sortOrder: 220 },
  { id: 'mat-adapt-3', category: 'adaptador', diameter: '3"', descripcion: 'ADAPTADOR PVC - RGS D=3"', unidad: 'und', sortOrder: 230 },
  { id: 'mat-adapt-2', category: 'adaptador', diameter: '2"', descripcion: 'ADAPTADOR PVC - RGS D=2"', unidad: 'und', sortOrder: 240 },
  { id: 'mat-adapt-1.5', category: 'adaptador', diameter: '1 1/2"', descripcion: 'ADAPTADOR PVC - RGS D=1 1/2"', unidad: 'und', sortOrder: 250 },
  { id: 'mat-adapt-1', category: 'adaptador', diameter: '1"', descripcion: 'ADAPTADOR PVC - RGS D=1"', unidad: 'und', sortOrder: 260 },

  // Campanas
  { id: 'mat-camp-6', category: 'campana', diameter: '6"', descripcion: 'TERMINAL CAMPANA (END BELL) D=6"', unidad: 'und', sortOrder: 310 },
  { id: 'mat-camp-4', category: 'campana', diameter: '4"', descripcion: 'TERMINAL CAMPANA (END BELL) D=4"', unidad: 'und', sortOrder: 320 },
  { id: 'mat-camp-3', category: 'campana', diameter: '3"', descripcion: 'TERMINAL CAMPANA (END BELL) D=3"', unidad: 'und', sortOrder: 330 },
  { id: 'mat-camp-2', category: 'campana', diameter: '2"', descripcion: 'TERMINAL CAMPANA (END BELL) D=2"', unidad: 'und', sortOrder: 340 },
  { id: 'mat-camp-1.5', category: 'campana', diameter: '1 1/2"', descripcion: 'TERMINAL CAMPANA (END BELL) D=1 1/2"', unidad: 'und', sortOrder: 350 },
  { id: 'mat-camp-1', category: 'campana', diameter: '1"', descripcion: 'TERMINAL CAMPANA (END BELL) D=1"', unidad: 'und', sortOrder: 360 },

  // Cinta
  { id: 'mat-cinta', category: 'cinta', diameter: null, descripcion: 'CINTA DE RIESGO ELECTRICO COLOR ROJO', unidad: 'm', sortOrder: 400 }
];

let activeMaterialCatalog: MaterialCatalogItem[] = [...DEFAULT_MATERIALS];
const materialListeners = new Set<() => void>();

export function getMaterialCatalog(): MaterialCatalogItem[] {
  return activeMaterialCatalog;
}

export function setMaterialCatalog(items: MaterialCatalogItem[]): void {
  const base = items && items.length > 0 ? items : [...DEFAULT_MATERIALS];
  activeMaterialCatalog = base.map(item => ({
    ...item,
    descripcion: item.descripcion ? item.descripcion.replace(STRIP_UL_REGEX, '') : item.descripcion
  }));
  materialListeners.forEach(listener => listener());
}

export function subscribeMaterialCatalog(listener: () => void): () => void {
  materialListeners.add(listener);
  return () => {
    materialListeners.delete(listener);
  };
}
