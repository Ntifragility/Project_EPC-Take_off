import React from 'react';
import { useTakeoff } from '../context/TakeoffContext';
import { exportTakeoffExcel, exportTagSummaryExcel } from '../utils/excelExporter';
import { isSupabaseConfigured } from '../lib/supabase';
import { consolidateAccessories } from '../utils/calculations';

interface HeaderProps {
  onOpenSummaryModal: () => void;
  onOpenAreaModal: () => void;
  onOpenTagSummaryModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSummaryModal, onOpenAreaModal, onOpenTagSummaryModal }) => {
  const {
    section,
    tab,
    theme,
    activeArea,
    items,
    packages,
    isSyncing,
    accessoryViewMode,
    setSection,
    setTab,
    toggleTheme,
    clearCache,
    syncToDatabase
  } = useTakeoff();

  const handleExport = () => {
    const exportItems = accessoryViewMode === 'join' ? consolidateAccessories(items) : items;
    exportTakeoffExcel(exportItems, packages, section);
  };

  const hasSupabase = isSupabaseConfigured();

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
          title="Haga clic para alternar entre Área Seca y Área Húmeda"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            fontSize: '11px',
            fontFamily: 'var(--mo)',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid var(--b1)',
            background: 'var(--s2)',
            color: 'var(--tx)',
            cursor: 'pointer',
            letterSpacing: '0.5px',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            width: '140px',
            justifyContent: 'center',
            flexShrink: 0
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--tx)';
            (e.currentTarget as HTMLElement).style.background = 'var(--s3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--b1)';
            (e.currentTarget as HTMLElement).style.background = 'var(--s2)';
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--tx)', display: 'inline-block' }} />
          <span>{activeArea === 'AREA HUMEDA' ? 'ÁREA HÚMEDA' : 'ÁREA SECA'}</span>
          <span style={{ fontSize: '9px', opacity: 0.6 }}>▼</span>
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
            style={{ color: 'var(--mu)', fontStyle: 'normal' }}
            onClick={onOpenSummaryModal}
          >
            RESUMEN MAT
          </button>
          <button
            className="nav-tab"
            style={{ color: 'var(--am, #eab308)', fontStyle: 'normal', fontWeight: 600 }}
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
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 10px',
            fontFamily: 'var(--mo)',
            width: '56px',
            minWidth: '56px',
            maxWidth: '56px',
            textAlign: 'center',
            flexShrink: 0
          }}
          onClick={toggleTheme}
          id="theme-btn"
          title="Toggle Dark/Light Theme"
        >
          {theme === 'light' ? 'DARK' : 'LIGHT'}
        </button>

        <button
          className="btn-ghost"
          style={{
            padding: '5px 10px',
            fontSize: '11px',
            width: '115px',
            minWidth: '115px',
            maxWidth: '115px',
            textAlign: 'center',
            flexShrink: 0
          }}
          onClick={clearCache}
          title="Limpiar Datos Locales de la Pantalla"
        >
          LIMPIAR DATA
        </button>

        <button
          className="btn-primary"
          style={{
            padding: '5px 12px',
            fontSize: '11px',
            opacity: isSyncing ? 0.7 : 1,
            cursor: isSyncing ? 'wait' : 'pointer',
            width: '135px',
            minWidth: '135px',
            maxWidth: '135px',
            textAlign: 'center',
            flexShrink: 0
          }}
          onClick={syncToDatabase}
          disabled={isSyncing}
          title={
            hasSupabase
              ? 'Depositar/Añadir los datos de la pantalla a Supabase (main_PAT_table)'
              : 'Configura VITE_SUPABASE_URL en .env para guardar directamente en BD'
          }
        >
          {isSyncing ? 'SINCRONIZANDO...' : 'GUARDAR EN BD'}
        </button>

        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--mo)',
            color: 'var(--mu)',
            background: 'var(--s2)',
            border: '1px solid var(--b1)',
            padding: '3px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            width: '110px',
            minWidth: '110px',
            maxWidth: '110px',
            textAlign: 'center',
            flexShrink: 0
          }}
          id="item-count"
        >
          {String(items.length).padStart(5, '0')} ítems
        </span>

        <button
          className="btn-export"
          style={{
            width: '125px',
            minWidth: '125px',
            maxWidth: '125px',
            textAlign: 'center',
            flexShrink: 0
          }}
          onClick={handleExport}
          title="Exportar la tabla completa de metrado a Excel"
        >
          EXPORTAR EXCEL
        </button>

        <button
          className="btn-export"
          style={{
            width: '125px',
            minWidth: '125px',
            maxWidth: '125px',
            textAlign: 'center',
            flexShrink: 0,
            background: 'var(--s3)',
            border: '1px solid var(--b1)',
            color: 'var(--am, #eab308)'
          }}
          onClick={() => exportTagSummaryExcel(items)}
          title="Exportar tabla resumen 6 columnas (TAG, LONGITUD_CABLE, LONGITUD_TUBERIA, DETALLE, JUMPERS, SOPORTES) a Excel"
        >
          RESUMEN EXCEL
        </button>
      </div>
    </header>
  );
};
