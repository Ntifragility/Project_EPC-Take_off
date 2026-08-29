import { TakeoffItem, TakeoffRule, PackageGroup, SectionType, PartidaRecord } from '../types/takeoff';
import { SEED_RULES, SEED_CANALIZADO_RULES } from '../data/seedRules';

export function getStorageKey(name: string, section: SectionType): string {
  return section === 'pat' ? `epc-${name}` : `epc-canalizado-${name}`;
}

export function loadStoredItems(section: SectionType): TakeoffItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey('items', section));
    return raw ? JSON.parse(raw) : [];
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
  try {
    const raw = localStorage.getItem(getStorageKey('rules', section));
    if (raw) {
      const parsed: TakeoffRule[] = JSON.parse(raw);
      return parsed.map(r => {
        const up = r.trigger.toUpperCase().trim();
        if (
          up === 'SOLDADURA T 4/0 - 2/0' ||
          up === 'SOLDADURA T 4/0  - 2/0' ||
          up === 'SOLDADURA T 4/0-2/0' ||
          up === 'SOLDADURA T 4/0 -2/0'
        ) {
          return {
            ...r,
            trigger: 'SOLDADURA T 4/0 -2/0',
            detalle: '008/4T2',
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
            detalle: '008/4T1',
            tagPrefix: 'T'
          };
        }
        return r;
      });
    }
  } catch (err) {
    console.error('Error loading rules from localStorage:', err);
  }
  return section === 'canalizado' ? SEED_CANALIZADO_RULES : SEED_RULES;
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

