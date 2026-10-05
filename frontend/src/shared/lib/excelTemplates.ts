import ExcelJS from 'exceljs';

export interface TableXlsxOptions {
  sheetName: string;
  tableName: string;
  headers: string[];
  /** Row values aligned with headers; empty string for blank cells. */
  rows: (string | number)[][];
  widths?: number[];
  fileName: string;
  /** Excel banded rows. Off when the caller paints its own fills. */
  showRowStripes?: boolean;
  /** ARGB fills for data rows (index 0 = first body row). */
  rowFills?: string[];
}

/**
 * Shared helper: every .xlsx this app generates goes through here so all
 * of them carry a real Excel Table (filter buttons + banded rows).
 */
export async function downloadTableXlsx(opts: TableXlsxOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EPC TakeOff';
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName);
  ws.addTable({
    name: opts.tableName,
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: opts.showRowStripes !== false },
    columns: opts.headers.map(h => ({ name: h, filterButton: true })),
    rows: opts.rows
  });
  if (opts.rowFills && opts.rowFills.length > 0) {
    opts.rowFills.forEach((argb, i) => {
      const row = ws.getRow(i + 2);
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb }
        };
      });
    });
  }
  if (opts.widths) {
    ws.columns.forEach((col, idx) => {
      col.width = opts.widths![idx] || 14;
    });
  }
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers download of the official Metrado template Excel file.
 * Each sheet carries a real Excel Table (ListObject) with filter buttons,
 * so users can sort/filter and append rows that inherit the table format.
 * (SheetJS Community cannot write Tables, hence ExcelJS here. Parsing of
 * uploaded files still uses SheetJS and only relies on the header names.)
 */
export async function downloadMetradoTemplateXlsx(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EPC TakeOff';
  wb.created = new Date();

  // Sheet 1: Mechas (Cable 2/0 AWG + Tubería + Accesorios)
  const wsMechas = wb.addWorksheet('1. MECHAS (2-0 AWG)');
  wsMechas.addTable({
    name: 'MECHAS',
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      { name: 'PLANO', filterButton: true },
      { name: 'TAG', filterButton: true },
      { name: 'LONGITUD_CABLE', filterButton: true },
      { name: 'LONGITUD_TUBERIA', filterButton: true },
      { name: 'DETALLE', filterButton: true },
      { name: 'JUMPERS', filterButton: true },
      { name: 'SOPORTES', filterButton: true }
    ],
    rows: [
      ['010/17A', 'M01', 12.5, 2.0, 'ND', '', 1],
      ['010/17A', 'M02', 8.0, 1.5, '008/05', 2, 2],
      ['010/17A', 'M03', 15.0, 3.0, '010/01', '', ''],
      ['010/17A', 'M04', 6.0, '', '151', '', '']
    ]
  });
  wsMechas.columns.forEach((col, idx) => {
    col.width = [14, 10, 17, 18, 12, 10, 11][idx] || 14;
  });
  wsMechas.views = [{ state: 'frozen', ySplit: 1 }];

  // Sheet 2: Cables 4/0, Barras, Soldaduras y Pozos
  const wsOtros = wb.addWorksheet('2. CABLES_BARRAS_OTROS');
  wsOtros.addTable({
    name: 'CABLES_BARRAS_OTROS',
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      { name: 'PLANO', filterButton: true },
      { name: 'TAG', filterButton: true },
      { name: 'CANTIDAD_O_LONGITUD', filterButton: true },
      { name: 'DETALLE', filterButton: true },
      { name: 'SOPORTES', filterButton: true }
    ],
    rows: [
      ['010/17A', 'C01', 45.0, '167/G1', ''],
      ['010/17A', 'BP01', 1.0, '010/17A', 1],
      ['010/17A', 'BI01', 1.0, '010/17C', 2],
      ['010/17A', 'TT01', 1.0, '', ''],
      ['010/17A', 'T01', 1.0, '', ''],
      ['010/17A', 'X01', 1.0, '', ''],
      ['010/17A', 'PC01', 1.0, '', ''],
      ['010/17A', 'PS01', 1.0, '', '']
    ]
  });
  wsOtros.columns.forEach((col, idx) => {
    col.width = [14, 10, 22, 14, 11][idx] || 14;
  });
  wsOtros.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_metrado_epc.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
