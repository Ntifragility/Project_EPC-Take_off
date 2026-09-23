export interface RuleSubitem {
  id: string;
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: string | boolean;
}

export interface TakeoffRule {
  id: string;
  trigger: string;
  subitems: RuleSubitem[];
  detalle?: string;
  tagPrefix?: string;
}

export interface DetalleVariantItem {
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: string | boolean;
  material?: 'P' | 'C';
}
