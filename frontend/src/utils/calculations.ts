import { TakeoffItem, MaterialType } from '../types/takeoff';
import {
  DYNAMIC_DETALLE_VARIANTS,
  R2_SWAPPABLE,
  shouldAutoManageTuberia,
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS
} from '../data/detalleVariants';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getAbsoluteUnit(rawUnit: string, desc = ''): string {
  const descUp = (desc || '').toUpperCase();
  if (descUp.includes('TERMINAL') || descUp.includes('PERNO')) {
    return 'und';
  }
  const normalized = (rawUnit || '').toLowerCase().trim();
  if (normalized.includes('m3')) return 'm3';
  if (normalized.includes('kg')) return 'kg';
  if (normalized.includes('m')) return 'm';
  if (normalized.includes('u') || normalized.includes('und') || normalized.includes('cjto') || normalized.includes('c/')) return 'und';
  return 'und'; // default fallback
}

export function isPrimaryMaterial(desc: string): boolean {
  const up = (desc || '').toUpperCase();
  // TERMINAL items are NOT P components (must NOT have TAG UNICO)
  if (up.includes('TERMINAL') && !up.includes('TERMINAL DE COBRE 5/8"')) {
    return false;
  }
  // PERNO items are NOT P components
  if (up.includes('PERNO')) {
    return false;
  }

  const primaryList = [
    'BARRA',
    'CAJA REGISTRO 400 x 400 x 300 mm',
    'CEMENTO GEM (11.3 kg x bls)',
    'CONECTOR GK 1429',
    'PARARRAYO EN POSTE DE 15M',
    'PARARRAYO EN POSTE DE 3M',
    'POSTE 15 M',
    'SOLDADURA GT',
    'SOLDADURA T 4/0',
    'SOLDADURA VS',
    'SOLDADURA X 4/0',
    'TERMINAL DE COBRE 5/8"X48" MODELO',
    'VARILLA COPPERWELD 3/4"X2.4M'
  ];
  if (up.includes('TUBERIA') || up.includes('TUBERÍA')) return true;
  if (up.startsWith('CABLE DESNUDO') || up.startsWith('CABLE AISLADO')) return true;
  return primaryList.some(p => up.includes(p.toUpperCase()));
}

// Helper for sorting P items to guarantee user requirement:
// 1: CABLE DESNUDO 2/0 AWG -> .....01
// 2: TUBERIA ...           -> .....02
// Everything else comes after (.03, .04, ...)
export function getPItemPriority(desc: string): number {
  const up = desc.toUpperCase();
  if (up.includes('CABLE DESNUDO 2/0 AWG')) return 1;
  if (up.includes('TUBERIA')) return 2;
  if (up.includes('CABLE')) return 3;
  if (up.includes('BARRA')) return 4;
  return 10;
}

export function assignTagUnicoSuffixes(items: TakeoffItem[]): TakeoffItem[] {
  const groups: Record<string, TakeoffItem[]> = {};

  // Find all P items
  items.forEach(it => {
    const isP = it.material === 'P' || isPrimaryMaterial(it.desc);
    if (isP && it.tagPlano) {
      if (!groups[it.tagPlano]) groups[it.tagPlano] = [];
      groups[it.tagPlano].push(it);
    }
  });

  Object.values(groups).forEach(group => {
    if (group.length > 1) {
      // Sort group in-place: CABLE DESNUDO 2/0 AWG (.01), TUBERIA (.02), others after
      group.sort((a, b) => getPItemPriority(a.desc) - getPItemPriority(b.desc));
      group.forEach((it, idx) => {
        const base = generateTagUnico(it.plano, it.tagPlano, 'P');
        if (base) {
          it.tagUnico = `${base}.${String(idx + 1).padStart(2, '0')}`;
        }
      });
    } else if (group.length === 1) {
      const it = group[0];
      it.tagUnico = generateTagUnico(it.plano, it.tagPlano, 'P');
    }
  });

  return items;
}

