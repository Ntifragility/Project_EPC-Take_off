export type MaterialType = 'P' | 'C';
export type SectionType = 'pat' | 'canalizado';
export type TabType = 'takeoff' | 'rules' | 'packages';
export type AddModeType = 'rule' | 'custom';
export type AccessoryViewMode = 'separated' | 'join';

export interface TakeoffItem {
  id: string;             // Client-side unique ID
  partida?: string;       // Matched Partida ITEM code e.g. 01.01.02 or NA
  pkgId: string;          // Package (Partida) ID
  material: MaterialType; // 'P' (Primary) or 'C' (Consumable)
  plano: string;          // e.g. P22-DA-2151-07-GL-001
  rev: string;            // e.g. 0, A, B
  tagUnico: string;       // Formatted unique tag: e.g. 2151GL001.M04 or with .01 suffix
  tagPlano: string;       // e.g. M04, PS01
  detalle: string;        // e.g. 151, 020, 166C
  desc: string;           // Material / Item description
  qty: number | string;   // Quantity
  metradoOt: string;      // Measurement or dynamic formula output
  unit: string;           // 'm', 'und', 'kg', 'm3'
  notes?: string;
  ruleId?: string;
}

export interface RuleSubitem {
  id: string;
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: '1c/3m' | 'empty' | string;
}

export interface TakeoffRule {
  id: string;
  trigger: string;
  subitems: RuleSubitem[];
  detalle?: string;
  tagPrefix?: string;
}

export interface PackageGroup {
  id: string;
  name: string;
}

export interface DetalleVariantItem {
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: '1c/3m' | 'empty' | string;
  material?: MaterialType;
}

export interface PartidaRecord {
  id?: string;
  actividad: string;      // PAT, INST, BD, etc.
  area: string;           // 300, 3300, 3400, 3500, etc.
  item: string;           // Number of partida e.g. 01.01.02
  forecastDesc: string;   // Description used in takeoff / user table
  descripcion: string;    // Official description in Forecast Approved Table
  und: string;            // Unit e.g. UND, m, etc.
  createdAt?: string;
}

export interface SupabasePartidaRecord {
  id?: string;
  actividad: string;
  area: string;
  item: string;
  forecast_desc: string;
  descripcion: string;
  und: string;
  created_at?: string;
}

export interface SupabaseTakeoffRecord {
  id?: string;
  partida?: string;
  material: string;
  plano: string;
  rev: string;
  tag_unico: string;
  tag_plano: string;
  detalle: string;
  description: string;
  qty: number | null;
  metrado_ot: string;
  unit: string;
  notes: string;
  pkg_name: string;
  edificio?: string;
  vista?: string;
  created_at?: string;
}

