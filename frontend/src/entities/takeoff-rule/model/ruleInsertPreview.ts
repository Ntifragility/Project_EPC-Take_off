import { TakeoffRule } from './types';
import { getDefaultDetalleByRule } from './seedRules';
import { getDetallesForArea } from './detalleVariants';
import { isHumedaArea } from './areaCatalog';

function shorten(desc: string, max = 42): string {
  const clean = (desc || '').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function joinItems(descs: string[], limit = 4): string {
  const names = descs.map(d => shorten(d)).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= limit) return names.join(' · ');
  return `${names.slice(0, limit).join(' · ')} +${names.length - limit} más`;
}

export function getRuleInsertPreview(rule: TakeoffRule, activeArea: string): string {
  const up = (rule.trigger || '').toUpperCase();

  if (up.includes('001/2B-X1') || up.includes('001/2B') || (rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0)) {
    const matrix = rule.cableTrayMatrix || [];
    const names = matrix.map(it => it.desc);
    return names.length > 0
      ? `Según ancho de bandeja: ${joinItems(names, 3)}`
      : 'Riel Strut + tuerca, mordaza y perno según ancho (900/600/450/300 mm)';
  }

  if (up.includes('CABLE DESNUDO 2/0')) {
    const codes = getDetallesForArea(activeArea).map(([code]) => code).slice(0, 6);
    const codeList = codes.length > 0 ? codes.join(', ') : 'según DETALLE';
    return `Cable 2/0, tubería y accesorios del DETALLE que elijas (${codeList})`;
  }

  if (up.includes('CABLE DESNUDO 4/0')) {
    return isHumedaArea(activeArea)
      ? '008/3A: cable, cinta, tierra, tubería opcional. 008/3B: + cemento GEM'
      : '167/G1: cable desnudo 4/0, cinta amarilla y tierra de cultivo';
  }

  if (up.includes('BARRA POT')) {
    return isHumedaArea(activeArea)
      ? 'Barra + soportes/terminales según DETALLE 010/17A o 010/17B'
      : '1 ítem BARRA POT (detalle 166A)';
  }

  if (up.includes('BARRA INST')) {
    return isHumedaArea(activeArea)
      ? 'Barra + aislador y herrajes según DETALLE 010/17C o 010/17D'
      : 'BARRA INST + aislador de resina (detalle 166C)';
  }

  const names = (rule.subitems || []).map(s => s.desc);
  const list = joinItems(names, 4);
  const detalle = getDefaultDetalleByRule(rule.trigger, activeArea) || rule.detalle || '';
  if (list && detalle) return `${detalle}: ${list}`;
  if (list) return list;
  return detalle ? `Detalle ${detalle}` : 'Sin ítems configurados';
}
