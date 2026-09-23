import { MaterialType } from './types';
import { SectionType } from '../../../shared/types/common';

export function getAbsoluteUnit(rawUnit: string, desc: string): string {
  const u = (rawUnit || '').trim().toLowerCase();
  const d = (desc || '').toUpperCase();
  if (u === 'm' || u === 'metro' || u === 'metros') return 'm';
  if (u === 'm3' || u === 'm³') return 'm3';
  if (u === 'kg' || u === 'kilos' || u === 'kilogramos') return 'kg';
  if (u === 'und' || u === 'u' || u === 'unid' || u === 'unidad') return 'und';
  if (d.includes('CABLE') || d.includes('CINTA') || d.includes('TUBERIA') || d.includes('STRUT')) return 'm';
  if (d.includes('TIERRA')) return 'm3';
  if (d.includes('CEMENTO')) return 'kg';
  return 'und';
}

export function isPrimaryMaterial(desc: string): MaterialType {
  const d = (desc || '').toUpperCase();
  const primaryList = [
    'CABLE DESNUDO 4/0 AWG',
    'CABLE DESNUDO 2/0 AWG',
    'CABLE AISLADO',
    'TUBERIA',
    'TUBERÍA',
    'BARRA',
    'RIEL PREFORMADO STRUT',
    'RIEL STRUT',
    'BANDEJA',
    'ESCALERILLA'
  ];
  return primaryList.some(p => d.includes(p)) ? 'P' : 'C';
}

export function getPItemPriority(desc: string): number {
  const d = (desc || '').toUpperCase();
  if (d.includes('CABLE DESNUDO')) return 1;
  if (d.includes('TUBERIA') || d.includes('TUBERÍA')) return 2;
  if (d.includes('CABLE AISLADO') || d.includes('JUMPER')) return 3;
  if (d.includes('BARRA')) return 4;
  if (d.includes('RIEL') || d.includes('STRUT')) return 5;
  return 99;
}

export function isCountable(desc: string, section: SectionType): boolean {
  if (section === 'canalizado') return true;
  const d = (desc || '').toUpperCase();
  if (
    d.includes('CABLE') ||
    d.includes('TUBERIA') ||
    d.includes('TUBERÍA') ||
    d.includes('CINTA') ||
    d.includes('TIERRA') ||
    d.includes('CEMENTO') ||
    d.includes('RIEL') ||
    d.includes('STRUT')
  ) {
    return false;
  }
  return true;
}
