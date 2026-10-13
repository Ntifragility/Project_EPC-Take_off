import { TakeoffRule } from './types';
import { getDefaultDetalleByRule } from './seedRules';
import {
  DYNAMIC_BARRA_INST_VARIANTS,
  DYNAMIC_BARRA_POT_VARIANTS,
  getCalculatedVariantItems,
  getDetallesForArea
} from './detalleVariants';
import { isHumedaArea } from './areaCatalog';

export interface RuleInsertContext {
  detalleCode?: string;
  numSoportes?: number;
  numJumpers?: number;
  incluirTuberia?: boolean;
}

function shorten(desc: string, max = 42): string {
  const clean = (desc || '').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function joinItems(descs: string[]): string {
  const names = descs.map(d => shorten(d)).filter(Boolean);
  if (names.length === 0) return '';
  const label = names.length === 1 ? '1 ítem' : `${names.length} ítems`;
  return `${label}: ${names.join(' · ')}`;
}

export function getRuleInsertPreview(rule: TakeoffRule, activeArea: string, context: RuleInsertContext = {}): string {
  const up = (rule.trigger || '').toUpperCase();
  const detalle = (context.detalleCode || '').trim();

  if (up.includes('001/2B-X1') || up.includes('001/2B') || (rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0)) {
    const matrix = rule.cableTrayMatrix || [];
    const names = matrix.map(it => it.desc);
    return names.length > 0
      ? `Según ancho de bandeja. ${joinItems(names)}`
      : 'Riel Strut + tuerca, mordaza y perno según ancho (900/600/450/300 mm)';
  }

  if (up.includes('CABLE DESNUDO 2/0')) {
    const variant = detalle
      ? getCalculatedVariantItems(detalle, activeArea, context.numSoportes ?? 1, context.numJumpers ?? 1)
      : [];
    if (variant.length > 0) return `${detalle}: ${joinItems(variant.map(item => item.desc))}`;
    const codes = getDetallesForArea(activeArea).map(([code]) => code).slice(0, 6);
    const codeList = codes.length > 0 ? codes.join(', ') : 'según DETALLE';
    return `Cable 2/0, tubería y accesorios del DETALLE que elijas (${codeList})`;
  }

  if (up.includes('CABLE DESNUDO 4/0') && !detalle) {
    return isHumedaArea(activeArea)
      ? '008/3A y 008/3B: cable, cinta, tierra y tubería opcional. 008/3B suma cemento GEM'
      : '167/G1: cable desnudo 4/0, cinta amarilla y tierra de cultivo';
  }

  if (up.includes('BARRA POT')) {
    const variant = detalle ? DYNAMIC_BARRA_POT_VARIANTS[detalle] : undefined;
    if (variant && variant.length > 0) return `${detalle}: ${joinItems(variant.map(item => item.desc))}`;
    return isHumedaArea(activeArea)
      ? 'Barra + soportes/terminales según DETALLE 010/17A o 010/17B'
      : '1 ítem: BARRA POT (detalle 166A)';
  }

  if (up.includes('BARRA INST')) {
    const variant = detalle ? DYNAMIC_BARRA_INST_VARIANTS[detalle] : undefined;
    if (variant && variant.length > 0) return `${detalle}: ${joinItems(variant.map(item => item.desc))}`;
    return isHumedaArea(activeArea)
      ? 'Barra + aislador y herrajes según DETALLE 010/17C o 010/17D'
      : '2 ítems: BARRA INST y aislador de resina (detalle 166C)';
  }

  const names = (rule.subitems || [])
    .filter(item => {
      if (rule.id !== 'r1') return true;
      const hiddenCemento = item.desc.toUpperCase().includes('CEMENTO GEM') && detalle.toUpperCase() !== '008/3B';
      return !hiddenCemento;
    })
    .map(item => item.desc);
  if (
    rule.id === 'r1' &&
    detalle.toUpperCase() === '008/3B' &&
    !names.some(name => name.toUpperCase().includes('CEMENTO GEM'))
  ) {
    names.push('CEMENTO GEM (11.3 Kg x bls)');
  }
  if (
    rule.id === 'r1' &&
    context.incluirTuberia &&
    (detalle.toUpperCase() === '008/3A' || detalle.toUpperCase() === '008/3B') &&
    !names.some(name => name.toUpperCase().includes('TUBERIA') || name.toUpperCase().includes('TUBERÍA'))
  ) {
    names.push('TUBERIA PVC SCH 80 Ø3/4"');
  }
  const list = joinItems(names);
  const detalleLabel = detalle || getDefaultDetalleByRule(rule.trigger, activeArea) || rule.detalle || '';
  if (list && detalleLabel) return `${detalleLabel}: ${list}`;
  if (list) return list;
  return detalleLabel ? `Detalle ${detalleLabel}` : 'Sin ítems configurados';
}
