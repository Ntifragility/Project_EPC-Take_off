export const CABLE_TRAY_WIDTHS = ['900 mm', '600 mm', '450 mm', '300 mm'] as const;
export type CableTrayWidth = (typeof CABLE_TRAY_WIDTHS)[number];

export const DETALLE_001_2B_X1_ITEMS = [
  {
    desc: 'RIEL PREFORMADO STRUT 41X41 MM, ACERO INOXIDABLE 316',
    unit: 'm',
    material: 'P' as const,
    lengths: {
      '900 mm': 1.20,
      '600 mm': 0.76,
      '450 mm': 0.61,
      '300 mm': 0.46
    }
  },
  {
    desc: 'TUERCA CON RESORTE 1/2",  ACERO INOXIDABLE 316',
    unit: 'und',
    qty: 2,
    material: 'C' as const
  },
  {
    desc: 'MORDAZA DE FIJACION ESCALERILLA, 3/8" X 2 1/4", ACERO INOXIDABLE 316',
    unit: 'und',
    qty: 2,
    material: 'C' as const
  },
  {
    desc: 'PERNO MAQUINADO,  1/2" Ø X 1" CABEZA REDONDA 13 UNC Y DOS ARANDELAS (PLANA Y PRESION), ACERO INOXIDABLE 316',
    unit: 'und',
    qty: 2,
    material: 'C' as const
  }
];

export function getCableTrayStrutLength(widthInput: string): number {
  const w = (widthInput || '').trim().toLowerCase();
  if (w.includes('900') || w === '1') return 1.20;
  if (w.includes('600') || w === '2') return 0.76;
  if (w.includes('450') || w === '3') return 0.61;
  if (w.includes('300') || w === '4') return 0.46;
  return 0.76; // Default standard width is 600 mm
}
