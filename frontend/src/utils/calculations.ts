import { TakeoffItem, MaterialType } from '../types/takeoff';
import { DETALLE_VARIANTS, R2_SWAPPABLE, shouldAutoManageTuberia } from '../data/detalleVariants';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function isPrimaryMaterial(desc: string): boolean {
  const primaryList = [
    'BARRA',
    'CABLE DESNUDO 4/0 AWG',
    'CABLE DESNUDO 2/0 AWG',
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
    'TUBERIA PVC SCH 80 Ø1"',
    'TUBERIA PVC SCH 80 Ø3/4"',
    'VARILLA COPPERWELD 3/4"X2.4M'
  ];
  const up = desc.toUpperCase();
  return primaryList.some(p => up.includes(p.toUpperCase()));
}

export function isCountable(desc: string, section = 'pat'): boolean {
  if (section === 'canalizado') return true;
  const list = [
    'BARRA',
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

// Applies DETALLE variant substitutions for CABLE DESNUDO 2/0 AWG (r2)
export function applyDetalleVariant(
  items: TakeoffItem[],
  tagPlano: string,
  pkgId: string,
  detalleCode: string
): TakeoffItem[] {
  let variant = DETALLE_VARIANTS[detalleCode];
  if (!variant && detalleCode.startsWith('020')) {
    variant = DETALLE_VARIANTS['020'];
  }
  if (!variant) return items;

  const currentItems = [...items];
  const siblings = currentItems.filter(
    it => it.ruleId === 'r2' && it.tagPlano === tagPlano && it.pkgId === pkgId
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
  const cableItem = siblings.find(sib => sib.desc.toUpperCase().includes('CABLE DESNUDO 2/0 AWG'));
  let tuberiaItem = siblings.find(sib => sib.desc.toUpperCase().includes('TUBERIA'));
  const tuberiaOt = tuberiaItem ? tuberiaItem.metradoOt : '';
  const cableOt = cableItem ? (parseFloat(cableItem.metradoOt) || 0) : 0;
  const autoManageTuberia = shouldAutoManageTuberia(detalleCode);

  if (autoManageTuberia && (detalleCode === '153' || detalleCode === 'NA')) {
    if (tuberiaItem) {
      const idx = currentItems.indexOf(tuberiaItem);
      if (idx !== -1) currentItems.splice(idx, 1);
    }
  } else if (autoManageTuberia) {
    const tuberiaDesc = detalleCode.startsWith('020')
      ? 'TUBERIA RIGIDA DE ACERO GALVANIZADO EN CALIENTE DE WHEATLAND"'
      : 'TUBERIA PVC SCH 80 Ø3/4"';

    if (!tuberiaItem) {
      const insertTubAt = cableItem ? currentItems.indexOf(cableItem) + 1 : currentItems.indexOf(refItem) + 1;
      tuberiaItem = {
        id: uid(),
        pkgId: refItem.pkgId,
        desc: tuberiaDesc,
        qty: 1,
        unit: 'm',
        notes: '',
        ruleId: 'r2',
        material: 'C',
        plano: refItem.plano,
        rev: refItem.rev,
        tagUnico: '',
        tagPlano: tagPlano,
        detalle: detalleCode,
        metradoOt: ''
      };
      currentItems.splice(insertTubAt, 0, tuberiaItem);
    } else {
      tuberiaItem.desc = tuberiaDesc;
    }
  } else if (tuberiaItem) {
    const idx = currentItems.indexOf(tuberiaItem);
    if (idx !== -1) currentItems.splice(idx, 1);
    tuberiaItem = undefined;
  }

  const insertAt = tuberiaItem && currentItems.indexOf(tuberiaItem) !== -1
    ? currentItems.indexOf(tuberiaItem) + 1
    : (cableItem ? currentItems.indexOf(cableItem) + 1 : firstIdx + 1);

  const newMiddle: TakeoffItem[] = variant.map(v => {
    let finalOt = v.ot !== undefined ? String(v.ot) : '';
    if (v.otDynamic === '1c/3m') {
      finalOt = Math.ceil(cableOt / 3).toString();
    } else if (v.otDynamic === 'empty') {
      finalOt = '';
    } else if (String(v.ot).toUpperCase() === 'VAR.' && v.desc.toUpperCase().includes('TUBERIA')) {
      finalOt = tuberiaOt || '';
    }
    return {
      id: uid(),
      pkgId: refItem.pkgId,
      desc: v.desc,
      qty: v.qty,
      unit: v.unit,
      notes: '',
      ruleId: 'r2',
      material: isPrimaryMaterial(v.desc) ? 'P' : 'C',
      plano: refItem.plano,
      rev: refItem.rev,
      tagUnico: '',
      tagPlano: tagPlano,
      detalle: detalleCode,
      metradoOt: finalOt
    };
  });

  currentItems.splice(insertAt, 0, ...newMiddle);

  // Update DETALLE on all remaining siblings
  currentItems
    .filter(it => it.ruleId === 'r2' && it.tagPlano === tagPlano && it.pkgId === pkgId)
    .forEach(it => {
      it.detalle = detalleCode;
    });

  return currentItems;
}

