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

