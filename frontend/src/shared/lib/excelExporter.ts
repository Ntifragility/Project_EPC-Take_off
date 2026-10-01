import { TakeoffItem, PackageGroup } from '../../entities/takeoff-item/model/types';
import { downloadTableXlsx } from './excelTemplates';

export async function exportTakeoffExcel(items: TakeoffItem[], packages: PackageGroup[], section = 'pat', fileNamePrompt?: string): Promise<void> {
  if (items.length === 0) return;

  const headers = [
    'N°',
    'PARTIDAS SICME',
    'PARTIDA BALANCE',
    'MATERIAL',
    'PLANO',
    'REV',
    'TAG UNICO',
    'TAG EN PLANO',
    'DETALLE',
    'DESCRIPCION',
    'METRADO OT',
    'UNIDAD'
  ];

  const rows = items.map((it, idx) => {
    let metradoOtVal: number | string = '';
    if (it.metradoOt !== undefined && it.metradoOt !== null && String(it.metradoOt).trim() !== '') {
      const num = Number(it.metradoOt);
      metradoOtVal = !isNaN(num) ? num : it.metradoOt;
    }

    return [
      idx + 1,
      it.partida || 'NA',
      it.partidaBalance || 'NA',
      it.material || '',
      it.plano || '',
      it.rev || '',
      it.tagUnico || '',
      it.tagPlano || '',
      it.detalle || '',
      it.desc || '',
      metradoOtVal,
      it.unit || ''
    ] as (string | number)[];
  });

  const widths = [6, 18, 18, 10, 25, 6, 20, 12, 10, 50, 12, 8];

  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `metrado_${dateStr}`;
  const userFileName = fileNamePrompt !== undefined ? fileNamePrompt : window.prompt('Ingresa el nombre del archivo Excel a exportar:', defaultName);

  if (userFileName === null) return;

  let finalFileName = (userFileName && userFileName.trim()) || defaultName;
  if (!finalFileName.toLowerCase().endsWith('.xlsx')) {
    finalFileName += '.xlsx';
  }

  await downloadTableXlsx({
    sheetName: 'Metrado',
    tableName: 'METRADO',
    headers,
    rows,
    widths,
    fileName: finalFileName,
    showRowStripes: false,
    rowFills: items.map(it => (it.material === 'C' ? 'FFF0F8F4' : 'FFFFFFFF'))
  });
}

export interface TagSummaryRow {
  tag: string;
  longitudCable: number | string;
  longitudTuberia: number | string;
  detalle: string;
  jumpers: number | string;
  soportes: number | string;
}