export function isCountable(desc: string, section = 'pat'): boolean {
  if (section === 'canalizado') return true;
  const list = [
    'BARRA',
    'CABLE AISLADO',
    'CABLE DESNUDO 2/0 AWG',
    'CABLE DESNUDO 4/0 AWG',
    'CEMENTO GEM',
    'PARARRAYO EN POSTE DE 15M',
    'PARARRAYO EN POSTE DE 3M',
    'POSTE 15 M',
    'POZO CON CAJA REGISTRO',
    'POZO SIN CAJA REGISTRO',
    'SOLDADURA T 4/0',
    'SOLDADURA VS',
    'SOLDADURA X 4/0',
    'TERMINAL DE COBRE 5/8"X48"',
    'TUBERIA PVC SCH 80 Ø1"',
    'TUBERIA PVC SCH 80 Ø3/4"'
  ];
  const up = desc.toUpperCase();
  return list.some(p => up.includes(p));
}

// Generate TAG UNICO from PLANO + TAG EN PLANO
// Example: P22-DA-2151-07-GL-001 -> parts[2] + parts[4] + parts[5] + "." + tagPlano => 2151GL001.M04
export function generateTagUnico(plano: string, tagPlano: string, material: MaterialType | string): string {
  if (material !== 'P' || !plano || !tagPlano) return '';
  const parts = plano.split('-');
  if (parts.length < 6) return '';
  return parts[2] + parts[4] + parts[5] + '.' + tagPlano;
}

// Sequential tag generator (e.g. M04 -> M05)
export function getSequentialTag(baseTag: string, index: number): string {
  if (!baseTag) return '';
  const match = baseTag.match(/^(.*?)(\d+)$/);
  if (!match) return baseTag;

  const prefix = match[1];
  const number = parseInt(match[2], 10);
  const newNumber = number + index;
  const originalDigits = match[2].length;
  const formattedNumber = String(newNumber).padStart(originalDigits, '0');

  return prefix + formattedNumber;
}

export function getSequentialTagsExample(baseTag: string, count: number): string {
  if (!baseTag || count <= 1) return baseTag || '';
  const examples: string[] = [];
  for (let i = 0; i < Math.min(count, 5); i++) {
    examples.push(getSequentialTag(baseTag, i));
  }
  let result = examples.join(', ');
  if (count > 5) result += ', ...';
  return result;
}

