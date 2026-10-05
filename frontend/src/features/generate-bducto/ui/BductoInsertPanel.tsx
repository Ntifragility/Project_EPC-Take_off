import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useBductoStore } from '../model/useBductoStore';
import { BductoSource } from '../../../entities/bducto/model/types';
import { parseBductoSheet } from '../../../entities/bducto/model/expandBducto';
import { downloadBductoTemplate } from '../model/exportBductosExcel';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';

function decodeCsv(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
}

function csvSeparator(text: string): ',' | ';' {
  const header = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = header.match(/;/g)?.length ?? 0;
  const commas = header.match(/,/g)?.length ?? 0;
  return semicolons > commas ? ';' : ',';
}

async function sheetMatrix(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer();
  const csv = file.name.toLowerCase().endsWith('.csv');
  const text = csv ? decodeCsv(buffer) : '';
  const workbook = csv
    ? XLSX.read(text, { type: 'string', FS: csvSeparator(text) })
    : XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
}

type InsertMode = 'import' | 'manual';

function tramoSubtitle(source: BductoSource): string {
  const ends = [source.desde, source.hasta].filter(part => part?.trim()).join(' → ');
  const place = [source.plano, Number.isFinite(source.quantity) ? `${source.quantity} m` : ''].filter(Boolean).join(' · ');
  return [ends, place].filter(Boolean).join(' · ');
}

export const BductoInsertPanel: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const importExcel = useBductoStore(state => state.importExcel);
  const sources = useBductoStore(state => state.sources);
  const rows = useBductoStore(state => state.rows);
  const setWizard = useBductoStore(state => state.setWizard);
  const showToast = useUIStore(state => state.showToast);
  const [mode, setMode] = useState<InsertMode>('import');

  const pending = sources.filter(source => !rows.some(row => row.sourceId === source.id));
  const generated = sources.filter(source => rows.some(row => row.sourceId === source.id));

  const startManualDraft = useBductoStore(state => state.startManualDraft);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const matrix = await sheetMatrix(file);
      if (matrix.length === 0) {
        showToast('El archivo no tiene hojas', 'warn');
        return;
      }
      const { rows: parsedRows, errors } = parseBductoSheet(matrix);
      if (parsedRows.length === 0) {
        showToast(errors[0] || 'El archivo no tiene tramos', 'warn');
        return;
      }
      const imported = importExcel(parsedRows);
      if (imported.added === 0) {
        showToast('Esos tramos ya están cargados. No los volví a agregar.', 'warn');
        return;
      }
      if (errors.length > 0) showToast(`${imported.added} tramos. ${errors[0]}`, 'warn');
      else if (imported.skipped > 0) showToast(`${imported.added} tramos nuevos. ${imported.skipped} ya estaban cargados.`, 'success');
      else showToast(`${imported.added} tramos listos para completar`, 'success');
      onDone?.();
    } catch {
      showToast('No pude leer el archivo', 'warn');
    }
  };

  return (
    <div className="sidebar-panel">
      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === 'import' ? 'active' : ''}`}
          onClick={() => setMode('import')}
        >
          Importar
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          Manual
        </button>
      </div>

      {mode === 'import' && (
        <div className="panel-section">
          <div className="panel-section-hd">
            <span className="panel-section-title">Importar tramos</span>
          </div>
          <p className="actions-drawer-hint">
            Columnas DESDE, HASTA, PLANO, TAG EN PLANO y Quantity. La plantilla trae una fila de ejemplo: reemplázala.
          </p>
        </div>
      )}

      {mode === 'manual' && (
        <div className="panel-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel-section-title">Tramo manual</div>
          <p className="actions-drawer-hint">
            Abre el asistente, escribe el tramo y completa terminal, curvas y elevación.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '4px' }}
            onClick={() => { startManualDraft(); onDone?.(); }}
          >
            + Agregar tramo
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="panel-section">
          <div className="panel-section-hd">
            <span className="panel-section-title">Pendientes</span>
          </div>
          <p className="actions-drawer-hint">
            Los tramos ya generados se quedan en la tabla. Los que faltan siguen aquí.
          </p>
          <button type="button" className="btn btn-primary" style={{ marginTop: '4px' }} onClick={() => { setWizard(pending); onDone?.(); }}>
            Completar {pending.length} tramo{pending.length === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {generated.length > 0 && (
        <div className="panel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="panel-section-hd">
            <span className="panel-section-title">Editar tramos</span>
          </div>
          <div className="bducto-tramo-list">
            {generated.map(source => (
              <button
                key={source.id}
                type="button"
                className="bducto-tramo-btn"
                onClick={() => { setWizard([source]); onDone?.(); }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--tx-hd)' }}>{source.tagEnPlano}</div>
                <div className="rule-insert-preview">{tramoSubtitle(source)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        <label
          className="btn btn-secondary"
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: '11.5px',
            cursor: 'pointer',
            textAlign: 'center',
            margin: 0
          }}
          title="Subir Excel o CSV con DESDE, HASTA, PLANO, TAG EN PLANO y Quantity"
        >
          <span>Importar</span>
          <input
            type="file"
            accept=".xlsx,.xlsb,.xls,.xlsm,.csv,text/csv"
            style={{ display: 'none' }}
            aria-label="Importar Excel o CSV de tramos"
            onChange={event => void upload(event)}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '7px 10px', fontSize: '11.5px' }}
          onClick={() => void downloadBductoTemplate()}
          title="Descargar plantilla con DESDE, HASTA, PLANO, TAG EN PLANO y Quantity"
        >
          Plantilla
        </button>
      </div>
    </div>
  );
};
