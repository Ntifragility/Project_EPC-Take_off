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

/**
 * Finds the matching Partida item code for a given takeoff item.
 * Matches based on AREA + (DESCRIPCIÓN or FORECAST DESCRIPTION).
 * Returns 'NA' if no match is found.
 */
export function findMatchingPartidaItem(
  item: TakeoffItem,
  partidas: PartidaRecord[],
  activeArea?: string
): string {
  if (!partidas || partidas.length === 0) {
    return 'NA';
  }

  const itemDescNorm = normalizeMatchString(item.desc);
  const itemPlanoArea = extractAreaFromPlanoOrText(item.plano);
  const activeAreaNorm = normalizeMatchString(activeArea);
  const activeAreaExtract = extractAreaFromPlanoOrText(activeArea);

  for (const p of partidas) {
    const pAreaNorm = normalizeMatchString(p.area);
    const pDescNorm = normalizeMatchString(p.descripcion);
    const pForecastNorm = normalizeMatchString(p.forecastDesc);

    const isAreaMatch =
      !pAreaNorm ||
      pAreaNorm === itemPlanoArea ||
      pAreaNorm === activeAreaNorm ||
      pAreaNorm === activeAreaExtract ||
      (itemPlanoArea && itemPlanoArea.includes(pAreaNorm)) ||
      (activeAreaNorm && activeAreaNorm.includes(pAreaNorm));

    if (isAreaMatch) {
      const isDescMatch =
        (pDescNorm && pDescNorm === itemDescNorm) ||
        (pForecastNorm && pForecastNorm === itemDescNorm) ||
        (pForecastNorm && itemDescNorm.includes(pForecastNorm)) ||
        (pDescNorm && itemDescNorm.includes(pDescNorm));

      if (isDescMatch && p.item) {
        return p.item.trim();
      }
    }
  }

  for (const p of partidas) {
    const pDescNorm = normalizeMatchString(p.descripcion);
    const pForecastNorm = normalizeMatchString(p.forecastDesc);

    if (
      (pDescNorm && pDescNorm === itemDescNorm) ||
      (pForecastNorm && pForecastNorm === itemDescNorm)
    ) {
      if (p.item) return p.item.trim();
    }
  }

  return 'NA';
}

/**
 * Correlates all items in the takeoff table with the partidas master list.
 * Updates item.partida on each item.
 */
export function correlateItemsWithPartidas(
  items: TakeoffItem[],
  partidas: PartidaRecord[],
  activeArea?: string
): TakeoffItem[] {
  if (!items || items.length === 0) return [];

  return items.map(it => {
    const matchedCode = findMatchingPartidaItem(it, partidas, activeArea);
    return {
      ...it,
      partida: matchedCode || 'NA'
    };
  });
}
