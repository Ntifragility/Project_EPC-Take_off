import { parseTakeoffCsv } from '../../../shared/lib/csvParser';
import { downloadTableXlsx } from '../../../shared/lib/excelTemplates';
import { correlateItemsWithPartidas } from '../../../entities/partida/model/partidaMatcher';
import { useItemsStore } from '../../manage-items/model/useItemsStore';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { usePackagesStore } from '../../manage-packages/model/usePackagesStore';
import { usePartidasStore } from '../../manage-partidas/model/usePartidasStore';
import { useAppStore } from '../../app-config/model/useAppStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';

export function executeImportExcel(csvText: string) {
  const { items, customPlano, customRev, setItems, saveUndoSnapshot } = useItemsStore.getState();
  const { rules } = useRulesStore.getState();
  const { selPkg, packages } = usePackagesStore.getState();
  const { partidas } = usePartidasStore.getState();
  const { activeArea, section } = useAppStore.getState();
  const { showToast } = useUIStore.getState();

  const pkgId = selPkg || packages[0]?.id || 'p1';
  saveUndoSnapshot();

  const { newItems, addedCount, rejectedRows } = parseTakeoffCsv(
    csvText,
    rules,
    pkgId,
    customPlano,
    customRev,
    items,
    activeArea
  );

  // If there are rejected rows, generate and download an Excel report
  if (rejectedRows && rejectedRows.length > 0) {
    const reportHeaders = ['FILA_EXCEL', 'PLANO', 'TAG', 'LONGITUD_CABLE', 'LONGITUD_TUBERIA', 'DETALLE', 'JUMPERS', 'MOTIVO_RECHAZO'];
    const reportRows = rejectedRows.map(r => [
      r.fila,
      r.plano || '',
      r.tag,
      r.longitudCable,
      r.longitudTuberia,
      r.detalle,
      r.jumpers,
      r.motivo
    ] as (string | number)[]);
    const reportWidths = [12, 22, 12, 16, 18, 12, 10, 55];

    void downloadTableXlsx({
      sheetName: 'Filas_Rechazadas',
      tableName: 'RECHAZADAS',
      headers: reportHeaders,
      rows: reportRows,
      widths: reportWidths,
      fileName: 'filas_rechazadas_metrado.xlsx'
    });
  }

  const correlatedItems = correlateItemsWithPartidas(newItems, partidas, activeArea);
  setItems(correlatedItems, section);

  if (addedCount > 0 && rejectedRows.length > 0) {
    showToast(
      `Se agregaron ${addedCount} ítems. ${rejectedRows.length} fila(s) rechazada(s) - reporte descargado.`,
      'warn'
    );
  } else if (addedCount > 0) {
    showToast(`Se importaron ${addedCount} ítems exitosamente`, 'success');
  } else if (rejectedRows.length > 0) {
    showToast(
      `No se pudo importar ninguna fila. ${rejectedRows.length} error(es) - reporte descargado.`,
      'warn'
    );
  }
}
