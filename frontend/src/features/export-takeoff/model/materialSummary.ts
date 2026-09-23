import { TakeoffItem } from '../../../entities/takeoff-item/model/types';

export interface MaterialSummaryItem {
  desc: string;
  unit: string;
  qty: number;
}

export interface MaterialSummaryResult {
  summaryItems: MaterialSummaryItem[];
  circ40Count: number;
  circ20Count: number;
}

export function calculateMaterialSummary(items: TakeoffItem[]): MaterialSummaryResult {
  const pItems = items.filter(it => it.material === 'P');
  const summaryMap: Record<string, MaterialSummaryItem> = {};

  pItems.forEach(it => {
    const key = it.desc;
    if (!summaryMap[key]) {
      summaryMap[key] = { desc: it.desc, unit: it.unit, qty: 0 };
    }
    const num = parseFloat(it.metradoOt);
    if (!isNaN(num)) {
      summaryMap[key].qty += num;
    }
  });

  const summaryItems = Object.keys(summaryMap)
    .sort()
    .map(k => summaryMap[k]);

  const circ40Count = new Set(
    items
      .filter(it => it.desc && it.desc.includes('CABLE DESNUDO 4/0 AWG') && it.tagPlano)
      .map(it => it.tagPlano)
  ).size;

  const circ20Count = new Set(
    items
      .filter(it => it.desc && it.desc.includes('CABLE DESNUDO 2/0 AWG') && it.tagPlano)
      .map(it => it.tagPlano)
  ).size;

  return { summaryItems, circ40Count, circ20Count };
}