export function generateTagSummary(items: TakeoffItem[]): TagSummaryRow[] {
  if (!items || items.length === 0) return [];

  const tagGroups = new Map<string, TakeoffItem[]>();
  for (const it of items) {
    const tag = it.tagPlano ? it.tagPlano.trim() : '';
    if (!tag) continue;
    if (!tagGroups.has(tag)) {
      tagGroups.set(tag, []);
    }
    tagGroups.get(tag)!.push(it);
  }

  const summaryRows: TagSummaryRow[] = [];

  for (const [tag, groupItems] of tagGroups.entries()) {
    let longitudCable: number | string = '';
    let longitudTuberia: number | string = '';
    let detalle = '';
    let jumpers: number | string = '';
    let soportes: number | string = '';

    const itemWithDetalle = groupItems.find(i => i.detalle && i.detalle.trim() !== '');
    if (itemWithDetalle) {
      detalle = itemWithDetalle.detalle.trim();
    }

    const cableItem = groupItems.find(i => {
      const up = i.desc.toUpperCase();
      return up.includes('CABLE') && !up.includes('JUMPER') && !up.includes('AISLADO');
    });

    if (cableItem) {
      const otVal = cableItem.metradoOt !== undefined && cableItem.metradoOt !== null ? String(cableItem.metradoOt).trim() : '';
      if (otVal !== '' && otVal !== 'Var.' && otVal !== 'VAR.') {
        const num = Number(otVal);
        longitudCable = !isNaN(num) ? num : otVal;
      } else if (typeof cableItem.qty === 'number') {
        longitudCable = cableItem.qty;
      }
    } else {
      const primaryItem = groupItems.find(i => i.material === 'P') || groupItems[0];
      if (primaryItem) {
        const otVal = primaryItem.metradoOt !== undefined && primaryItem.metradoOt !== null ? String(primaryItem.metradoOt).trim() : '';
        if (otVal !== '' && otVal !== 'Var.' && otVal !== 'VAR.') {
          const num = Number(otVal);
          longitudCable = !isNaN(num) ? num : otVal;
        } else if (typeof primaryItem.qty === 'number') {
          longitudCable = primaryItem.qty;
        } else {
          longitudCable = 1;
        }
      }
    }

    const tuberiaItem = groupItems.find(i => {
      const up = i.desc.toUpperCase();
      return up.includes('TUBERIA') || up.includes('TUBERÍA');
    });

    if (tuberiaItem) {
      const otVal = tuberiaItem.metradoOt !== undefined && tuberiaItem.metradoOt !== null ? String(tuberiaItem.metradoOt).trim() : '';
      if (otVal !== '' && otVal !== 'Var.' && otVal !== 'VAR.') {
        const num = Number(otVal);
        longitudTuberia = !isNaN(num) ? num : otVal;
      } else if (typeof tuberiaItem.qty === 'number' && tuberiaItem.qty > 0) {
        longitudTuberia = tuberiaItem.qty;
      }
    }

    const jumperAccessory = groupItems.find(i => {
      const unitUp = (i.unit || '').toUpperCase();
      const descUp = i.desc.toUpperCase();
      return unitUp.includes('JUMPER') || (descUp.includes('TERMINAL') && descUp.includes('JUMPER'));
    });

    const jumperCable = groupItems.find(i => i.desc.toUpperCase().includes('JUMPER'));

    if (jumperAccessory && typeof jumperAccessory.qty === 'number' && jumperAccessory.qty > 0) {
      jumpers = Math.round(jumperAccessory.qty / 2);
    } else if (jumperCable) {
      const num = parseFloat(String(jumperCable.qty || jumperCable.metradoOt || '0'));
      if (num > 0) jumpers = Math.round(num);
    }

    const soporteAbrazadera = groupItems.find(i => {
      const unitUp = (i.unit || '').toUpperCase();
      const descUp = i.desc.toUpperCase();
      return (unitUp.includes('SOPORTE') || descUp.includes('SOPORTE')) && descUp.includes('ABRAZADERA');
    });

    const soporteBarra = groupItems.find(i => {
      const descUp = i.desc.toUpperCase();
      return descUp.includes('SOPORTE TIPO OMEGA');
    });

    const genericSoporte = groupItems.find(i => (i.unit || '').toUpperCase().includes('SOPORTE'));

    if (soporteAbrazadera && typeof soporteAbrazadera.qty === 'number' && soporteAbrazadera.qty > 0) {
      soportes = Math.round(soporteAbrazadera.qty);
    } else if (soporteBarra && typeof soporteBarra.qty === 'number' && soporteBarra.qty > 0) {
      soportes = Math.round(soporteBarra.qty / 2);
    } else if (genericSoporte && typeof genericSoporte.qty === 'number' && genericSoporte.qty > 0) {
      soportes = Math.round(genericSoporte.qty);
    }

    summaryRows.push({
      tag,
      longitudCable,
      longitudTuberia,
      detalle,
      jumpers: jumpers !== '' && jumpers !== 0 ? jumpers : '',
      soportes: soportes !== '' && soportes !== 0 ? soportes : ''
    });
  }

  return summaryRows;
}

export async function exportTagSummaryExcel(items: TakeoffItem[], defaultFileName?: string, fileNamePrompt?: string): Promise<void> {
  const summaryRows = generateTagSummary(items);
  if (summaryRows.length === 0) {
    window.alert('No hay datos en la tabla principal para generar el resumen.');
    return;
  }

  const headers = [
    'TAG',
    'LONGITUD_CABLE',
    'LONGITUD_TUBERIA',
    'DETALLE',
    'JUMPERS',
    'SOPORTES'
  ];

  const rows = summaryRows.map(r => [
    r.tag,
    r.longitudCable,
    r.longitudTuberia,
    r.detalle,
    r.jumpers,
    r.soportes
  ] as (string | number)[]);

  const widths = [15, 18, 20, 15, 12, 12];

  const dateStr = new Date().toISOString().slice(0, 10);
  const baseName = defaultFileName || `resumen_tags_${dateStr}`;
  const userFileName = fileNamePrompt !== undefined ? fileNamePrompt : window.prompt('Ingresa el nombre del archivo Excel a exportar:', baseName);

  if (userFileName === null) return;

  let finalFileName = (userFileName && userFileName.trim()) || baseName;
  if (!finalFileName.toLowerCase().endsWith('.xlsx')) {
    finalFileName += '.xlsx';
  }

  await downloadTableXlsx({
    sheetName: 'Resumen_TAG',
    tableName: 'RESUMEN_TAG',
    headers,
    rows,
    widths,
    fileName: finalFileName
  });
}
