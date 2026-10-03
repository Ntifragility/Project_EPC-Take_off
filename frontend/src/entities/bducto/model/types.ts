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
  adaptadorCount: number;
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
