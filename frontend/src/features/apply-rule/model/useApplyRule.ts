import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { TakeoffItem, MaterialType } from '../../../entities/takeoff-item/model/types';
import { AreaType, SectionType } from '../../../shared/types/common';
import { uid } from '../../../shared/lib/uid';
import { generateTagUnico, getSequentialTag, assignTagUnicoSuffixes } from '../../../entities/takeoff-item/model/tagGenerator';
import { findIntroducedTagCollision, tagCollisionMessage, normalizeTagPlano } from '../../../entities/takeoff-item/model/itemIdentity';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';
import { DEFAULT_CABLE_TRAY_MATRIX, getCableTrayMatrixValue } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { getCalculatedVariantItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { applyDetalleVariant, applyBarraPotDetalleVariant } from '../../../entities/takeoff-rule/model/ruleExpander';
import { evaluateMetradoFormula, lengthVar, shownFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { correlateItemsWithPartidas } from '../../../entities/partida/model/partidaMatcher';
import { useItemsStore } from '../../manage-items/model/useItemsStore';
import { usePackagesStore } from '../../manage-packages/model/usePackagesStore';
import { usePartidasStore } from '../../manage-partidas/model/usePartidasStore';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { useAppStore } from '../../app-config/model/useAppStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';

export function executeApplyRule(
  rule: TakeoffRule,
  params: {
    count: number;
    baseTag: string;
    detalleCode: string;
    numSoportes?: number;
    numJumpers?: number;
    cableTrayWidth?: string;
    incluirTuberia?: boolean;
    cableLength?: string;
  }
): boolean {
  const { count, baseTag, detalleCode } = params;
  const numSoportes = params.numSoportes ?? 1;
  const numJumpers = params.numJumpers ?? 1;
  const cableTrayWidth = params.cableTrayWidth || '600 mm';
  const incluirTuberia = params.incluirTuberia === true;
  const cableLength = (params.cableLength || '').trim().replace(',', '.');

  const { items, customPlano, customRev, setItems, saveUndoSnapshot } = useItemsStore.getState();
  const { selPkg, packages } = usePackagesStore.getState();
  const { partidas } = usePartidasStore.getState();
  const { activeArea, section } = useAppStore.getState();
  const { showToast } = useUIStore.getState();

  // Fetch freshest rule from store if available to avoid stale closures
  const currentRule = useRulesStore.getState().rules.find(r => r.id === rule.id) || rule;

  const planoVal = (customPlano || '').toUpperCase();
  const revVal = (customRev || '').toUpperCase();
  const pkgId = selPkg || packages[0]?.id || 'p1';
  const upTrigger = currentRule.trigger.toUpperCase();
  const isCableTrayRule =
    Boolean(currentRule.cableTrayMatrix && currentRule.cableTrayMatrix.length > 0) ||
    currentRule.id === 'r-001-2b-x1' ||
    currentRule.id === 'r-001-2b-x1-can' ||
    upTrigger.includes('001/2B-X1') ||
    (detalleCode && detalleCode.toUpperCase().includes('001/2B-X1')) ||
    Boolean(currentRule.detalle && currentRule.detalle.toUpperCase().includes('001/2B-X1'));

  const newItems: TakeoffItem[] = [];

  if (isCableTrayRule) {
    const matrix =
      currentRule.cableTrayMatrix && currentRule.cableTrayMatrix.length > 0
        ? currentRule.cableTrayMatrix
        : DEFAULT_CABLE_TRAY_MATRIX;

    const itemsConfig = matrix.map(it => {
      const val = getCableTrayMatrixValue(it, cableTrayWidth);
      const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
      const isP = it.material === 'P' || it.unit === 'm' || it.desc.toUpperCase().includes('RIEL') || it.desc.toUpperCase().includes('ESTRUCT');
      return {
        desc: it.desc,
        qty: numVal,
        unit: it.unit,
        material: (it.material || (isP ? 'P' : 'C')) as MaterialType,
        metradoOt: String(val)
      };
    });

    for (let i = 0; i < count; i++) {
      const currentTagPlano = count > 1 && baseTag ? getSequentialTag(baseTag, i) : baseTag;
      itemsConfig.forEach(it => {
        newItems.push({
          id: uid(),
          pkgId,
          desc: it.desc,
          qty: it.qty,
          unit: it.unit,
          notes: '',
          ruleId: currentRule.id,
          material: it.material,
          plano: planoVal,
          rev: revVal,
          tagUnico: generateTagUnico(planoVal, currentTagPlano, it.material),
          tagPlano: currentTagPlano,
          detalle: detalleCode || currentRule.detalle || '001/2B-X1',
          metradoOt: it.metradoOt
        });
      });
    }
  } else {
    for (let i = 0; i < count; i++) {
      const currentTagPlano = count > 1 && baseTag ? getSequentialTag(baseTag, i) : baseTag;

      if (currentRule.id === 'r2' && activeArea === 'AREA HUMEDA') {
        const variantItems = getCalculatedVariantItems(
          detalleCode,
          'AREA HUMEDA',
          numSoportes,
          numJumpers
        );
        variantItems.forEach(v => {
          const isVar = v.qty === 'Var.' || String(v.ot).toUpperCase() === 'VAR.';
          const mat = componentClass(v.desc, v.material);
          const finalQty = typeof v.qty === 'number' ? v.qty : 1;
          const finalOt = isVar ? '' : (v.ot !== undefined ? String(v.ot) : '');

          newItems.push({
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
            tagUnico: generateTagUnico(planoVal, currentTagPlano, mat),
            tagPlano: currentTagPlano,
            detalle: detalleCode,
            metradoOt: finalOt
          });
        });
      } else {
        currentRule.subitems
          .filter(s => !(currentRule.id === 'r1' && s.desc.toUpperCase().includes('CEMENTO GEM') && detalleCode.toUpperCase() !== '008/3B'))
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
          newItems.push({
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
            tagUnico: generateTagUnico(planoVal, currentTagPlano, mat),
            tagPlano: currentTagPlano,
            detalle: detalleCode,
            metradoOt
          });
        });

        if (
          currentRule.id === 'r1' &&
          detalleCode.toUpperCase() === '008/3B' &&
          !newItems.some(it => it.tagPlano === currentTagPlano && it.desc.toUpperCase().includes('CEMENTO GEM'))
        ) {
          newItems.push({
            id: uid(),
            pkgId,
            desc: 'CEMENTO GEM (11.3 Kg x bls)',
            qty: (() => {
              const cemento = evaluateMetradoFormula('length * 11.3 / 2', { length: lengthVar(cableLength) });
              return cemento.status === 'value' ? cemento.number : 'length * 11.3 / 2';
            })(),
            unit: 'kg',
            notes: '',
            ruleId: currentRule.id,
            material: 'C',
            plano: planoVal,
            rev: revVal,
            tagUnico: '',
            tagPlano: currentTagPlano,
            detalle: detalleCode,
            metradoOt: (() => {
              const cemento = evaluateMetradoFormula('length * 11.3 / 2', { length: lengthVar(cableLength) });
              return cemento.status === 'value' ? cemento.text : '';
            })()
          });
        }

        const detalleUp = detalleCode.toUpperCase();
        if (
          currentRule.id === 'r1' &&
          (detalleUp === '008/3A' || detalleUp === '008/3B') &&
          incluirTuberia &&
          !newItems.some(it => it.tagPlano === currentTagPlano && it.desc.toUpperCase().includes('TUBERIA'))
        ) {
          newItems.push({
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
            tagUnico: generateTagUnico(planoVal, currentTagPlano, 'P'),
            tagPlano: currentTagPlano,
            detalle: detalleCode,
            metradoOt: ''
          });
        }
      }
    }
  }

  const tagToInstance = new Map<string, string>();
  newItems.forEach(it => {
    const tag = normalizeTagPlano(it.tagPlano || '');
    if (!tagToInstance.has(tag)) tagToInstance.set(tag, uid());
    it.instanceId = tagToInstance.get(tag);
  });

  let combined = [...items, ...newItems];

  const collision = findIntroducedTagCollision(items, combined);
  if (collision) {
    showToast(tagCollisionMessage(collision), 'warn');
    return false;
  }

  if (currentRule.id === 'r1' || currentRule.id === 'r2') {
    tagToInstance.forEach((instanceId, tag) => {
      const sibs = combined.filter(i => i.instanceId === instanceId);
      const tItem = sibs.find(i => i.desc.toUpperCase().includes('TUBERIA') || i.desc.toUpperCase().includes('TUBERÍA'));
      const cItem = sibs.find(i => i.desc.toUpperCase().includes('CABLE') && !i.desc.toUpperCase().includes('JUMPER'));
      const tOt = tItem ? tItem.metradoOt : '';
      const cOt = cItem ? cItem.metradoOt : '';
      combined = applyDetalleVariant(
        combined,
        tag,
        pkgId,
        detalleCode,
        numSoportes,
        numJumpers,
        tOt,
        cOt,
        false,
        instanceId
      );
    });
  }

  if ((currentRule.id === 'r8' || currentRule.id === 'r9' || upTrigger.includes('BARRA')) && (activeArea === 'AREA HUMEDA' || detalleCode.startsWith('010/17'))) {
    tagToInstance.forEach((instanceId, tag) => {
      combined = applyBarraPotDetalleVariant(combined, tag, pkgId, detalleCode, numSoportes, false, instanceId);
    });
  }

  saveUndoSnapshot();
  combined = assignTagUnicoSuffixes(combined);
  combined = correlateItemsWithPartidas(combined, partidas, activeArea);

  setItems(combined, section);
  const added = Math.max(0, combined.length - items.length);
  const addedLabel = added === 1 ? '1 ítem agregado' : `${added} ítems agregados`;
  showToast(addedLabel, 'success');
  return true;
}
