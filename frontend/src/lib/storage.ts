import { TakeoffItem, TakeoffRule, PackageGroup, SectionType } from '../types/takeoff';
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
    if (raw) return JSON.parse(raw);
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