// Applies DETALLE variant substitutions for CABLE DESNUDO (r1 / r2)
export function applyDetalleVariant(
  items: TakeoffItem[],
  tagPlano: string,
  pkgId: string,
  detalleCode: string,
  numSoportes = 0,
  numJumpers = 0,
  tuberiaOtParam?: string,
  cableOtParam?: string
): TakeoffItem[] {
  let variant = DYNAMIC_DETALLE_VARIANTS[detalleCode];
  if (!variant && (detalleCode === '008/5' || detalleCode === '008/05')) {
    variant = DYNAMIC_DETALLE_VARIANTS['008/05'] || DYNAMIC_DETALLE_VARIANTS['008/5'];
  }
  if (!variant && (detalleCode === 'ND' || detalleCode === 'N/D' || !detalleCode)) {
    variant = DYNAMIC_DETALLE_VARIANTS['ND'];
  }
  if (!variant && detalleCode.startsWith('020')) {
    variant = DYNAMIC_DETALLE_VARIANTS['020'];
  }
  if (!variant) return items;

  const currentItems = [...items];
  const siblings = currentItems.filter(
    it => (it.ruleId === 'r1' || it.ruleId === 'r2') && it.tagPlano === tagPlano && it.pkgId === pkgId
  );
  if (siblings.length === 0) return currentItems;

  const firstIdx = currentItems.indexOf(siblings[0]);
  const swapUp = R2_SWAPPABLE.map(s => s.toUpperCase());

  // Remove existing swappable items
  const toRemove = siblings.filter(it => swapUp.includes(it.desc.toUpperCase()));
  toRemove.forEach(it => {
    const idx = currentItems.indexOf(it);
    if (idx !== -1) currentItems.splice(idx, 1);
  });

  const refItem = siblings[0];
  const cableItem = siblings.find(sib => sib.desc.toUpperCase().includes('CABLE'));
  let tuberiaItem = siblings.find(sib => sib.desc.toUpperCase().includes('TUBERIA') || sib.desc.toUpperCase().includes('TUBERÍA'));

  if (cableItem && cableOtParam !== undefined && cableOtParam !== '') {
    cableItem.metradoOt = cableOtParam;
  }
  if (tuberiaItem && tuberiaOtParam !== undefined && tuberiaOtParam !== '') {
    tuberiaItem.metradoOt = tuberiaOtParam;
  }

  const tuberiaOt = (tuberiaOtParam !== undefined && tuberiaOtParam !== '') ? tuberiaOtParam : (tuberiaItem ? tuberiaItem.metradoOt : '');
  const cableOt = (cableOtParam !== undefined && cableOtParam !== '') ? parseFloat(cableOtParam) : (cableItem ? (parseFloat(cableItem.metradoOt) || 0) : 0);
  const autoManageTuberia = shouldAutoManageTuberia(detalleCode);

  if (detalleCode === '153' || detalleCode === 'NA') {
    if (tuberiaItem) {
      const idx = currentItems.indexOf(tuberiaItem);
      if (idx !== -1) currentItems.splice(idx, 1);
      tuberiaItem = undefined;
    }
  } else {
    const tuberiaDesc = detalleCode.startsWith('020')
      ? 'TUBERIA RIGIDA DE ACERO GALVANIZADO EN CALIENTE DE WHEATLAND"'
      : 'TUBERIA PVC SCH 80 Ø3/4"';

    const variantHasTuberia = variant && variant.some(v => v.desc.toUpperCase().includes('TUBERIA') || v.desc.toUpperCase().includes('TUBERÍA'));
    const shouldKeepTuberia = (tuberiaOt !== undefined && tuberiaOt !== '') || variantHasTuberia || autoManageTuberia || !!tuberiaItem;

    if (shouldKeepTuberia) {
      if (!tuberiaItem) {
        const insertTubAt = cableItem ? currentItems.indexOf(cableItem) + 1 : currentItems.indexOf(refItem) + 1;
        tuberiaItem = {
          id: uid(),
          pkgId: refItem.pkgId,
          desc: tuberiaDesc,
          qty: 1,
          unit: 'm',
          notes: '',
          ruleId: refItem.ruleId || 'r2',
          material: 'P',
          plano: refItem.plano,
          rev: refItem.rev,
          tagUnico: generateTagUnico(refItem.plano, tagPlano, 'P'),
          tagPlano: tagPlano,
          detalle: detalleCode,
          metradoOt: tuberiaOt
        };
        currentItems.splice(insertTubAt, 0, tuberiaItem);
      } else {
        tuberiaItem.desc = tuberiaDesc;
        tuberiaItem.material = 'P';
        tuberiaItem.tagUnico = generateTagUnico(tuberiaItem.plano, tagPlano, 'P');
        if (tuberiaOt !== undefined && tuberiaOt !== '') {
          tuberiaItem.metradoOt = tuberiaOt;
        }
      }
    }
  }

  const insertAt = tuberiaItem && currentItems.indexOf(tuberiaItem) !== -1
    ? currentItems.indexOf(tuberiaItem) + 1
    : (cableItem ? currentItems.indexOf(cableItem) + 1 : firstIdx + 1);

  const cableDescUp = cableItem ? cableItem.desc.trim().toUpperCase() : '';
  const tuberiaDescUp = tuberiaItem ? tuberiaItem.desc.trim().toUpperCase() : '';

  const newMiddle: TakeoffItem[] = variant
    .filter(v => {
      const isJumper = v.unit.toLowerCase().includes('jumper') || v.desc.toUpperCase().includes('JUMPER');
      const isSoporte = v.unit.toLowerCase().includes('soporte') || v.desc.toUpperCase().includes('SOPORTE');

      // 1) If JUMPERS <= 0, do NOT consider ANY item related to jumpers
      if (isJumper && (!numJumpers || numJumpers <= 0)) {
        return false;
      }

      // 2) If SOPORTES <= 0, do NOT consider ANY item related to soportes
      if (isSoporte && (!numSoportes || numSoportes <= 0)) {
        return false;
      }

      // 3) Filter out items with numeric qty <= 0
      if (typeof v.qty === 'number' && v.qty <= 0) return false;

      // 4) Do not duplicate primary cableItem if it already exists in currentItems for this tag
      if (cableItem && v.desc.trim().toUpperCase() === cableDescUp) {
        if (cableOt && (cableItem.metradoOt === 'Var.' || cableItem.metradoOt === 'VAR.' || !cableItem.metradoOt)) {
          cableItem.metradoOt = String(cableOt);
        }
        return false;
      }

      // 5) Do not duplicate primary tuberiaItem if it already exists in currentItems for this tag
      if (tuberiaItem && (v.desc.trim().toUpperCase() === tuberiaDescUp || (v.desc.toUpperCase().includes('TUBERIA') && tuberiaItem))) {
        if (tuberiaOt && (tuberiaItem.metradoOt === 'Var.' || tuberiaItem.metradoOt === 'VAR.' || !tuberiaItem.metradoOt)) {
          tuberiaItem.metradoOt = tuberiaOt;
        }
        return false;
      }

      return true;
    })
    .map(v => {
      let finalOt = v.ot !== undefined ? String(v.ot) : '';
      let finalQty = v.qty;
      const isJumper = v.unit.toLowerCase().includes('jumper') || v.desc.toUpperCase().includes('JUMPER');
      const isSoporte = v.unit.toLowerCase().includes('soporte') || v.desc.toUpperCase().includes('SOPORTE');

      if (isSoporte) {
        const nQty = typeof v.qty === 'number' ? v.qty : 1;
        finalQty = parseFloat((nQty * (numSoportes || 0)).toFixed(4));
        if (v.ot !== undefined && typeof v.ot === 'number') {
          finalOt = String(parseFloat((v.ot * (numSoportes || 0)).toFixed(4)));
        }
      } else if (isJumper) {
        const nQty = typeof v.qty === 'number' ? v.qty : 1;
        finalQty = parseFloat((nQty * (numJumpers || 0)).toFixed(4));
        if (v.ot !== undefined && typeof v.ot === 'number') {
          finalOt = String(parseFloat((v.ot * (numJumpers || 0)).toFixed(4)));
        }
      }

      // Replace 'Var.' or 'VAR.' with appropriate measurement if present
      if (finalOt.toUpperCase() === 'VAR.' || v.otDynamic === 'var') {
        if (v.desc.toUpperCase().includes('JUMPER')) {
          finalOt = (typeof v.ot === 'number') ? String(v.ot) : '';
        } else if (v.desc.toUpperCase().includes('CABLE')) {
          finalOt = cableOt ? String(cableOt) : '';
        } else if (v.desc.toUpperCase().includes('TUBERIA') || v.desc.toUpperCase().includes('TUBERÍA')) {
          finalOt = tuberiaOt || '';
        } else {
          finalOt = '';
        }
      }

      if (v.qty === 'Var.') {
        if (v.desc.toUpperCase().includes('JUMPER')) {
          finalQty = (typeof v.qty === 'number') ? v.qty : 1;
        } else if (v.desc.toUpperCase().includes('CABLE')) {
          finalQty = cableOt || 1;
        } else if (v.desc.toUpperCase().includes('TUBERIA') || v.desc.toUpperCase().includes('TUBERÍA')) {
          finalQty = parseFloat(tuberiaOt) || 1;
        } else {
          finalQty = 1;
        }
      }

      if (v.otDynamic === '1c/3m') {
        finalOt = Math.ceil(cableOt / 3).toString();
      } else if (v.otDynamic === 'empty') {
        finalOt = '';
      }

      const isP = isPrimaryMaterial(v.desc);
      return {
        id: uid(),
        pkgId: refItem.pkgId,
        desc: v.desc,
        qty: finalQty,
        unit: getAbsoluteUnit(v.unit, v.desc),
        notes: '',
        ruleId: 'r2',
        material: (isP ? 'P' : 'C') as MaterialType,
        plano: refItem.plano,
        rev: refItem.rev,
        tagUnico: isP ? generateTagUnico(refItem.plano, tagPlano, 'P') : '',
        tagPlano: tagPlano,
        detalle: detalleCode,
        metradoOt: finalOt
      };
    })
    .filter(v => typeof v.qty !== 'number' || v.qty > 0);

  currentItems.splice(insertAt, 0, ...newMiddle);

  // Update DETALLE on all remaining siblings
  currentItems
    .filter(it => it.ruleId === 'r2' && it.tagPlano === tagPlano && it.pkgId === pkgId)
    .forEach(it => {
      it.detalle = detalleCode;
    });

  const consolidated = consolidateTagItems(currentItems, tagPlano, pkgId);
  return assignTagUnicoSuffixes(consolidated);
}

