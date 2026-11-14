export const STORAGE_KEYS = {
  ACTIVE_SECTION: 'epc-active-section',
  ACTIVE_AREA: 'epc-active-area',
  SUBAREA_HUMEDA: 'epc-subarea-humeda',
  THEME: 'epc-theme',
  PLANO: 'epc-plano',
  REV: 'epc-rev',
  ACCESSORY_VIEW_MODE: 'epc-accessory-view-mode',
  PARTIDAS_MASTER: 'epc-partidas-master',
} as const;

export const DEFAULT_PLANO = '';
export const DEFAULT_REV = '0';
export const DEFAULT_SECTION = 'pat';
export const DEFAULT_AREA = 'AREA SECA';
export const DEFAULT_SUBAREA_HUMEDA = 'NO_CORROSIVO' as const;
export const DEFAULT_THEME = 'light';
