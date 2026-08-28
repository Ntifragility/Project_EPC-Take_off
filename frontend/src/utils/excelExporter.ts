import { TakeoffItem, PackageGroup } from '../types/takeoff';
import { isCountable } from './calculations';
import * as XLSX from 'xlsx';

export function exportTakeoffExcel(items: TakeoffItem[], packages: PackageGroup[], section = 'pat'): void {
  if (items.length === 0) return;

  const headers = [
    'PARTIDA',
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

  const data = items.map(it => {
    let metradoOtVal: number | string = '';
    if (it.metradoOt !== undefined && it.metradoOt !== null && String(it.metradoOt).trim() !== '') {
      const num = Number(it.metradoOt);
      metradoOtVal = !isNaN(num) ? num : it.metradoOt;
    }

    return {
      'PARTIDA': it.partida || 'NA',
      'MATERIAL': it.material || '',
      'PLANO': it.plano || '',
      'REV': it.rev || '',
      'TAG UNICO': it.tagUnico || '',
      'TAG EN PLANO': it.tagPlano || '',
      'DETALLE': it.detalle || '',
      'DESCRIPCION': it.desc || '',
      'METRADO OT': metradoOtVal,
      'UNIDAD': it.unit || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  
  // Set auto-fit column widths
  ws['!cols'] = [
    { wch: 18 }, // Partida
    { wch: 10 }, // Material
    { wch: 25 }, // Plano
    { wch: 6 },  // Rev
    { wch: 20 }, // Tag Unico
    { wch: 12 }, // Tag en plano
    { wch: 10 }, // Detalle
    { wch: 50 }, // Descripcion
    { wch: 12 }, // Metrado OT
    { wch: 8 }   // Unidad
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Metrado');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `metrado_${dateStr}`;
  const userFileName = window.prompt('Ingresa el nombre del archivo Excel a exportar:', defaultName);

  if (userFileName === null) return; // User cancelled export

  let finalFileName = userFileName.trim() || defaultName;
  if (!finalFileName.toLowerCase().endsWith('.xlsx')) {
    finalFileName += '.xlsx';
  }

  XLSX.writeFile(wb, finalFileName);
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

  // Group items by unique tagPlano (preserving original insertion order)
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

    // 1. Detalle: take from first item with detalle
    const itemWithDetalle = groupItems.find(i => i.detalle && i.detalle.trim() !== '');
    if (itemWithDetalle) {
      detalle = itemWithDetalle.detalle.trim();
    }

    // 2. Cable length: find primary cable item (not jumper)
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
      // For non-cable rules (POZO, SOLDADURA, BARRA): take primary item or first item
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

    // 3. Tuberia length: find tuberia item
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

    // 4. Jumpers count:
    // Check items with unit 'c/jumper' or desc containing 'JUMPER'
    const jumperAccessory = groupItems.find(i => {
      const unitUp = (i.unit || '').toUpperCase();
      const descUp = i.desc.toUpperCase();
      return unitUp.includes('JUMPER') || (descUp.includes('TERMINAL') && descUp.includes('JUMPER'));
    });

    const jumperCable = groupItems.find(i => i.desc.toUpperCase().includes('JUMPER'));

    if (jumperAccessory && typeof jumperAccessory.qty === 'number' && jumperAccessory.qty > 0) {
      // In detalleVariants, jumper accessory has qty = 2 * numJumpers
      jumpers = Math.round(jumperAccessory.qty / 2);
    } else if (jumperCable) {
      const num = parseFloat(String(jumperCable.qty || jumperCable.metradoOt || '0'));
      if (num > 0) jumpers = Math.round(num);
    }

    // 5. Soportes count:
    // Look for items with unit 'soporte'
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
      // In detalleVariants, abrazadera qty = 1 * numSoportes
      soportes = Math.round(soporteAbrazadera.qty);
    } else if (soporteBarra && typeof soporteBarra.qty === 'number' && soporteBarra.qty > 0) {
      // In barra variants, SOPORTE TIPO OMEGA qty = 2 * numSoportes
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

export function exportTagSummaryExcel(items: TakeoffItem[], defaultFileName?: string): void {
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

  const data = summaryRows.map(r => ({
    'TAG': r.tag,
    'LONGITUD_CABLE': r.longitudCable,
    'LONGITUD_TUBERIA': r.longitudTuberia,
    'DETALLE': r.detalle,
    'JUMPERS': r.jumpers,
    'SOPORTES': r.soportes
  }));

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });

  ws['!cols'] = [
    { wch: 15 }, // TAG
    { wch: 18 }, // LONGITUD_CABLE
    { wch: 20 }, // LONGITUD_TUBERIA
    { wch: 15 }, // DETALLE
    { wch: 12 }, // JUMPERS
    { wch: 12 }  // SOPORTES
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen_TAG');

  const dateStr = new Date().toISOString().slice(0, 10);
  const baseName = defaultFileName || `resumen_tags_${dateStr}`;
  const userFileName = window.prompt('Ingresa el nombre del archivo Excel a exportar:', baseName);

  if (userFileName === null) return;

  let finalFileName = userFileName.trim() || baseName;
  if (!finalFileName.toLowerCase().endsWith('.xlsx')) {
    finalFileName += '.xlsx';
  }

  XLSX.writeFile(wb, finalFileName);
}