// Consolidates items with identical descriptions for a given tag into a single item in the main table
export function consolidateTagItems(items: TakeoffItem[], tagPlano: string, pkgId: string): TakeoffItem[] {
  const result = [...items];
  const tagSiblings = result.filter(it => it.tagPlano === tagPlano && it.pkgId === pkgId);
  const seenDescMap = new Map<string, TakeoffItem>();
  const toRemoveIndices: number[] = [];

  tagSiblings.forEach(it => {
    const key = it.desc.trim().toUpperCase();
    const existing = seenDescMap.get(key);
    if (existing) {
      // Sum metradoOt if numeric
      const val1 = parseFloat(existing.metradoOt);
      const val2 = parseFloat(it.metradoOt);
      if (!isNaN(val1) && !isNaN(val2)) {
        existing.metradoOt = String(parseFloat((val1 + val2).toFixed(4)));
      } else if (it.metradoOt && (!existing.metradoOt || existing.metradoOt === 'Var.' || existing.metradoOt === 'VAR.')) {
        existing.metradoOt = it.metradoOt;
      }

      // Sum qty if numeric
      if (typeof existing.qty === 'number' && typeof it.qty === 'number') {
        existing.qty = parseFloat((existing.qty + it.qty).toFixed(4));
      }

      const removeIdx = result.indexOf(it);
      if (removeIdx !== -1) toRemoveIndices.push(removeIdx);
    } else {
      seenDescMap.set(key, it);
    }
  });

  toRemoveIndices.sort((a, b) => b - a).forEach(idx => {
    result.splice(idx, 1);
  });

  return result;
}

