import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { TakeoffItem, MaterialType } from '../../../entities/takeoff-item/model/types';
import { AreaType, SectionType } from '../../../shared/types/common';
import { uid } from '../../../shared/lib/uid';
import { generateTagUnico, getSequentialTag, assignTagUnicoSuffixes } from '../../../entities/takeoff-item/model/tagGenerator';
import { isPrimaryMaterial } from '../../../entities/takeoff-item/model/materialClassifier';
import { getCableTrayStrutLength } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { getCalculatedVariantItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { applyDetalleVariant, applyBarraPotDetalleVariant } from '../../../entities/takeoff-rule/model/ruleExpander';
import { correlateItemsWithPartidas } from '../../../entities/partida/model/partidaMatcher';
import { useItemsStore } from '../../manage-items/model/useItemsStore';
import { usePackagesStore } from '../../manage-packages/model/usePackagesStore';
import { usePartidasStore } from '../../manage-partidas/model/usePartidasStore';
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
  }
) {
  const { count, baseTag, detalleCode } = params;
  const numSoportes = params.numSoportes ?? 1;
  const numJumpers = params.numJumpers ?? 1;
  const cableTrayWidth = params.cableTrayWidth || '600 mm';

  const { items, customPlano, customRev, setItems, saveUndoSnapshot } = useItemsStore.getState();
  const { selPkg, packages } = usePackagesStore.getState();
  const { partidas } = usePartidasStore.getState();
  const { activeArea, section } = useAppStore.getState();
  const { showToast } = useUIStore.getState();

  saveUndoSnapshot();

  const planoVal = (customPlano || '').toUpperCase();
  const revVal = (customRev || '').toUpperCase();
  const pkgId = selPkg || packages[0]?.id || 'p1';
  const upTrigger = rule.trigger.toUpperCase();
  const isSoldaduraPozo = upTrigger.includes('SOLDADURA') || upTrigger.includes('POZO');
  const isPozoTrigger = upTrigger.includes('POZO');
  const isCableTrayRule =
    rule.id === 'r-001-2b-x1' ||
    rule.id === 'r-001-2b-x1-can' ||
    upTrigger.includes('001/2B-X1') ||
    (detalleCode && detalleCode.toUpperCase().includes('001/2B-X1'));

  const newItems: TakeoffItem[] = [];

  if (isCableTrayRule) {
    const strutLen = getCableTrayStrutLength(cableTrayWidth);
    const itemsConfig = [
      {
        desc: 'RIEL PREFORMADO STRUT 41X41 MM, ACERO INOXIDABLE 316',
        qty: strutLen,
        unit: 'm',
        material: 'P' as MaterialType,
        metradoOt: String(strutLen)
      },
      {
        desc: 'TUERCA CON RESORTE 1/2",  ACERO INOXIDABLE 316',
        qty: 2,
        unit: 'und',
        material: 'C' as MaterialType,
        metradoOt: '2'
      },
      {
        desc: 'MORDAZA DE FIJACION ESCALERILLA, 3/8" X 2 1/4", ACERO INOXIDABLE 316',
        qty: 2,
        unit: 'und',
        material: 'C' as MaterialType,
        metradoOt: '2'
      },
      {
        desc: 'PERNO MAQUINADO,  1/2" Ø X 1" CABEZA REDONDA 13 UNC Y DOS ARANDELAS (PLANA Y PRESION), ACERO INOXIDABLE 316',
        qty: 2,
        unit: 'und',
        material: 'C' as MaterialType,
        metradoOt: '2'
      }
    ];

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
          ruleId: rule.id,
          material: it.material,
          plano: planoVal,
          rev: revVal,
          tagUnico: generateTagUnico(planoVal, currentTagPlano, it.material),
          tagPlano: currentTagPlano,
          detalle: detalleCode || '001/2B-X1',
          metradoOt: it.metradoOt
        });
      });
    }
  } else {
    for (let i = 0; i < count; i++) {
      const currentTagPlano = count > 1 && baseTag ? getSequentialTag(baseTag, i) : baseTag;

      if (rule.id === 'r2' && activeArea === 'AREA HUMEDA') {
        const variantItems = getCalculatedVariantItems(
          detalleCode,
          'AREA HUMEDA',
          numSoportes,
          numJumpers
        );
        variantItems.forEach(v => {
          const isVar = v.qty === 'Var.' || String(v.ot).toUpperCase() === 'VAR.';
          const mat = v.material || (isPrimaryMaterial(v.desc) ? 'P' : 'C');
          const finalQty = typeof v.qty === 'number' ? v.qty : 1;
          const finalOt = isVar ? '' : (v.ot !== undefined ? String(v.ot) : '');

          newItems.push({
            id: uid(),
            pkgId,
            desc: v.desc,
            qty: finalQty,
            unit: v.unit,
            notes: '',
            ruleId: rule.id,
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
        rule.subitems
          .filter(s => !(rule.id === 'r1' && s.desc.toUpperCase().includes('CEMENTO GEM') && detalleCode.toUpperCase() !== '008/3B'))
          .forEach(s => {
          const mat = isPrimaryMaterial(s.desc) ? 'P' : 'C';
          let metradoOt = '';
          const descUp = s.desc.toUpperCase();

          if (isPozoTrigger && descUp.includes('TIERRA DE CULTIVO')) {
            metradoOt = '4.71';
          } else if (isPozoTrigger && descUp.includes('CEMENTO GEM')) {
            metradoOt = '22.6';
          } else if (isSoldaduraPozo) {
            metradoOt = '1';
          } else if (upTrigger.includes('CABLE DESNUDO 2/0 AWG')) {
            if (
              descUp.includes('TERMINAL') ||
              descUp.includes('PERNO') ||
              descUp.includes('SOLDADURA') ||
              descUp.includes('CARGA') ||
              descUp.includes('TUBERIA')
            ) {
              metradoOt = '1';
            }
          }

          if (descUp.includes('MOLDE')) {
            metradoOt = '0.0167';
          }

          newItems.push({
            id: uid(),
            pkgId,
            desc: s.desc,
            qty: s.qty,
            unit: s.unit,
            notes: '',
            ruleId: rule.id,
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
          rule.id === 'r1' &&
          detalleCode.toUpperCase() === '008/3B' &&
          !newItems.some(it => it.tagPlano === currentTagPlano && it.desc.toUpperCase().includes('CEMENTO GEM'))
        ) {
          newItems.push({
            id: uid(),
            pkgId,
            desc: 'CEMENTO GEM (11.3 Kg x bls)',
            qty: 'length x 11.3 / 2',
            unit: 'kg',
            notes: '',
            ruleId: rule.id,
            material: 'C',
            plano: planoVal,
            rev: revVal,
            tagUnico: '',
            tagPlano: currentTagPlano,
            detalle: detalleCode,
            metradoOt: ''
          });
        }
      }
    }
  }

  let combined = [...items, ...newItems];

  if (rule.id === 'r1' || rule.id === 'r2') {
    const uniqueTags = [...new Set(newItems.map(it => it.tagPlano))];
    uniqueTags.forEach(tag => {
      const sibs = combined.filter(i => i.tagPlano === tag && i.pkgId === pkgId);
      const tItem = sibs.find(i => i.desc.toUpperCase().includes('TUBERIA') || i.desc.toUpperCase().includes('TUBERÍA'));
      const cItem = sibs.find(i => i.desc.toUpperCase().includes('CABLE') && !i.desc.toUpperCase().includes('JUMPER'));
      const tOt = tItem ? tItem.metradoOt : '';
      const cOt = cItem ? cItem.metradoOt : '';
      combined = applyDetalleVariant(combined, tag, pkgId, detalleCode, numSoportes, numJumpers, tOt, cOt);
    });
  }

  if ((rule.id === 'r8' || rule.id === 'r9' || upTrigger.includes('BARRA')) && (activeArea === 'AREA HUMEDA' || detalleCode.startsWith('010/17'))) {
    const uniqueTags = [...new Set(newItems.map(it => it.tagPlano))];
    uniqueTags.forEach(tag => {
      combined = applyBarraPotDetalleVariant(combined, tag, pkgId, detalleCode, numSoportes);
    });
  }

  combined = assignTagUnicoSuffixes(combined);
  combined = correlateItemsWithPartidas(combined, partidas, activeArea);

  setItems(combined, section);
  showToast(`${newItems.length} ítems agregados`, 'success');
}
