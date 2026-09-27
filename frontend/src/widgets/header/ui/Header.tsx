import React from 'react';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { isSupabaseConfigured } from '../../../shared/api/supabase';
import { executeSyncToDatabase } from '../../../features/sync-cloud/model/useCloudSync';
import { ToolsPanel } from '../../actions-drawer/ui/ActionsDrawer';

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
  const { items } = useItemsStore();
  const { isSyncing } = useUIStore();

  const hasSupabase = isSupabaseConfigured();

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          EPC TAKEOFF
        </div>

        <div className="section-switch" aria-label="Especialidad activa">
          <button
            className={section === 'pat' ? 'active' : ''}
            data-section="pat"
            onClick={() => setSection('pat')}
          >
            PAT
          </button>
          <button
            className={section === 'canalizado' ? 'active' : ''}
            data-section="canalizado"
            onClick={() => setSection('canalizado')}
          >
            CANALIZADO
          </button>
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

        <nav className="nav">
          <button
            className={`nav-tab ${tab === 'takeoff' ? 'active' : ''}`}
            onClick={() => setTab('takeoff')}
          >
            METRADO
          </button>
          <button
            className={`nav-tab ${tab === 'rules' ? 'active' : ''}`}
            onClick={() => setTab('rules')}
          >
            REGLAS
          </button>
          <button
            className={`nav-tab ${tab === 'packages' ? 'active' : ''}`}
            onClick={() => setTab('packages')}
          >
            PARTIDAS
          </button>
          <button
            className="nav-tab"
            onClick={onOpenSummaryModal}
          >
            RESUMEN MAT
          </button>
          <button
            className="nav-tab"
            onClick={onOpenTagSummaryModal}
            title="Ver tabla resumen 6 columnas (TAG, LONGITUD_CABLE, LONGITUD_TUBERIA, DETALLE, JUMPERS, SOPORTES)"
          >
            RESUMEN TAG
          </button>
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

        <button
          className="btn-primary"
          style={{
            background: '#ffffff',
            color: '#107c41',
            fontWeight: 700,
            opacity: isSyncing ? 0.7 : 1,
            cursor: isSyncing ? 'wait' : 'pointer'
          }}
          onClick={() => executeSyncToDatabase()}
          disabled={isSyncing}
          title={
            hasSupabase
              ? 'Depositar/Añadir los datos de la pantalla a Supabase (main_PAT_table)'
              : 'Configura VITE_SUPABASE_URL en .env para guardar directamente en BD'
          }
        >
          {isSyncing ? 'Sincronizando...' : '💾 Guardar en BD'}
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
          {String(items.length).padStart(5, '0')} ítems
        </span>

        <ToolsPanel />
      </div>
    </header>
  );
};
