import { DetalleVariantItem } from './types';
import { SubAreaHumeda } from '../../../shared/types/common';
export type { DetalleVariantItem };
export { CABLE_TRAY_WIDTHS, DETALLE_001_2B_X1_ITEMS, getCableTrayStrutLength } from './cableTrayRules';

/** Canonical sub-area for a variant write: SECA pins NO_CORROSIVO; HUMEDA keeps caller's (default NO_CORROSIVO). */
export function normalizeVariantSubArea(area: string, subArea?: SubAreaHumeda): SubAreaHumeda {
  const up = (area || '').toUpperCase();
  const isHumeda = up.includes('HUMED') || up.includes('HUEMD');
  return isHumeda ? subArea || 'NO_CORROSIVO' : 'NO_CORROSIVO';
}

// ---------------------------------------------------------------------------
// Supabase-first variant registry.
//
// SSOT: the `detalle_variants` table in Supabase, partitioned by
// (area, sub_area, category, detalle_code). These in-memory maps are ONLY a
// runtime cache hydrated from Supabase (see updateDynamicVariants /
// updateSingleDynamicVariant). There is intentionally NO hardcoded seed data
// here anymore: on an empty database the catalog renders empty, and
// localStorage acts purely as an offline cache of what Supabase returned.
// ---------------------------------------------------------------------------

export const DETALLE_VARIANTS_BY_AREA: Record<string, Record<string, DetalleVariantItem[]>> = {
  'AREA SECA': {},
  'AREA HUEMDA': {}
};
export const DETALLE_VARIANTS_BY_SUBAREA: Record<SubAreaHumeda, Record<string, DetalleVariantItem[]>> = {
  'NO_CORROSIVO': JSON.parse(JSON.stringify(DETALLE_VARIANTS_BY_AREA['AREA HUEMDA'])),
  'CORROSIVO': JSON.parse(JSON.stringify(DETALLE_VARIANTS_BY_AREA['AREA HUEMDA']))
};

export const DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA: Record<SubAreaHumeda, Record<string, DetalleVariantItem[]>> = {
  'NO_CORROSIVO': JSON.parse(JSON.stringify(DETALLE_VARIANTS_BY_SUBAREA['NO_CORROSIVO'])),
  'CORROSIVO': JSON.parse(JSON.stringify(DETALLE_VARIANTS_BY_SUBAREA['CORROSIVO']))
};

export const AUTO_TUBERIA_AREAS = ['AREA SECA'];

export function detalleEntriesByArea(): { area: string; entries: [string, DetalleVariantItem[]][] }[] {
  return Object.entries(DYNAMIC_DETALLE_VARIANTS_BY_AREA).map(([area, variants]) => ({
    area,
    entries: Object.entries(variants).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
  }));
}

export function getDetallesForArea(area: string, subArea: SubAreaHumeda = 'NO_CORROSIVO'): [string, DetalleVariantItem[]][] {
  const isHumeda = area.toUpperCase().includes('HUMED') || area.toUpperCase().includes('HUEMD');
  const variants = isHumeda
    ? (DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea] || DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA HUEMDA'] || {})
    : (DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA SECA'] || {});
  return Object.entries(variants).sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })
  );
}

export function getDetalleArea(detalleCode: string): string {
  return Object.entries(DYNAMIC_DETALLE_VARIANTS_BY_AREA).find(([, variants]) => variants[detalleCode])?.[0] || '';
}

export function shouldAutoManageTuberia(detalleCode: string): boolean {
  return AUTO_TUBERIA_AREAS.includes(getDetalleArea(detalleCode));
}

