import { TakeoffRule, ApplyRuleContext, RuleSubitem } from './types';
import { componentClass, getAbsoluteUnit } from '../../takeoff-item/model/materialClassifier';
import { evaluateFormula } from './formulaEvaluator';
import { uid } from '../../../shared/lib/uid';

export interface EvaluatedTakeoffRow {
  id: string;
  material: 'P' | 'C';
  detalle: string;
  desc: string;
  qty: number | string;
  metradoOt: string;
  unit: string;
  notes?: string;
  ruleId: string;
}

/**
 * Universal Rule Evaluation Engine.
 * Takes ANY rule and execution context, applies parameter and detalle overrides,
 * evaluates formulas, and produces standardized takeoff row drafts.
 */
export function evaluateRuleExecution(
  rule: TakeoffRule,
  ctx: ApplyRuleContext
): EvaluatedTakeoffRow[] {
  const effectiveDetalle = (ctx.detalleCode || rule.defaultDetalle || rule.detalle || 'ND').trim().toUpperCase();
  const count = Math.max(1, ctx.count || 1);
  const cableLengthNum = parseFloat(ctx.cableLength || '0') || 0;

  // Find dimension multiplier if selectedDimension is provided
  let widthMultiplier = 1;
  if (ctx.selectedDimension && rule.parameterOptions && rule.parameterOptions.length > 0) {
    const opt = rule.parameterOptions.find(
      o => o.optionLabel === ctx.selectedDimension || o.optionValue === ctx.selectedDimension
    );
    if (opt && opt.multiplierMap) {
      // General width multiplier or item specific
      const firstVal = Object.values(opt.multiplierMap)[0];
      if (typeof firstVal === 'number') {
        widthMultiplier = firstVal;
      }
    }
  }

  const rows: EvaluatedTakeoffRow[] = [];

  for (const sub of rule.subitems) {
    // 1. Skip if optional subitem was unselected
    if (sub.optional && ctx.optionalItemIds && !ctx.optionalItemIds.includes(sub.id)) {
      continue;
    }

    // Special check for Tuberia PVC optional checkbox
    const subDescUp = sub.desc.toUpperCase();
    if (subDescUp.includes('TUBERIA') && sub.optional && !ctx.incluirTuberia) {
      continue;
    }

    // 2. Check for Detalle Overrides (rule_item_overrides)
    let desc = sub.desc;
    let unit = sub.unit;
    let baseQty: string | number = sub.qty;
    let formula = sub.formula || '';

    if (rule.overrides && rule.overrides.length > 0) {
      const override = rule.overrides.find(
        ov => ov.ruleItemId === sub.id && ov.detalleCode.toUpperCase() === effectiveDetalle
      );
      if (override) {
        if (override.overrideDescripcion) desc = override.overrideDescripcion;
        if (override.overrideUnit) unit = override.overrideUnit;
        if (override.overrideQty) baseQty = override.overrideQty;
        if (override.overrideFormula) formula = override.overrideFormula;
      }
    }

    // 3. Check for specific parameter option multiplier
    let itemMultiplier = widthMultiplier;
    if (ctx.selectedDimension && rule.parameterOptions) {
      const opt = rule.parameterOptions.find(
        o => o.optionLabel === ctx.selectedDimension || o.optionValue === ctx.selectedDimension
      );
      if (opt?.multiplierMap && opt.multiplierMap[sub.id] !== undefined) {
        const val = opt.multiplierMap[sub.id];
        itemMultiplier = typeof val === 'number' ? val : parseFloat(String(val)) || 1;
      }
    }

    // 4. Calculate Quantity & METRADO OT
    let calculatedQty: number | string = baseQty;
    let metradoOt = '';

    const vars = {
      count,
      qty: typeof baseQty === 'number' ? baseQty : parseFloat(String(baseQty)) || 1,
      length: cableLengthNum > 0 ? cableLengthNum : count,
      widthMultiplier: itemMultiplier
    };

    if (formula) {
      const evalResult = evaluateFormula(formula, vars);
      if (evalResult !== null) {
        calculatedQty = evalResult;
        metradoOt = String(evalResult);
      } else {
        // Dynamic formula text (e.g. "1c/3m")
        metradoOt = formula;
      }
    } else if (typeof baseQty === 'number') {
      calculatedQty = baseQty * count;
      metradoOt = '';
    }

    // If Cable 4/0 or Length specified
    if (cableLengthNum > 0 && desc.toUpperCase().includes('CABLE')) {
      calculatedQty = cableLengthNum;
      metradoOt = String(cableLengthNum);
    }

    // Item Detalle Code: inherit rule detalle or use specific subitem override
    const itemDetalle = sub.subitemDetalle || effectiveDetalle;
    const material = sub.material ? componentClass(desc, sub.material) : componentClass(desc);

    rows.push({
      id: uid(),
      material,
      detalle: itemDetalle,
      desc,
      qty: calculatedQty,
      metradoOt,
      unit: getAbsoluteUnit(unit, desc),
      ruleId: rule.id
    });
  }

  return rows;
}
