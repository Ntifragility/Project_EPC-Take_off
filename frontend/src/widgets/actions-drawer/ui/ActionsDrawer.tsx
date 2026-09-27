import React, { useState } from 'react';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { usePackagesStore } from '../../../features/manage-packages/model/usePackagesStore';
import { exportTakeoffExcel, exportTagSummaryExcel } from '../../../shared/lib/excelExporter';
import { consolidateAccessories } from '../../../entities/takeoff-item/model/itemAggregation';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { AddPanel } from '../../add-panel/ui/AddPanel';

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
  const { packages } = usePackagesStore();
  const requestFitTable = useUIStore(state => state.requestFitTable);

  const handleExport = () => {
    const exportItems = accessoryViewMode === 'join' ? consolidateAccessories(items) : items;
    void exportTakeoffExcel(exportItems, packages, section);
  };

  const handleSummary = () => {
    void exportTagSummaryExcel(items);
  };

  const handleClear = () => {
    if (window.confirm('¿Seguro que deseas limpiar todos los datos locales de la pantalla?')) {
      clearCache(section);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="tools-trigger"
        onClick={() => setOpen(true)}
        title="Metadatos e ingreso, exportar y acciones de tabla"
      >
        ☰ Panel
      </button>

      {open && (
        <div className="actions-backdrop" onClick={() => setOpen(false)}>
          <aside
            className="tools-panel"
            onClick={e => e.stopPropagation()}
          >
            <div className="actions-drawer-head">
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
                className="actions-drawer-close"
                onClick={() => setOpen(false)}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {tab === 'metadatos' && (
              <AddPanel onCollapseSidebar={() => setOpen(false)} />
            )}

            {tab === 'acciones' && (
              <div className="tools-acciones">
                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">EXPORTAR</div>
                  <button
                    type="button"
                    className="actions-drawer-btn"
                    onClick={handleExport}
                    title="Exportar la tabla completa de metrado a Excel"
                  >
                    Exportar Excel
                  </button>
                  <button
                    type="button"
                    className="actions-drawer-btn"
                    onClick={handleSummary}
                    title="Exportar tabla resumen 6 columnas a Excel"
                  >
                    Resumen Excel
                  </button>
                </div>

                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">CONSUMIBLES</div>
                  <div className="mode-toggle" style={{ width: '100%' }}>
                    <button
                      type="button"
                      className={`mode-btn ${accessoryViewMode === 'separated' ? 'active' : ''}`}
                      onClick={() => setAccessoryViewMode('separated')}
                      title="Mostrar consumibles en filas separadas"
                      style={{ flex: 1 }}
                    >
                      SEPARADOS
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${accessoryViewMode === 'join' ? 'active' : ''}`}
                      onClick={() => setAccessoryViewMode('join')}
                      title="Consolidar consumibles idénticos por TAG"
                      style={{ flex: 1 }}
                    >
                      UNIDOS
                    </button>
                  </div>
                  <div className="actions-drawer-hint">
                    {accessoryViewMode === 'join'
                      ? '● Unidos: accesorios y jumpers consolidados por TAG'
                      : '● Separados: accesorios en líneas independientes'}
                  </div>
                </div>

                <div className="actions-drawer-group">
                  <div className="actions-drawer-label">PANTALLA</div>
                  <button
                    type="button"
                    className="actions-drawer-btn"
                    onClick={() => {
                      requestFitTable();
                      setOpen(false);
                    }}
                    title="Encoge o estira las columnas para que la tabla quepa completa"
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
                    title="Limpiar Datos Locales de la Pantalla"
                  >
                    Limpiar Data
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
};