export function hasSoporteItems(detalleCode: string, area = 'AREA HUMEDA', subArea: SubAreaHumeda = 'NO_CORROSIVO'): boolean {
  const isHumeda = area.toUpperCase().includes('HUMED') || area.toUpperCase().includes('HUEMD');
  const variants = isHumeda
    ? (DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea]?.[detalleCode] || DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA HUEMDA']?.[detalleCode] || [])
    : (DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA SECA']?.[detalleCode] || []);
  return variants.some(v => v.unit.toLowerCase().includes('soporte'));
}

export function hasJumperItems(detalleCode: string, area = 'AREA HUMEDA', subArea: SubAreaHumeda = 'NO_CORROSIVO'): boolean {
  if (!detalleCode) return false;
  if (detalleCode.toUpperCase().includes('JUMPER')) return true;
  const isHumeda = area.toUpperCase().includes('HUMED') || area.toUpperCase().includes('HUEMD');
  const variants = isHumeda
    ? (DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea]?.[detalleCode] || DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA HUEMDA']?.[detalleCode] || DYNAMIC_DETALLE_VARIANTS[detalleCode] || [])
    : (DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA SECA']?.[detalleCode] || DYNAMIC_DETALLE_VARIANTS[detalleCode] || []);
  return variants.some(
    v => v.unit.toLowerCase().includes('jumper') || v.desc.toLowerCase().includes('jumper')
  );
}

export function getCalculatedVariantItems(
  detalleCode: string,
  area = 'AREA HUMEDA',
  numSoportes = 0,
  numJumpers = 0,
  subArea: SubAreaHumeda = 'NO_CORROSIVO'
): DetalleVariantItem[] {
  const isHumeda = area.toUpperCase().includes('HUMED') || area.toUpperCase().includes('HUEMD');
  const variants = isHumeda
    ? (DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea]?.[detalleCode] || DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA HUEMDA']?.[detalleCode] || [])
    : (DYNAMIC_DETALLE_VARIANTS_BY_AREA['AREA SECA']?.[detalleCode] || []);

  return variants
    .filter(v => {
      const isJumper = v.unit.toLowerCase().includes('jumper') || v.desc.toLowerCase().includes('jumper');
      const isSoporte = v.unit.toLowerCase().includes('soporte') || v.desc.toLowerCase().includes('soporte');

      if (isJumper && (!numJumpers || numJumpers <= 0)) {
        return false;
      }
      if (isSoporte && (!numSoportes || numSoportes <= 0)) {
        return false;
      }
      return true;
    })
    .map(v => {
      const unitLower = v.unit.toLowerCase();
      const descLower = v.desc.toLowerCase();
      let calculatedQty = v.qty;
      let calculatedOt = v.ot;

      if ((unitLower.includes('soporte') || descLower.includes('soporte')) && typeof v.qty === 'number') {
        calculatedQty = parseFloat((v.qty * (numSoportes || 0)).toFixed(4));
        if (typeof v.ot === 'number') {
          calculatedOt = parseFloat((v.ot * (numSoportes || 0)).toFixed(4));
        }
      } else if ((unitLower.includes('jumper') || descLower.includes('jumper')) && typeof v.qty === 'number') {
        calculatedQty = parseFloat((v.qty * (numJumpers || 0)).toFixed(4));
        if (typeof v.ot === 'number') {
          calculatedOt = parseFloat((v.ot * (numJumpers || 0)).toFixed(4));
        }
      }

      return {
        ...v,
        qty: calculatedQty,
        ot: calculatedOt
      };
    })
    .filter(v => typeof v.qty !== 'number' || v.qty > 0);
}

// ---------------------------------------------------------------------------
// Material-name suggestion list for the Detalle / CableTray editors.
// Supabase-first: this is a UI hint list only, never a data source.
// ---------------------------------------------------------------------------
export const AVAILABLE_CUSTOM_ITEMS: string[] = [
  'TERMINAL A COMPRESION UN OJAL 1/2 PARA CABLE 2/0 YAV',
  'PERNO 1/2"X1 1/2" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN',
  'TERMINAL A COMPRESION UN OJAL 3/8 PARA CABLE 2/0 YA26',
  'PERNO 3/8"X1 1/2" DE ACERO GALVANIZADO, CON TUERCA, DOBLE ARANDELA PLANA Y UNA DE PRESIÓN',
  'SOLDADURA VS',
  'CARGA 90',
  'MOLDE HSC-2G',
  'PRENSA PARALELA 1 CONDUCTOR 4- 2/0 AWG GCM26 BURNDY',
  'PRENSA PARALELA 2 CONDUCTOR 4- 2/0 AWG GCM26 BURNDY',
  'PRENSA PARALELA 2 CONDUCTORES 4- 2/0 AWG GCM26 BURNDY',
  'AISLADOR DE RESINA TIPO BARRIL',
  'ANCLAJE 3/8" TIPO HDI DE ACERO INOXIDABLE',
  'PERNO DE CABEZA HEXAGONAL 3/8"X1" DE ACERO INOXIDABLE, CON TUERCA, ARANDELA PLANA Y UNA DE PRESIÓN',
  'CABLE DESNUDO 2/0 AWG',
  'CABLE AISLADO 2/0 AWG THHN (JUMPER)',
  'CABLE AISLADO 2/0 AWG THHN',
  'TUBERIA PVC SCH 80 Ø3/4"',
  'RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC',
  'PERNO DE EXPANSIÓN 1/4"x2 1/2" SS316, CON TUERCA, ARANDELA PLANA Y DE PRESIÓN',
  'ABRAZADERA Ø 3/4" DE 2 PIEZAS SS316, SIMILAR A P1112 DE UNISTRUT'
];

/** Back-compat alias (was R2_SWAPPABLE). */
export const R2_SWAPPABLE: string[] = AVAILABLE_CUSTOM_ITEMS;

const OLD_CABLE20_RIEL = 'RIEL UNISTRUT ACERO INOX 316, 41X41X2.7mm';
const NEW_CABLE20_RIEL = 'RIEL PREFORMADO STRUT 41X41X2.7mm, A.G. RECUBIERTO DE PVC';

export function renameCable20RielDesc(desc: string): string {
  return (desc || '').trim() === OLD_CABLE20_RIEL ? NEW_CABLE20_RIEL : desc;
}

export const ANCLAJE_DESC = 'ANCLAJE 3/8" TIPO HDI DE ACERO INOXIDABLE';
export const ANCLAJE_PERNO_DESC =
  'PERNO DE CABEZA HEXAGONAL 3/8"X1" DE ACERO INOXIDABLE, CON TUERCA, ARANDELA PLANA Y UNA DE PRESIÓN';

export function ensureAnclajePerno(items: any[]): any[] {
  if (!Array.isArray(items)) return items;
  const hasAnclaje = items.some(it => (it.desc || '').trim() === ANCLAJE_DESC);
  const hasPerno = items.some(it => (it.desc || '').trim() === ANCLAJE_PERNO_DESC);
  if (!hasAnclaje || hasPerno) return items;
  const out: any[] = [];
  for (const it of items) {
    out.push(it);
    if ((it.desc || '').trim() === ANCLAJE_DESC) {
      const qty = typeof it.qty === 'number' ? it.qty : parseFloat(it.qty) || 4;
      if ('metradoOt' in it || !('ot' in it)) {
        out.push({
          desc: ANCLAJE_PERNO_DESC,
          qty,
          unit: 'u / cjto',
          material: it.material || 'C',
          metradoOt: String((it as any).metradoOt ?? qty)
        });
      } else {
        out.push({
          desc: ANCLAJE_PERNO_DESC,
          qty,
          unit: 'u / cjto',
          ot: (it as any).ot ?? qty,
          material: (it as any).material || 'C'
        });
      }
    }
  }
  return out;
}

export const DYNAMIC_DETALLE_VARIANTS_BY_AREA: Record<string, Record<string, DetalleVariantItem[]>> = JSON.parse(JSON.stringify(DETALLE_VARIANTS_BY_AREA));
export const DYNAMIC_DETALLE_VARIANTS: Record<string, DetalleVariantItem[]> = {};

/**
 * Barra variant cache, partitioned by sub-area like CABLE_2_0.
 * Supabase SSOT (`detalle_variants` category BARRA_POT / BARRA_INST);
 * NO_CORROSIVO is the canonical partition, CORROSIVO diverges independently.
 */
export const DYNAMIC_BARRA_POT_VARIANTS: Record<string, any[]> = {};
export const DYNAMIC_BARRA_INST_VARIANTS: Record<string, any[]> = {};
export const DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA: Record<SubAreaHumeda, Record<string, any[]>> = {
  'NO_CORROSIVO': {},
  'CORROSIVO': {}
};
export const DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA: Record<SubAreaHumeda, Record<string, any[]>> = {
  'NO_CORROSIVO': {},
  'CORROSIVO': {}
};

/** Read Barra variants for one sub-area (defaults to NO_CORROSIVO canonical partition). */
export function getBarraVariants(
  category: 'BARRA_POT' | 'BARRA_INST',
  subArea: SubAreaHumeda = 'NO_CORROSIVO'
): Record<string, any[]> {
  const bySub = category === 'BARRA_POT'
    ? DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA
    : DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA;
  const flat = category === 'BARRA_POT' ? DYNAMIC_BARRA_POT_VARIANTS : DYNAMIC_BARRA_INST_VARIANTS;
  return bySub[subArea] && Object.keys(bySub[subArea]).length > 0 ? bySub[subArea] : flat;
}

Object.keys(DYNAMIC_BARRA_POT_VARIANTS).forEach(key => {
  DYNAMIC_BARRA_POT_VARIANTS[key] = ensureAnclajePerno(DYNAMIC_BARRA_POT_VARIANTS[key]);
});
Object.keys(DYNAMIC_BARRA_INST_VARIANTS).forEach(key => {
  DYNAMIC_BARRA_INST_VARIANTS[key] = ensureAnclajePerno(DYNAMIC_BARRA_INST_VARIANTS[key]);
});

export function updateDynamicVariants(dbRecords: any[]) {
  // MERGE semantics: never wipe partitions we didn't receive rows for.
  // Supabase is SSOT; an empty response means "offline / no data", not "delete everything".
  if (!Array.isArray(dbRecords) || dbRecords.length === 0) return;

  dbRecords.forEach(rec => {
    const rawArea = (rec.area || '').toUpperCase().trim();
    const isHumeda = rawArea.includes('HUMED') || rawArea.includes('HUEMD');
    const areaKey = isHumeda ? 'AREA HUEMDA' : 'AREA SECA';
    const subAreaKey: SubAreaHumeda = rec.sub_area === 'CORROSIVO' ? 'CORROSIVO' : 'NO_CORROSIVO';

    const itemsMapped = (rec.items || []).map((it: any) => ({
      desc: renameCable20RielDesc(it.desc || ''),
      qty: it.qty,
      unit: it.unit,
      ot: it.ot ?? it.qty,
      otDynamic: it.otDynamic || (it.qty === 'Var.' ? 'empty' : undefined),
      formula: it.formula || undefined,
      material: it.material || it.mat
    }));

    if (rec.category === 'CABLE_2_0') {
      if (!DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey]) DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey] = {};
      DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey][rec.detalle_code] = itemsMapped;
      DYNAMIC_DETALLE_VARIANTS[rec.detalle_code] = itemsMapped;
      if (rec.detalle_code === '008/05') DYNAMIC_DETALLE_VARIANTS['008/5'] = itemsMapped;
      if (rec.detalle_code === 'ND') DYNAMIC_DETALLE_VARIANTS['N/D'] = itemsMapped;

      if (isHumeda) {
        if (!DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subAreaKey]) DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subAreaKey] = {};
        DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subAreaKey][rec.detalle_code] = itemsMapped;
      }
    } else if (rec.category === 'BARRA_POT') {
      const mapped = ensureAnclajePerno(
        itemsMapped.map((it: any) => ({
          desc: it.desc,
          qty: typeof it.qty === 'number' ? it.qty : parseFloat(it.qty) || 1,
          unit: it.unit,
          material: it.material || 'C',
          metradoOt: it.formula || (it.ot !== undefined ? String(it.ot) : '1'),
          formula: it.formula
        }))
      );
      if (!rec.sub_area && isHumeda) {
        DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][rec.detalle_code] = mapped;
        DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['CORROSIVO'][rec.detalle_code] = mapped;
      } else {
        DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA[subAreaKey][rec.detalle_code] = mapped;
      }
      DYNAMIC_BARRA_POT_VARIANTS[rec.detalle_code] = mapped;
      // Legacy row without sub_area populates BOTH partitions so CORROSIVO
      // starts identical, then diverges independently on per-subarea saves.
      if (!rec.sub_area && isHumeda) {
        DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['CORROSIVO'][rec.detalle_code] = mapped;
      }
      if (!DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][rec.detalle_code]) {
        DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][rec.detalle_code] = mapped;
      }
    } else if (rec.category === 'BARRA_INST') {
      const mapped = ensureAnclajePerno(
        itemsMapped.map((it: any) => ({
          desc: it.desc,
          qty: typeof it.qty === 'number' ? it.qty : parseFloat(it.qty) || 1,
          unit: it.unit,
          material: it.material || 'C',
          metradoOt: it.formula || (it.ot !== undefined ? String(it.ot) : '1'),
          formula: it.formula
        }))
      );
      if (!rec.sub_area && isHumeda) {
        DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][rec.detalle_code] = mapped;
        DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['CORROSIVO'][rec.detalle_code] = mapped;
      } else {
        DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA[subAreaKey][rec.detalle_code] = mapped;
      }
      DYNAMIC_BARRA_INST_VARIANTS[rec.detalle_code] = mapped;
      if (!rec.sub_area && isHumeda) {
        DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['CORROSIVO'][rec.detalle_code] = mapped;
      }
      if (!DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][rec.detalle_code]) {
        DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][rec.detalle_code] = mapped;
      }
    }
  });

  // Ensure canonical NO_CORROSIVO mirrors exist for flat-map Barra lookups.
  for (const [code, items] of Object.entries(DYNAMIC_BARRA_POT_VARIANTS)) {
    if (!DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][code]) {
      DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][code] = items;
    }
  }
  for (const [code, items] of Object.entries(DYNAMIC_BARRA_INST_VARIANTS)) {
    if (!DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][code]) {
      DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][code] = items;
    }
  }
}

