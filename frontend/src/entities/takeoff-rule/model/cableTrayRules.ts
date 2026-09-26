import { CableTrayMatrixItem } from './types';

export const CABLE_TRAY_WIDTHS = ['900 mm', '600 mm', '450 mm', '300 mm'] as const;
export type CableTrayWidth = (typeof CABLE_TRAY_WIDTHS)[number];

export const DEFAULT_CABLE_TRAY_MATRIX: CableTrayMatrixItem[] = [
  {
    id: 'ct-1',
    desc: 'RIEL PREFORMADO STRUT 41X41 MM, ACERO INOXIDABLE 316',
    unit: 'm',
    material: 'P',
    w900: '1.20',
    w600: '0.76',
    w450: '0.61',
    w300: '0.46'
  },
  {
    id: 'ct-2',
    desc: 'TUERCA CON RESORTE 1/2",  ACERO INOXIDABLE 316',
    unit: 'und',
    material: 'C',
    w900: '2',
    w600: '2',
    w450: '2',
    w300: '2'
  },
  {
    id: 'ct-3',
    desc: 'MORDAZA DE FIJACION ESCALERILLA, 3/8" X 2 1/4", ACERO INOXIDABLE 316',
    unit: 'und',
    material: 'C',
    w900: '2',
    w600: '2',
    w450: '2',
    w300: '2'
  },
  {
    id: 'ct-4',
    desc: 'PERNO MAQUINADO,  1/2" Ø X 1" CABEZA REDONDA 13 UNC Y DOS ARANDELAS (PLANA Y PRESION), ACERO INOXIDABLE 316',
    unit: 'und',
    material: 'C',
    w900: '2',
    w600: '2',
    w450: '2',
    w300: '2'
  }
];

export const DETALLE_001_2B_X1_ITEMS = DEFAULT_CABLE_TRAY_MATRIX;

export function getCableTrayMatrixValue(item: CableTrayMatrixItem, widthInput: string): number | string {
  const w = (widthInput || '').trim().toLowerCase();
  if (w.includes('900') || w === '1') return item.w900;
  if (w.includes('600') || w === '2') return item.w600;
  if (w.includes('450') || w === '3') return item.w450;
  if (w.includes('300') || w === '4') return item.w300;
  return item.w600;
}

export function getCableTrayStrutLength(widthInput: string): number {
  const w = (widthInput || '').trim().toLowerCase();
  if (w.includes('900') || w === '1') return 1.20;
  if (w.includes('600') || w === '2') return 0.76;
  if (w.includes('450') || w === '3') return 0.61;
  if (w.includes('300') || w === '4') return 0.46;
  return 0.76; // Default standard width is 600 mm
}
