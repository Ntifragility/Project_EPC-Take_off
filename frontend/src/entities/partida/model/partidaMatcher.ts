import { TakeoffItem } from '../../takeoff-item/model/types';
import { PartidaRecord } from './types';

/**
 * Normalizes text for reliable matching:
 * - Trims whitespace
 * - Converts to uppercase
 * - Removes accents/diacritics
 * - Normalizes multiple spaces into a single space
 */
export function normalizeMatchString(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts possible area codes from a plano or area string.
 * Example: 'P22-DA-3300-07-GL-001' -> '3300'
 */
export function extractAreaFromPlanoOrText(planoOrText: string | undefined | null): string {
  if (!planoOrText) return '';
  const clean = normalizeMatchString(planoOrText);
  const match = clean.match(/\b(\d{3,4})\b/);
  if (match) {
    return match[1];
  }
  return clean;
}

export interface PartidaMatch {
  sicme: string;
  balance: string;
}

function recordWbs(p: PartidaRecord): string {
  return (p.wbs || p.area || '').trim();
}

function recordSicme(p: PartidaRecord): string {
  return (p.partidaSicme || p.item || '').trim();
}

function recordForecast(p: PartidaRecord): string {
  return p.forecastDesc || '';
}

/**
 * Finds the matching Partida row for a given takeoff item.
 * Primary key: FORECAST DESCRIPTION == item description.
 * Secondary filter: WBS == area code extracted from the plano.
 * Returns both PARTIDA SICME and PARTIDA BALANCE.
 */
export function findMatchingPartida(
  item: TakeoffItem,
  partidas: PartidaRecord[],
  activeArea?: string
): PartidaMatch | null {
  if (!partidas || partidas.length === 0) {
    return null;
  }

  const itemDescNorm = normalizeMatchString(item.desc);
  if (!itemDescNorm) return null;
  const itemPlanoArea = extractAreaFromPlanoOrText(item.plano);
  const activeAreaNorm = normalizeMatchString(activeArea);
  const activeAreaExtract = extractAreaFromPlanoOrText(activeArea);

  const toMatch = (p: PartidaRecord): PartidaMatch => ({
    sicme: recordSicme(p) || 'NA',
    balance: (p.partidaBalance || '').trim() || 'NA'
  });

  // Pass 1: exact FORECAST DESCRIPTION + WBS match
  for (const p of partidas) {
    const pForecastNorm = normalizeMatchString(recordForecast(p));
    if (!pForecastNorm || pForecastNorm !== itemDescNorm) continue;
    const pWbsNorm = normalizeMatchString(recordWbs(p));
    const isWbsMatch =
      !pWbsNorm ||
      pWbsNorm === itemPlanoArea ||
      pWbsNorm === activeAreaNorm ||
      pWbsNorm === activeAreaExtract ||
      (itemPlanoArea && itemPlanoArea.includes(pWbsNorm)) ||
      (activeAreaNorm && activeAreaNorm.includes(pWbsNorm));
    if (isWbsMatch) return toMatch(p);
  }

  // Pass 2: exact FORECAST DESCRIPTION regardless of WBS
  for (const p of partidas) {
    const pForecastNorm = normalizeMatchString(recordForecast(p));
    if (pForecastNorm && pForecastNorm === itemDescNorm) {
      return toMatch(p);
    }
  }

  return null;
}

/**
 * Legacy single-code lookup. Kept for callers that only need SICME.
 */
export function findMatchingPartidaItem(
  item: TakeoffItem,
  partidas: PartidaRecord[],
  activeArea?: string
): string {
  return findMatchingPartida(item, partidas, activeArea)?.sicme || 'NA';
}

/**
 * Correlates all items in the takeoff table with the partidas master list.
 * Updates item.partida (SICME) and item.partidaBalance on each item.
 */
export function correlateItemsWithPartidas(
  items: TakeoffItem[],
  partidas: PartidaRecord[],
  activeArea?: string
): TakeoffItem[] {
  if (!items || items.length === 0) return [];

  return items.map(it => {
    const matched = findMatchingPartida(it, partidas, activeArea);
    return {
      ...it,
      partida: matched?.sicme || 'NA',
      partidaBalance: matched?.balance || 'NA'
    };
  });
}
