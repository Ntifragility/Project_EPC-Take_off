export type MaterialType = 'P' | 'C';
export type AccessoryViewMode = 'separated' | 'join';

export interface PackageGroup {
  id: string;
  name: string;
}

export interface TakeoffItem {
  id: string;
  partida?: string;
  pkgId: string;
  material: MaterialType;
  plano: string;
  rev: string;
  tagUnico: string;
  tagPlano: string;
  detalle: string;
  desc: string;
  qty: number | string;
  metradoOt: string;
  unit: string;
  notes?: string;
  ruleId?: string;
}
