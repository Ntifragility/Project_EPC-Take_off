import { TakeoffItem, MaterialType } from '../../takeoff-item/model/types';
import { uid } from '../../../shared/lib/uid';
import { isPrimaryMaterial, getAbsoluteUnit } from '../../takeoff-item/model/materialClassifier';
import { generateTagUnico, assignTagUnicoSuffixes } from '../../takeoff-item/model/tagGenerator';
import {
  DYNAMIC_DETALLE_VARIANTS,
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS,
  R2_SWAPPABLE,
  shouldAutoManageTuberia
} from './detalleVariants';

/**
 * Applies DETALLE variant substitutions for CABLE DESNUDO (r1 / r2)
 */
export function applyDetalleVariant(
  items: TakeoffItem[],
  tagPlano: string,
  pkgId: string,
  detalleCode: string,
  numSoportes = 0,
  numJumpers = 0,
  tuberiaOtParam?: string,
  cableOtParam?: string,
  skipAssignSuffixes = false,
  instanceId?: string
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
  const siblings = currentItems.filter(it =>
    instanceId
      ? it.instanceId === instanceId
      : (it.ruleId === 'r1' || it.ruleId === 'r2') && it.tagPlano === tagPlano && it.pkgId === pkgId
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
          metradoOt: tuberiaOt,
          instanceId: instanceId || refItem.instanceId
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

      if (isJumper && (!numJumpers || numJumpers <= 0)) {
        return false;
      }
      if (isSoporte && (!numSoportes || numSoportes <= 0)) {
        return false;
      }
      if (typeof v.qty === 'number' && v.qty <= 0) return false;

      if (cableItem && v.desc.trim().toUpperCase() === cableDescUp) {
        if (cableOt && (cableItem.metradoOt === 'Var.' || cableItem.metradoOt === 'VAR.' || !cableItem.metradoOt)) {
          cableItem.metradoOt = String(cableOt);
        }
        return false;
      }

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
        metradoOt: finalOt,
        instanceId: instanceId || refItem.instanceId
      };
    })
    .filter(v => typeof v.qty !== 'number' || v.qty > 0);

  currentItems.splice(insertAt, 0, ...newMiddle);

  currentItems
    .filter(it =>
      instanceId
        ? it.instanceId === instanceId
        : it.ruleId === 'r2' && it.tagPlano === tagPlano && it.pkgId === pkgId
    )
    .forEach(it => {
      it.detalle = detalleCode;
    });

  return skipAssignSuffixes ? currentItems : assignTagUnicoSuffixes(currentItems);
}

export function applyBarraPotDetalleVariant(
  items: TakeoffItem[],
  tagPlano: string,
  pkgId: string,
  detalleCode: string,
  numSoportes = 1,
  skipAssignSuffixes = false,
  instanceId?: string
): TakeoffItem[] {
  const variant =
    DYNAMIC_BARRA_POT_VARIANTS[detalleCode] ||
    DYNAMIC_BARRA_INST_VARIANTS[detalleCode];
  if (!variant) return items;

  const currentItems = [...items];
  const siblings = currentItems.filter(it =>
    instanceId
      ? it.instanceId === instanceId
      : (it.ruleId === 'r8' || it.ruleId === 'r9' || (it.desc && it.desc.toUpperCase().includes('BARRA'))) &&
        it.tagPlano === tagPlano &&
        it.pkgId === pkgId
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
      metradoOt: finalOt,
      instanceId: instanceId || refItem.instanceId
    };
  });

  currentItems.splice(firstIdx, 0, ...newItems);
  return skipAssignSuffixes ? currentItems : assignTagUnicoSuffixes(currentItems);
}

export const applyBarraDetalleVariant = applyBarraPotDetalleVariant;