export function updateSingleDynamicVariant(
  area: string,
  detalleCode: string,
  items: DetalleVariantItem[],
  category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0',
  subArea?: SubAreaHumeda
) {
  const isHumeda = area.toUpperCase().includes('HUMED') || area.toUpperCase().includes('HUEMD');
  const areaKey = isHumeda ? 'AREA HUEMDA' : 'AREA SECA';

  if (category === 'CABLE_2_0') {
    if (!DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey]) {
      DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey] = {};
    }
    DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey][detalleCode] = items;
    DYNAMIC_DETALLE_VARIANTS[detalleCode] = items;
    if (detalleCode === '008/05') DYNAMIC_DETALLE_VARIANTS['008/5'] = items;
    if (detalleCode === 'ND') DYNAMIC_DETALLE_VARIANTS['N/D'] = items;

    if (isHumeda) {
      if (subArea) {
        if (!DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea]) {
          DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea] = {};
        }
        DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea][detalleCode] = items;
      } else {
        if (DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA['NO_CORROSIVO']) {
          DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA['NO_CORROSIVO'][detalleCode] = items;
        }
        if (DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA['CORROSIVO']) {
          DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA['CORROSIVO'][detalleCode] = items;
        }
      }
    }
  } else if (category === 'BARRA_POT') {
    const mapped = ensureAnclajePerno(
      items.map((it: any) => ({
        desc: it.desc,
        qty: typeof it.qty === 'number' ? it.qty : parseFloat(it.qty) || 1,
        unit: it.unit,
        material: it.material || 'C',
        metradoOt: it.formula || (it.ot !== undefined ? String(it.ot) : '1'),
        formula: it.formula
      }))
    );
    DYNAMIC_BARRA_POT_VARIANTS[detalleCode] = mapped;
    // Barra is partitioned by sub-area like CABLE_2_0. An explicit subArea
    // writes ONLY that partition; omitted subArea (AREA SECA legacy path)
    // writes only the canonical NO_CORROSIVO partition.
    const target: SubAreaHumeda = isHumeda ? subArea || 'NO_CORROSIVO' : 'NO_CORROSIVO';
    if (!DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA[target]) {
      DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA[target] = {};
    }
    DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA[target][detalleCode] = mapped;
  } else if (category === 'BARRA_INST') {
    const mapped = ensureAnclajePerno(
      items.map((it: any) => ({
        desc: it.desc,
        qty: typeof it.qty === 'number' ? it.qty : parseFloat(it.qty) || 1,
        unit: it.unit,
        material: it.material || 'C',
        metradoOt: it.formula || (it.ot !== undefined ? String(it.ot) : '1'),
        formula: it.formula
      }))
    );
    DYNAMIC_BARRA_INST_VARIANTS[detalleCode] = mapped;
    const target: SubAreaHumeda = isHumeda ? subArea || 'NO_CORROSIVO' : 'NO_CORROSIVO';
    if (!DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA[target]) {
      DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA[target] = {};
    }
    DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA[target][detalleCode] = mapped;
  }
}

