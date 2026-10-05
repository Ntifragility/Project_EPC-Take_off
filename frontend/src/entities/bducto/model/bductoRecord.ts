import { curveDescription, curveDiametro, CurveCatalogItem } from './catalog';
import { BductoRow } from './types';

/** One generated metrado line, stored in main_BDUCTOS_table. */
export interface BductoDbRecord {
  source_id: string;
  partida_sicme: string;
  partida: string;
  sector: string;
  wbs: string;
  tag_unico: string;
  plano: string;
  rev: string;
  seccion: string;
  desde: string;
  hasta: string;
  descripcion: string;
  diametro: string;
  longitud_m: number;
  cant_xd: number;
  metrado: number;
  und: string;
  kind: string;
  comentario: string;
}

/** One curve definition, stored in bducto_curve_catalog. */
export interface CurveCatalogDbRecord {
  id: string;
  angle: string;
  radius: string;
  diameter: string;
  length_m: number;
  descripcion: string;
  diametro: string;
  order_index: number;
}

export function mapBductoRowToRecord(row: BductoRow): BductoDbRecord {
  return {
    source_id: row.sourceId,
    partida_sicme: row.partidaSicme,
    partida: row.partida,
    sector: row.sector,
    wbs: row.wbs,
    tag_unico: row.tagUnico,
    plano: row.plano,
    rev: row.rev,
    seccion: row.seccion,
    desde: row.desde,
    hasta: row.hasta,
    descripcion: row.descripcion,
    diametro: row.diametro,
    longitud_m: row.longitudM,
    cant_xd: row.cantXd,
    metrado: row.metrado,
    und: row.und,
    kind: row.kind,
    comentario: row.comentario || (row.kind === 'elevation' ? 'VERTICAL' : '')
  };
}

export function mapCurveToRecord(item: CurveCatalogItem, orderIndex: number): CurveCatalogDbRecord {
  return {
    id: item.id,
    angle: item.angle,
    radius: item.radius,
    diameter: item.diameter,
    length_m: item.lengthM,
    descripcion: curveDescription(item),
    diametro: curveDiametro(item),
    order_index: orderIndex
  };
}

export function curveFromRecord(record: CurveCatalogDbRecord): CurveCatalogItem {
  return {
    id: record.id,
    angle: record.angle,
    radius: record.radius,
    diameter: record.diameter,
    lengthM: Number(record.length_m),
    descripcion: record.descripcion,
    diametro: record.diametro
  };
}