// Applies DETALLE variant substitutions for BARRA POT (r8) and BARRA INST (r9) in AREA HUMEDA
export function applyBarraPotDetalleVariant(
  items: TakeoffItem[],
  tagPlano: string,
  pkgId: string,
  detalleCode: string,
  numSoportes = 1
): TakeoffItem[] {
  const variant =
    DYNAMIC_BARRA_POT_VARIANTS[detalleCode] ||
    DYNAMIC_BARRA_INST_VARIANTS[detalleCode];
  if (!variant) return items;

  const currentItems = [...items];
  const siblings = currentItems.filter(
    it => (it.ruleId === 'r8' || it.ruleId === 'r9') && it.tagPlano === tagPlano && it.pkgId === pkgId
  );
  if (siblings.length === 0) return currentItems;

  const firstIdx = currentItems.indexOf(siblings[0]);
  const refItem = siblings[0];
  const targetRuleId =
    refItem.ruleId || (detalleCode.startsWith('010/17C') || detalleCode.startsWith('010/17D') ? 'r9' : 'r8');

  // Remove existing siblings for this group
  siblings.forEach(it => {
    const idx = currentItems.indexOf(it);
    if (idx !== -1) currentItems.splice(idx, 1);
  });

  const newItems: TakeoffItem[] = variant.map(v => {
    const isSoporte = v.unit.toLowerCase().includes('soporte');
    const finalQty = isSoporte ? v.qty * numSoportes : v.qty;
    const finalOt = isSoporte ? String(parseFloat(v.metradoOt || '1') * numSoportes) : v.metradoOt;

    return {
      id: uid(),
      pkgId: refItem.pkgId,
      desc: v.desc,
      qty: finalQty,
      unit: getAbsoluteUnit(v.unit, v.desc),
      notes: '',
      ruleId: targetRuleId,
      material: v.material,
      plano: refItem.plano,
      rev: refItem.rev,
      tagUnico: generateTagUnico(refItem.plano, tagPlano, v.material),
      tagPlano: tagPlano,
      detalle: detalleCode,
      metradoOt: finalOt
    };
  });

  currentItems.splice(firstIdx, 0, ...newItems);
  const consolidated = consolidateTagItems(currentItems, tagPlano, pkgId);
  return assignTagUnicoSuffixes(consolidated);
}

export const applyBarraDetalleVariant = applyBarraPotDetalleVariant;
