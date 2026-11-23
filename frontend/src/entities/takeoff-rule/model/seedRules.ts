import { TakeoffRule } from './types';
import { getRuleDetallesForArea, normalizeArea } from './areaCatalog';

// ---------------------------------------------------------------------------
// Supabase-first: hardcoded seed rules were removed as a runtime source.
// The catalog loads from Supabase (`takeoff_rules`) with a localStorage
// offline cache fallback. These exports remain as deprecated stubs so older
// imports keep compiling; new code must NOT use them as data sources.
// ---------------------------------------------------------------------------

/** @deprecated Supabase SSOT — do not use as a data source. */
export const SEED_RULES: TakeoffRule[] = [];

/** @deprecated Supabase SSOT — do not use as a data source. */
export const SEED_CANALIZADO_RULES: TakeoffRule[] = [];

export function getDefaultTagPrefixByRule(trigger: string): string {
  const up = (trigger || '').toUpperCase().trim();
  if (
    up.includes('SOLDADURA T 4/0 -2/0') ||
    up.includes('SOLDADURA T 4/0-2/0') ||
    up.includes('SOLDADURA T 4/0  - 2/0') ||
    up.includes('SOLDADURA T 4/0 - 2/0')
  ) {
    return 'TT';
  }
  if (up === 'SOLDADURA T 4/0' || up.startsWith('SOLDADURA T 4/0')) {
    return 'T';
  }
  if (up.includes('SOLDADURA X')) {
    return 'X';
  }
  if (up.includes('POZO CON CAJA')) {
    return 'PC';
  }
  if (up.includes('POZO SIN CAJA') || up.includes('POZO')) {
    return 'PS';
  }
  if (up.includes('CABLE DESNUDO 4/0')) {
    return 'C';
  }
  if (up.includes('CABLE DESNUDO 2/0')) {
    return 'M';
  }
  if (up.includes('BARRA POT')) {
    return 'BP';
  }
  if (up.includes('BARRA INST')) {
    return 'BI';
  }
  if (up.includes('001/2B-X1') || up.includes('001/2B')) {
    return 'SE';
  }
  return '';
}

export function getDefaultDetalleByRule(trigger: string, activeArea = 'AREA SECA'): string {
  const up = (trigger || '').toUpperCase().trim();
  if (up.includes('CABLE DESNUDO 2/0')) return 'ND';
  return getRuleDetallesForArea(trigger, normalizeArea(activeArea))[0] || '';
}

export function getRuleCatalogDetalles(
  trigger: string,
  activeArea = 'AREA SECA',
  fallbackDetalle = ''
): string[] {
  return getRuleDetallesForArea(trigger, normalizeArea(activeArea), fallbackDetalle);
}
