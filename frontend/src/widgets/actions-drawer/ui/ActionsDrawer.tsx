import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { usePackagesStore } from '../../../features/manage-packages/model/usePackagesStore';
import { exportTakeoffExcel, exportTagSummaryExcel } from '../../../shared/lib/excelExporter';
import { consolidateAccessories } from '../../../entities/takeoff-item/model/itemAggregation';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { AddPanel } from '../../add-panel/ui/AddPanel';
import { BductoInsertPanel } from '../../../features/generate-bducto/ui/BductoInsertPanel';
import { useBductoStore } from '../../../features/generate-bducto/model/useBductoStore';
import { exportBductosExcel, exportBductosSummaryExcel } from '../../../features/generate-bducto/model/exportBductosExcel';

type ToolsTab = 'metadatos' | 'acciones';

/**
 * Single header control (top-right) that opens Metadatos + Acciones
 * in one overlay panel.
 */
export const ToolsPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ToolsTab>('metadatos');

  const { section, accessoryViewMode, setAccessoryViewMode } = useAppStore();
  const { items, clearCache } = useItemsStore();
  const bductoRows = useBductoStore(state => state.rows);
  const bductoDetail = useBductoStore(state => state.detailView);
  const bductoAccessories = useBductoStore(state => state.accessoryView);
  const setBductoDetail = useBductoStore(state => state.setDetailView);
  const setBductoAccessories = useBductoStore(state => state.setAccessoryView);
  const clearBducto = useBductoStore(state => state.clearSources);
  const { packages } = usePackagesStore();
  const requestFitTable = useUIStore(state => state.requestFitTable);
  const showToast = useUIStore(state => state.showToast);
  const isMergedView = useUIStore(state => state.isMergedView);
  const setIsMergedView = useUIStore(state => state.setIsMergedView);

  const handleExport = () => {
    const exportItems = accessoryViewMode === 'join' ? consolidateAccessories(items) : items;
    void exportTakeoffExcel(exportItems, packages, section);
  };

  const handleSummary = () => {
    void exportTagSummaryExcel(items);
  };

  const handleClear = () => {
    if (section === 'bductos') {
      if (window.confirm('¿Seguro que deseas limpiar el metrado de BDUCTOS?')) {
        clearBducto();
        setOpen(false);
      }
      return;
    }
    if (window.confirm('¿Seguro que deseas limpiar todos los datos locales de la pantalla?')) {
      clearCache(section);
      setOpen(false);
    }
  };

  const isBductos = section === 'bductos';
  const detailMerged = isBductos ? bductoDetail === 'merged' : isMergedView;
  const accessoriesJoined = isBductos ? bductoAccessories === 'joined' : accessoryViewMode === 'join';

  const handlePanelExport = () => {
    if (isBductos) {
      if (bductoRows.length === 0) {
        showToast('No hay filas de BDUCTOS para exportar', 'warn');
        return;
      }
      void exportBductosExcel(bductoRows);
      return;
    }
    handleExport();
  };

  const handlePanelSummary = () => {
    if (isBductos) {
      if (bductoRows.length === 0) {
        showToast('No hay filas de BDUCTOS para resumir', 'warn');
        return;
      }
      void exportBductosSummaryExcel(bductoRows);
      return;
    }
    handleSummary();
  };

  const fitTable = () => {
    requestFitTable();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.classList.add('tools-panel-open');
    document.body.style.overflow = 'hidden';

    const blockBackgroundScroll = (event: WheelEvent) => {
      const panel = document.querySelector('.tools-panel');
      if (panel && panel.contains(event.target as Node)) return;
      event.preventDefault();
    };
    document.addEventListener('wheel', blockBackgroundScroll, { passive: false });

    return () => {
      document.body.classList.remove('tools-panel-open');
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('wheel', blockBackgroundScroll);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="tools-trigger"
        onClick={() => setOpen(true)}
        title="Metadatos e ingreso, exportar y acciones de tabla"
      >
        Panel
      </button>

      {open && (
        <div
          className="actions-backdrop"
          onClick={() => setOpen(false)}
          onWheel={e => e.stopPropagation()}
        >
          <aside
            className="tools-panel"
            onClick={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
          >
            <div className="modal-hd tools-panel-hd">
              <div className="tools-tabs">
                <button
                  type="button"
                  className={`tools-tab ${tab === 'metadatos' ? 'active' : ''}`}
                  onClick={() => setTab('metadatos')}
                >
                  Metadatos
                </button>
                <button
                  type="button"
                  className={`tools-tab ${tab === 'acciones' ? 'active' : ''}`}
                  onClick={() => setTab('acciones')}
                >
                  Acciones
                </button>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="tools-panel-body">
            {tab === 'metadatos' && (
              section === 'bductos'
                ? <BductoInsertPanel onDone={() => setOpen(false)} />
                : <AddPanel onCollapseSidebar={() => setOpen(false)} />
            )}

            {tab === 'acciones' && (
              <div className="tools-acciones">
                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">EXPORTAR</div>
                  <button
                    type="button"
                    className="actions-drawer-btn"
                    onClick={handlePanelExport}
                    title={isBductos ? 'Exportar la tabla de BDUCTOS a Excel' : 'Exportar la tabla completa de metrado a Excel'}
                  >
                    Exportar Excel
                  </button>
                  <button
                    type="button"
                    className="actions-drawer-btn"
                    onClick={handlePanelSummary}
                    title={isBductos ? 'Exportar el metrado sumado por descripción y diámetro' : 'Exportar tabla resumen 6 columnas a Excel'}
                  >
                    Resumen Excel
                  </button>
                </div>

                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">DETALLE</div>
                  <div className="mode-toggle">
                    <button
                      type="button"
                      className={`mode-btn ${!detailMerged ? 'active' : ''}`}
                      onClick={() => (isBductos ? setBductoDetail('separated') : setIsMergedView(false))}
                      title={isBductos ? 'Cada tubo, curva y vertical en su fila' : 'Mantener ítems separados (vista detallada)'}
                    >
                      Separado
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${detailMerged ? 'active' : ''}`}
                      onClick={() => (isBductos ? setBductoDetail('merged') : setIsMergedView(true))}
                      title={isBductos ? 'Una fila por material dentro del tramo' : 'Fusionar ítems similares de cada DETALLE en una sola fila'}
                    >
                      Consolidado
                    </button>
                  </div>
                  <div className="actions-drawer-hint">
                    {isBductos
                      ? (detailMerged
                        ? '● Consolidado: una fila por material del tramo'
                        : '● Separado: cada tubo, curva y vertical en su fila')
                      : (detailMerged
                        ? '● Consolidado: una fila por DETALLE'
                        : '● Separado: cada ítem en su propia fila')}
                  </div>
                </div>

                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">CONSUMIBLES</div>
                  <div className="mode-toggle">
                    <button
                      type="button"
                      className={`mode-btn ${!accessoriesJoined ? 'active' : ''}`}
                      onClick={() => (isBductos ? setBductoAccessories('separated') : setAccessoryViewMode('separated'))}
                      title={isBductos ? 'Terminal, unión, adaptador y cinta en su fila' : 'Mostrar consumibles en filas separadas'}
                    >
                      SEPARADOS
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${accessoriesJoined ? 'active' : ''}`}
                      onClick={() => (isBductos ? setBductoAccessories('joined') : setAccessoryViewMode('join'))}
                      title={isBductos ? 'Sumar las piezas iguales en una sola fila' : 'Consolidar consumibles idénticos por TAG'}
                    >
                      UNIDOS
                    </button>
                  </div>
                  <div className="actions-drawer-hint">
                    {isBductos
                      ? (accessoriesJoined
                        ? '● Unidos: terminal, unión, adaptador y cinta sumados'
                        : '● Separados: cada pieza en su fila')
                      : (accessoriesJoined
                        ? '● Unidos: accesorios y jumpers consolidados por TAG'
                        : '● Separados: accesorios en líneas independientes')}
                  </div>
                </div>

                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">PANTALLA</div>
                  <button
                    type="button"
                    className="actions-drawer-btn"
                    onClick={fitTable}
                    title="Vuelve a encajar las columnas al ancho actual"
                  >
                    Ajustar a pantalla
                  </button>
                </div>

                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">DATOS</div>
                  <button
                    type="button"
                    className="actions-drawer-btn danger"
                    onClick={handleClear}
                    title={isBductos ? 'Limpiar el metrado de BDUCTOS' : 'Limpiar Datos Locales de la Pantalla'}
                  >
                    Limpiar Data
                  </button>
                </div>
              </div>
            )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
