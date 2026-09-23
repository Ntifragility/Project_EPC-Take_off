import * as XLSX from 'xlsx';

/**
 * Generates and triggers download of the official Metrado template Excel file.
 */
export function downloadMetradoTemplateXlsx(): void {
  // Sheet 1: Mechas (Cable 2/0 AWG + Tubería + Accesorios)
  const wsMechasData = [
    ['PLANO', 'TAG', 'LONGITUD_CABLE', 'LONGITUD_TUBERIA', 'DETALLE', 'JUMPERS', 'SOPORTES'],
    ['010/17A', 'M01', 12.5, 2.0, 'ND', '', 1],
    ['010/17A', 'M02', 8.0, 1.5, '008/05', 2, 2],
    ['010/17A', 'M03', 15.0, 3.0, '010/01', '', ''],
    ['010/17A', 'M04', 6.0, '', '151', '', '']
  ];
  const wsMechas = XLSX.utils.aoa_to_sheet(wsMechasData);

  // Sheet 2: Cables 4/0, Barras, Soldaduras y Pozos
  const wsOtrosData = [
    ['PLANO', 'TAG', 'CANTIDAD_O_LONGITUD', 'DETALLE', 'SOPORTES'],
    ['010/17A', 'C01', 45.0, '167/G1', ''],
    ['010/17A', 'BP01', 1.0, '010/17A', 1],
    ['010/17A', 'BI01', 1.0, '010/17C', 2],
    ['010/17A', 'TT01', 1.0, '', ''],
    ['010/17A', 'T01', 1.0, '', ''],
    ['010/17A', 'X01', 1.0, '', ''],
    ['010/17A', 'PC01', 1.0, '', ''],
    ['010/17A', 'PS01', 1.0, '', '']
  ];
  const wsOtros = XLSX.utils.aoa_to_sheet(wsOtrosData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMechas, '1. MECHAS (2-0 AWG)');
  XLSX.utils.book_append_sheet(wb, wsOtros, '2. CABLES_BARRAS_OTROS');
  XLSX.writeFile(wb, 'plantilla_metrado_epc.xlsx');
}
