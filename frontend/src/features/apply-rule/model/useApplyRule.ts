import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { TakeoffItem } from '../../../entities/takeoff-item/model/types';
import { uid } from '../../../shared/lib/uid';
import { getSequentialTag, assignTagUnicoSuffixes } from '../../../entities/takeoff-item/model/tagGenerator';
import { findIntroducedTagCollision, tagCollisionMessage } from '../../../entities/takeoff-item/model/itemIdentity';
import { correlateItemsWithPartidas } from '../../../entities/partida/model/partidaMatcher';
import { useItemsStore } from '../../manage-items/model/useItemsStore';
import { usePackagesStore } from '../../manage-packages/model/usePackagesStore';
import { usePartidasStore } from '../../manage-partidas/model/usePartidasStore';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { useAppStore } from '../../app-config/model/useAppStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { generateRuleItemsForInstance } from './ruleCalculator';

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
  const pkgId = selPkg || (packages[0]?.id ?? '');

  const newItems: TakeoffItem[] = [];

  for (let i = 0; i < count; i++) {
    const currentTagPlano = count > 1 && baseTag ? getSequentialTag(baseTag, i) : baseTag;
    const instanceId = uid();
    const instItems = generateRuleItemsForInstance(
      currentRule,
      activeArea,
      {
        detalleCode,
        numSoportes,
        numJumpers,
        cableTrayWidth,
        incluirTuberia,
        cableLength
      },
      currentTagPlano,
      pkgId,
      planoVal,
      revVal,
      instanceId
    );
    newItems.push(...instItems);
  }

  let combined = [...items, ...newItems];

  const collision = findIntroducedTagCollision(items, combined);
  if (collision) {
    showToast(tagCollisionMessage(collision), 'warn');
    return false;
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
