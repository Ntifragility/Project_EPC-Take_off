import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { TakeoffItem } from '../../../entities/takeoff-item/model/types';
import { AreaType } from '../../../shared/types/common';
import { uid } from '../../../shared/lib/uid';
import { generateTagUnico } from '../../../entities/takeoff-item/model/tagGenerator';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';
import { DEFAULT_CABLE_TRAY_MATRIX, getCableTrayMatrixValue } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { getCalculatedVariantItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { applyDetalleVariant, applyBarraPotDetalleVariant } from '../../../entities/takeoff-rule/model/ruleExpander';
import { evaluateMetradoFormula, lengthVar, shownFormula } from '../../../entities/takeoff-rule/model/metradoFormula';

export interface CalculatedPreviewItem {
  id: string;
  material: 'P' | 'C';
  desc: string;
  qty: number | string;
  metradoOt: string;
  unit: string;
}

export interface RuleCalculationParams {
  detalleCode: string;
  numSoportes?: number;
  numJumpers?: number;
  cableTrayWidth?: string;
  incluirTuberia?: boolean;
  cableLength?: string;
}

/**
 * Pure calculation engine: generates the exact list of TakeoffItems for a single instance
 * with all formulas, variants, and dimensions resolved in real-time.
 */
export function generateRuleItemsForInstance(
  currentRule: TakeoffRule,
  activeArea: AreaType,
  params: RuleCalculationParams,
  tagPlano = 'PREVIEW',
  pkgId = 'pkg-preview',
  planoVal = '',
  revVal = '',
  instanceId = uid()
): TakeoffItem[] {
  const detalleCode = (params.detalleCode || '').trim().toUpperCase();
  const numSoportes = params.numSoportes ?? 1;
  const numJumpers = params.numJumpers ?? 1;
  const cableTrayWidth = params.cableTrayWidth || '600 mm';
  const incluirTuberia = params.incluirTuberia === true;
  const cableLength = (params.cableLength || '').trim().replace(',', '.');

  const upTrigger = (currentRule.trigger || '').toUpperCase();
  const isCableTrayRule =
    Boolean(currentRule.cableTrayMatrix && currentRule.cableTrayMatrix.length > 0) ||
    currentRule.id.includes('001-2b-x1') ||
    upTrigger.includes('001/2B-X1') ||
    upTrigger.includes('001/2B') ||
    Boolean(currentRule.detalle && currentRule.detalle.toUpperCase().includes('001/2B-X1'));

  let instanceItems: TakeoffItem[] = [];

  if (isCableTrayRule) {
    const matrix =
      currentRule.cableTrayMatrix && currentRule.cableTrayMatrix.length > 0
        ? currentRule.cableTrayMatrix
        : DEFAULT_CABLE_TRAY_MATRIX;

    instanceItems = matrix.map(it => {
      const val = getCableTrayMatrixValue(it, cableTrayWidth);
      const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
      const isP =
        it.material === 'P' ||
        it.unit === 'm' ||
        it.desc.toUpperCase().includes('RIEL') ||
        it.desc.toUpperCase().includes('ESTRUCT');
      const mat = (it.material || (isP ? 'P' : 'C')) as 'P' | 'C';
      return {
        id: uid(),
        pkgId,
        desc: it.desc,
        qty: numVal,
        unit: it.unit,
        notes: '',
        ruleId: currentRule.id,
        material: mat,
        plano: planoVal,
        rev: revVal,
        tagUnico: generateTagUnico(planoVal, tagPlano, mat),
        tagPlano,
        detalle: detalleCode || currentRule.detalle || '001/2B-X1',
        metradoOt: String(val),
        instanceId
      };
    });
  } else if (currentRule.id === 'r2' && activeArea === 'AREA HUMEDA') {
    const variantItems = getCalculatedVariantItems(
      detalleCode,
      'AREA HUMEDA',
      numSoportes,
      numJumpers
    );
    instanceItems = variantItems.map(v => {
      const isVar = v.qty === 'Var.' || String(v.ot).toUpperCase() === 'VAR.';
      const mat = componentClass(v.desc, v.material);
      const descUp = v.desc.toUpperCase();
      const isCable = descUp.includes('CABLE') && !descUp.includes('JUMPER');
      const userLen = parseFloat(cableLength);
      const hasUserLen = !isNaN(userLen) && userLen > 0;

      const finalQty = hasUserLen && isCable ? userLen : typeof v.qty === 'number' ? v.qty : 1;
      const finalOt = hasUserLen && isCable ? String(userLen) : isVar ? 'Var.' : v.ot !== undefined ? String(v.ot) : '';

      return {
        id: uid(),
        pkgId,
        desc: v.desc,
        qty: finalQty,
        unit: v.unit,
        notes: '',
        ruleId: currentRule.id,
        material: mat,
        plano: planoVal,
        rev: revVal,
        tagUnico: generateTagUnico(planoVal, tagPlano, mat),
        tagPlano,
        detalle: detalleCode,
        metradoOt: finalOt,
        instanceId
      };
    });
  } else {
    (currentRule.subitems || [])
      .filter(s => !(currentRule.id === 'r1' && s.desc.toUpperCase().includes('CEMENTO GEM') && detalleCode !== '008/3B'))
      .forEach(s => {
        const mat = componentClass(s.desc, s.material);
        const descUp = s.desc.toUpperCase();
        const formula = shownFormula(s, currentRule.trigger);
        const result = evaluateMetradoFormula(formula, {
          length: lengthVar(cableLength),
          soportes: numSoportes,
          jumpers: numJumpers
        });
        const metradoOt = result.status === 'value' ? result.text : '';
        const qtyOverride = result.status === 'value' ? result.number : undefined;
        const cableMeters = descUp.includes('CABLE DESNUDO 2/0') && !descUp.includes('JUMPER') ? Number(cableLength) : NaN;

        instanceItems.push({
          id: uid(),
          pkgId,
          desc: s.desc,
          qty: qtyOverride !== undefined ? qtyOverride : Number.isFinite(cableMeters) && cableMeters > 0 ? cableMeters : s.qty,
          unit: s.unit,
          notes: '',
          ruleId: currentRule.id,
          material: mat,
          plano: planoVal,
          rev: revVal,
          tagUnico: generateTagUnico(planoVal, tagPlano, mat),
          tagPlano,
          detalle: detalleCode,
          metradoOt: metradoOt || (s.qty === 'Var.' ? (cableLength ? String(cableLength) : 'Var.') : String(s.qty || '')),
          instanceId
        });
      });

    if (
      currentRule.id === 'r1' &&
      detalleCode === '008/3B' &&
      !instanceItems.some(it => it.desc.toUpperCase().includes('CEMENTO GEM'))
    ) {
      const cemento = evaluateMetradoFormula('length * 11.3 / 2', { length: lengthVar(cableLength) });
      instanceItems.push({
        id: uid(),
        pkgId,
        desc: 'CEMENTO GEM (11.3 Kg x bls)',
        qty: cemento.status === 'value' ? cemento.number : 'length * 11.3 / 2',
        unit: 'kg',
        notes: '',
        ruleId: currentRule.id,
        material: 'C',
        plano: planoVal,
        rev: revVal,
        tagUnico: generateTagUnico(planoVal, tagPlano, 'C'),
        tagPlano,
        detalle: detalleCode,
        metradoOt: cemento.status === 'value' ? cemento.text : 'length * 11.3 / 2',
        instanceId
      });
    }

    if (
      currentRule.id === 'r1' &&
      (detalleCode === '008/3A' || detalleCode === '008/3B') &&
      incluirTuberia &&
      !instanceItems.some(it => it.desc.toUpperCase().includes('TUBERIA') || it.desc.toUpperCase().includes('TUBERÍA'))
    ) {
      instanceItems.push({
        id: uid(),
        pkgId,
        desc: 'TUBERIA PVC SCH 80 Ø3/4"',
        qty: 'Var.',
        unit: 'm',
        notes: '',
        ruleId: currentRule.id,
        material: 'P',
        plano: planoVal,
        rev: revVal,
        tagUnico: generateTagUnico(planoVal, tagPlano, 'P'),
        tagPlano,
        detalle: detalleCode,
        metradoOt: 'Var.',
        instanceId
      });
    }
  }

  // Variant transformations (r1 / r2)
  if (currentRule.id === 'r1' || currentRule.id === 'r2') {
    const tItem = instanceItems.find(i => i.desc.toUpperCase().includes('TUBERIA') || i.desc.toUpperCase().includes('TUBERÍA'));
    const cItem = instanceItems.find(i => i.desc.toUpperCase().includes('CABLE') && !i.desc.toUpperCase().includes('JUMPER'));
    const tOt = tItem ? tItem.metradoOt : '';
    const cOt = cItem ? cItem.metradoOt : (cableLength || '');
    instanceItems = applyDetalleVariant(
      instanceItems,
      tagPlano,
      pkgId,
      detalleCode,
      numSoportes,
      numJumpers,
      tOt,
      cOt,
      true,
      instanceId
    );
  }

  // Variant transformations (Barra Pot / Barra Inst)
  if (
    (currentRule.id === 'r8' || currentRule.id === 'r9' || upTrigger.includes('BARRA')) &&
    (activeArea === 'AREA HUMEDA' || detalleCode.startsWith('010/17'))
  ) {
    instanceItems = applyBarraPotDetalleVariant(
      instanceItems,
      tagPlano,
      pkgId,
      detalleCode,
      numSoportes,
      true,
      instanceId
    );
  }

  return instanceItems;
}

/**
 * Resolves preview items formatted for the live calculation preview table in RuleTriggerModal.
 */
export function getRulePreviewCalculatedItems(
  rule: TakeoffRule,
  activeArea: AreaType,
  params: RuleCalculationParams
): CalculatedPreviewItem[] {
  const items = generateRuleItemsForInstance(
    rule,
    activeArea,
    params,
    'PREVIEW',
    'pkg-preview',
    'PL-01',
    '0',
    'inst-preview'
  );

  return items.map(it => {
    let metradoDisplay = it.metradoOt || '';
    if (!metradoDisplay && it.qty !== undefined && it.qty !== null) {
      metradoDisplay = typeof it.qty === 'number' ? (Number.isInteger(it.qty) ? String(it.qty) : it.qty.toFixed(2)) : String(it.qty);
    }
    if (!metradoDisplay) {
      metradoDisplay = '1';
    }

    return {
      id: it.id,
      material: (it.material || 'P') as 'P' | 'C',
      desc: it.desc,
      qty: it.qty,
      metradoOt: metradoDisplay,
      unit: it.unit
    };
  });
}