export function deleteSingleDynamicVariant(
  area: string,
  detalleCode: string,
  category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0',
  subArea?: SubAreaHumeda
) {
  const isHumeda = area.toUpperCase().includes('HUMED') || area.toUpperCase().includes('HUEMD');
  const areaKey = isHumeda ? 'AREA HUEMDA' : 'AREA SECA';

  if (category === 'CABLE_2_0') {
    if (DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey]) {
      delete DYNAMIC_DETALLE_VARIANTS_BY_AREA[areaKey][detalleCode];
    }
    delete DYNAMIC_DETALLE_VARIANTS[detalleCode];
    if (isHumeda) {
      if (subArea && DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea]) {
        delete DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA[subArea][detalleCode];
      } else {
        delete DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA['NO_CORROSIVO']?.[detalleCode];
        delete DYNAMIC_DETALLE_VARIANTS_BY_SUBAREA['CORROSIVO']?.[detalleCode];
      }
    }
  } else if (category === 'BARRA_POT') {
    if (isHumeda && subArea) {
      // Scoped delete: only the active partition. Flat map stays as canonical fallback.
      if (DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA[subArea]) {
        delete DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA[subArea][detalleCode];
      }
    } else {
      delete DYNAMIC_BARRA_POT_VARIANTS[detalleCode];
      delete DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['NO_CORROSIVO']?.[detalleCode];
      delete DYNAMIC_BARRA_POT_VARIANTS_BY_SUBAREA['CORROSIVO']?.[detalleCode];
    }
  } else if (category === 'BARRA_INST') {
    if (isHumeda && subArea) {
      if (DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA[subArea]) {
        delete DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA[subArea][detalleCode];
      }
    } else {
      delete DYNAMIC_BARRA_INST_VARIANTS[detalleCode];
      delete DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['NO_CORROSIVO']?.[detalleCode];
      delete DYNAMIC_BARRA_INST_VARIANTS_BY_SUBAREA['CORROSIVO']?.[detalleCode];
    }
  }
}
