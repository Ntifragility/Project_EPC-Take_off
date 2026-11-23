import { TakeoffItem, PackageGroup } from '../../entities/takeoff-item/model/types';
import { TakeoffRule } from '../../entities/takeoff-rule/model/types';
import type { SupabaseDetalleVariantRecord } from '../api/supabase';
import { SectionType } from '../types/common';
import { PartidaRecord } from '../../entities/partida/model/types';
import { attachCatalogAreas } from '../../entities/takeoff-rule/model/areaCatalog';
import { cleanNumericString } from './cleanNumber';

export function getStorageKey(name: string, section: SectionType): string {
  if (section === 'pat') return `epc-${name}`;
  if (section === 'canalizado') return `epc-canalizado-${name}`;
  return `epc-bductos-${name}`;
}

const VARIANTS_CACHE_KEY = 'epc-detalle-variants-cache';

/** Offline cache of the last authoritative Supabase detalle_variants snapshot. */
export function loadStoredVariants(): SupabaseDetalleVariantRecord[] {
  try {
    const raw = localStorage.getItem(VARIANTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as SupabaseDetalleVariantRecord[];
    }
  } catch (err) {
    console.error('Error loading detalle variants from localStorage:', err);
  }
  return [];
}

export function saveStoredVariants(variants: SupabaseDetalleVariantRecord[]): void {
  try {
    localStorage.setItem(VARIANTS_CACHE_KEY, JSON.stringify(variants));
  } catch (err) {
    console.error('Error saving detalle variants to localStorage:', err);
  }
}

export function loadStoredItems(section: SectionType): TakeoffItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey('items', section));
    const parsed: TakeoffItem[] = raw ? JSON.parse(raw) : [];
    return parsed.map(it => ({
      ...it,
      metradoOt: it.metradoOt ? cleanNumericString(String(it.metradoOt)) : it.metradoOt
    }));
  } catch (err) {
    console.error('Error loading items from localStorage:', err);
    return [];
  }
}

export function saveStoredItems(section: SectionType, items: TakeoffItem[]): void {
  try {
    localStorage.setItem(getStorageKey('items', section), JSON.stringify(items));
  } catch (err) {
    console.error('Error saving items to localStorage:', err);
  }
}

export function loadStoredRules(section: SectionType): TakeoffRule[] {
  // Supabase-first: localStorage is ONLY an offline cache of the last
  // authoritative Supabase snapshot. Empty cache = empty catalog (no seeds).
  if (section === 'bductos') return [];
  try {
    const raw = localStorage.getItem(getStorageKey('rules', section));
    if (raw) {
      const parsed: TakeoffRule[] = JSON.parse(raw);
      const mapped = parsed.map(r => {
        const up = (r.trigger || '').toUpperCase().trim();
        if (
          up === 'SOLDADURA T 4/0 - 2/0' ||
          up === 'SOLDADURA T 4/0  - 2/0' ||
          up === 'SOLDADURA T 4/0-2/0' ||
          up === 'SOLDADURA T 4/0 -2/0'
        ) {
          return {
            ...r,
            trigger: 'SOLDADURA T 4/0 -2/0',
            tagPrefix: 'TT',
            subitems: r.subitems.map(s =>
              s.desc.toUpperCase().includes('SOLDADURA T 4/0')
                ? { ...s, desc: 'SOLDADURA T 4/0 -2/0' }
                : s
            )
          };
        }
        if (up === 'SOLDADURA T 4/0') {
          return {
            ...r,
            tagPrefix: 'TT'
          };
        }
        if (up === 'CABLE DESNUDO 4/0 AWG') {
          const hasCementoGem = r.subitems.some(s => s.desc.toUpperCase().includes('CEMENTO GEM'));
          const normalizedSubitems = r.subitems.map(s => {
            const desc = s.desc.toUpperCase();
            if (desc.includes('TIERRA DE CULTIVO')) return { ...s, qty: 'length x 0.375 x 0.5' };
            if (desc.includes('CEMENTO GEM')) return { ...s, qty: 'length x 11.3 / 2' };
            return { ...s, qty: 'Var.' };
          });
          return {
            ...r,
            subitems: hasCementoGem
              ? normalizedSubitems
              : [
                  ...normalizedSubitems,
                  { id: 's3b', desc: 'CEMENTO GEM (11.3 Kg x bls)', qty: 'length x 11.3 / 2', unit: 'kg' }
                ]
          };
        }
        return r;
      });

      // DET.001/2B-X1 lives in CANALIZADO only: drop any legacy copy stored under PAT.
      const cleaned = section === 'canalizado' ? mapped : mapped.filter(r => r.id !== 'r-001-2b-x1');
      return cleaned.map(r => attachCatalogAreas(r));
    }
  } catch (err) {
    console.error('Error loading rules from localStorage:', err);
  }
  return [];
}

export function saveStoredRules(section: SectionType, rules: TakeoffRule[]): void {
  try {
    localStorage.setItem(getStorageKey('rules', section), JSON.stringify(rules));
  } catch (err) {
    console.error('Error saving rules to localStorage:', err);
  }
}

export function loadStoredPackages(section: SectionType): PackageGroup[] {
  try {
    const raw = localStorage.getItem(getStorageKey('packages', section));
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading packages from localStorage:', err);
  }
  return [{ id: 'p1', name: 'GENERAL' }];
}

export function saveStoredPackages(section: SectionType, packages: PackageGroup[]): void {
  try {
    localStorage.setItem(getStorageKey('packages', section), JSON.stringify(packages));
  } catch (err) {
    console.error('Error saving packages to localStorage:', err);
  }
}

export function loadStoredPartidas(): PartidaRecord[] {
  try {
    const raw = localStorage.getItem('epc-partidas-master');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading partidas from localStorage:', err);
  }
  return [];
}

export function saveStoredPartidas(partidas: PartidaRecord[]): void {
  try {
    localStorage.setItem('epc-partidas-master', JSON.stringify(partidas));
  } catch (err) {
    console.error('Error saving partidas to localStorage:', err);
  }
}
