export type MaterialType = 'P' | 'C';
export type SectionType = 'pat' | 'canalizado';
export type TabType = 'takeoff' | 'rules' | 'packages';
export type AddModeType = 'rule' | 'custom';

export interface TakeoffItem {
  id: string;             // Client-side unique ID
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
}

export interface PackageGroup {
  id: string;
  name: string;
}

export interface DetalleVariantItem {
  desc: string;
  qty: number;
  unit: string;
  ot?: number | string;
  otDynamic?: '1c/3m' | 'empty' | string;
}

export interface SupabaseTakeoffRecord {
  id?: string;
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

