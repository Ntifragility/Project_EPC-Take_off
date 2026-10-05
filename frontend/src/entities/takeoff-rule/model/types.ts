import { AreaType } from '../../../shared/types/common';

export interface RuleSubitem {
  id: string;
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: string | boolean;
}

export interface CableTrayMatrixItem {
  id?: string;
  desc: string;
  unit: string;
  material?: 'P' | 'C';
  w900: string | number;
  w600: string | number;
  w450: string | number;
  w300: string | number;
}

export interface TakeoffRule {
  id: string;
  trigger: string;
  subitems: RuleSubitem[];
  detalle?: string;
  tagPrefix?: string;
  cableTrayMatrix?: CableTrayMatrixItem[];
  /** Catalog membership. Missing/empty is inferred (see areaCatalog). */
  areas?: AreaType[];
}

export interface DetalleVariantItem {
  desc: string;
  qty: number | string;
  unit: string;
  ot?: number | string;
  otDynamic?: string | boolean;
  material?: 'P' | 'C';
}
