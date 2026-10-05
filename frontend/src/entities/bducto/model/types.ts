export const STICK_LENGTH_M = 3.05;

export type BductoUnit = 'm' | 'und';

export type BductoKind =
  | 'conduit'
  | 'elevation'
  | 'curve'
  | 'cinta'
  | 'terminal'
  | 'union'
  | 'adaptador';

export interface BductoSource {
  id: string;
  plano: string;
  tagEnPlano: string;
  quantity: number;
  /** Filled when the tramo comes from the Excel list. */
  desde?: string;
  hasta?: string;
  /** Last answers used to generate this tramo. Restored by Atrás and Editar. */
  prompt?: BductoPrompt;
}

export interface CurveChoice {
  catalogId: string;
  lengthM: number;
  quantity: number;
}

export interface ElevationLine {
  lengthM: number;
  quantity: number;
}

export interface BductoPrompt {
  desde: string;
  hasta: string;
  terminalCount: number;
  /** Pieces of UNION PVC SCH 40. Defaults to the vía count. */
  unionCount: number;
  adaptadorCount: number;
  /** Tramo length in meters. Defaults to the uploaded Quantity. */
  quantity?: number;
  curves: CurveChoice[];
  elevations: ElevationLine[];
}

export interface BductoRow {
  id: string;
  sourceId: string;
  partidaSicme: string;
  partida: string;
  sector: string;
  wbs: string;
  tagUnico: string;
  plano: string;
  rev: string;
  seccion: string;
  desde: string;
  hasta: string;
  descripcion: string;
  diametro: string;
  longitudM: number;
  cantXd: number;
  metrado: number;
  und: BductoUnit;
  kind: BductoKind;
  /** VERTICAL on elevation rows. Empty on the rest. */
  comentario: string;
}

export interface ParsedBducto {
  vias: number;
  diameter: string;
  bankId: string;
  section: string;
  wbs: string;
  stem: string;
  sticks: number[];
  unionsPerVia: number;
}
