import React from 'react';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { isSupabaseConfigured } from '../../../shared/api/supabase';
import { executeSyncBductosToDatabase, executeSyncToDatabase } from '../../../features/sync-cloud/model/useCloudSync';
import { ToolsPanel } from '../../actions-drawer/ui/ActionsDrawer';
import { useBductoStore } from '../../../features/generate-bducto/model/useBductoStore';
import { rememberRestoreAnchor, RESTORE_BUTTON_ID } from '../../../shared/ui/windowMotion';

export interface HeaderProps {
  onOpenSummaryModal: () => void;
  onOpenAreaModal: () => void;
  onOpenTagSummaryModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSummaryModal,
  onOpenAreaModal,
  onOpenTagSummaryModal
}) => {
  const { section, tab, theme, activeArea, setSection, setTab, toggleTheme } = useAppStore();
  const { items, undoSnapshot, undoLastAction } = useItemsStore();
  const bductoRows = useBductoStore(state => state.rows);
  const bductoUndoSnapshot = useBductoStore(state => state.undoSnapshot);
  const undoBducto = useBductoStore(state => state.undoLastAction);
  const promptMinimized = useBductoStore(state => state.promptMinimized);
  const restoreArmed = useBductoStore(state => state.restoreArmed);
  const setPromptMinimized = useBductoStore(state => state.setPromptMinimized);
  const undoDisabled = section === 'bductos' ? !bductoUndoSnapshot : !undoSnapshot;
  const showUndo = section === 'bductos' || Boolean(undoSnapshot);
  const { isSyncing, showToast } = useUIStore();

  const hasSupabase = isSupabaseConfigured();

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          EPC TAKEOFF
        </div>

        {/* Active Area Selector Badge */}
        <button
          onClick={onOpenAreaModal}
          className="btn-ghost"
          title="Haga clic para alternar entre Área Seca y Área Húmeda"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '11.5px',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
          <span>{activeArea === 'AREA HUMEDA' ? 'ÁREA HÚMEDA' : 'ÁREA SECA'}</span>
          <span style={{ fontSize: '8px', opacity: 0.8, marginLeft: '2px' }}>▼</span>
        </button>

        <nav className="nav" aria-label="Metrados">
          <button
            className={`nav-tab ${section === 'pat' && tab === 'takeoff' ? 'active' : ''}`}
            data-section="pat"
            onClick={() => {
              setSection('pat');
              setTab('takeoff');
            }}
          >
            PAT
          </button>
          <button
            className={`nav-tab ${section === 'canalizado' && tab === 'takeoff' ? 'active' : ''}`}
            data-section="canalizado"
            onClick={() => {
              setSection('canalizado');
              setTab('takeoff');
            }}
          >
            CANALIZADO
          </button>
          <button
            className={`nav-tab ${section === 'bductos' && tab === 'takeoff' ? 'active' : ''}`}
            data-section="bductos"
            style={{ marginRight: 12 }}
            onClick={() => {
              setSection('bductos');
              setTab('takeoff');
            }}
          >
            BDUCTOS
          </button>
          {section !== 'bductos' && (
            <button
              className={`nav-tab ${tab === 'rules' ? 'active' : ''}`}
              onClick={() => setTab('rules')}
            >
              REGLAS
            </button>
          )}
          <button
            className={`nav-tab ${tab === 'packages' ? 'active' : ''}`}
            onClick={() => setTab('packages')}
          >
            PARTIDAS
          </button>
          {section !== 'bductos' && (
            <button
              className="nav-tab"
              onClick={onOpenSummaryModal}
            >
              RESUMEN MAT
            </button>
          )}
          {section !== 'bductos' && (
            <button
              className="nav-tab"
              onClick={onOpenTagSummaryModal}
              title="Ver tabla resumen 6 columnas (TAG, LONGITUD_CABLE, LONGITUD_TUBERIA, DETALLE, JUMPERS, SOPORTES)"
            >
              RESUMEN TAG
            </button>
          )}
        </nav>
      </div>

      <div className="header-right">
        <button
          className="btn-icon"
          onClick={toggleTheme}
          id="theme-btn"
          title="Alternar tema Claro / Oscuro"
          aria-label="Alternar tema Claro / Oscuro"
        >
          {theme === 'light' ? '☾' : '☀'}
        </button>

        {section === 'bductos' && (promptMinimized || restoreArmed) && (
          <button
            type="button"
            id={RESTORE_BUTTON_ID}
            className="btn-icon bducto-restore-btn"
            onClick={() => {
              const button = document.getElementById(RESTORE_BUTTON_ID);
              if (button) rememberRestoreAnchor(button.getBoundingClientRect());
              setPromptMinimized(false);
            }}
            title="Restaurar el tramo"
            aria-label="Restaurar el tramo"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.25" y="2.25" width="13.5" height="11.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M1.25 5.25h13.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        )}

        {showUndo && (
          <button
            type="button"
            className="btn-ghost"
            disabled={undoDisabled}
            onClick={() => {
              const undone = section === 'bductos' ? undoBducto() : undoLastAction(section);
              if (undone) showToast('Acción deshecha', 'info');
            }}
            title="Deshacer la última acción agregada o modificada"
          >
            Deshacer
          </button>
        )}

        <button
          className="btn-save-db"
          onClick={() => (section === 'bductos' ? executeSyncBductosToDatabase() : executeSyncToDatabase())}
          disabled={isSyncing}
          title={
            !hasSupabase
              ? 'Configura VITE_SUPABASE_URL en .env para guardar directamente en BD'
              : section === 'bductos'
                ? 'Depositar las filas de BDUCTOS y el catálogo de curvas en Supabase'
                : 'Depositar/Añadir los datos de la pantalla a Supabase (main_PAT_table)'
          }
        >
          {isSyncing ? 'Guardando...' : 'Guardar en BD'}
        </button>

        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--mo)',
            color: '#ffffff',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '4px 8px',
            borderRadius: '2px',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
          id="item-count"
        >
          {section === 'bductos' ? bductoRows.length : items.length} ítems
        </span>

        <ToolsPanel />
      </div>
    </header>
  );
};
