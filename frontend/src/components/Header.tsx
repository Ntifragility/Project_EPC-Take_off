import React from 'react';
import { useTakeoff } from '../context/TakeoffContext';
import { exportTakeoffExcel } from '../utils/excelExporter';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  onOpenSummaryModal: () => void;
  onOpenAreaModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSummaryModal, onOpenAreaModal }) => {
  const {
    section,
    tab,
    theme,
    activeArea,
    items,
    packages,
    isSyncing,
    setSection,
    setTab,
    toggleTheme,
    clearCache,
    syncToDatabase
  } = useTakeoff();

  const handleExport = () => {
    exportTakeoffExcel(items, packages, section);
  };

  const hasSupabase = isSupabaseConfigured();

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className="logo">
          EPC TAKEOFF <span id="active-section-name">{section.toUpperCase()}</span>
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
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
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
            RESUMEN MAT P
          </button>
        </nav>
      </div>

      <div className="header-right">
        <button
          className="btn-icon"
          style={{ fontSize: '11px', fontWeight: 600, padding: '5px 10px', fontFamily: 'var(--mo)' }}
          onClick={toggleTheme}
          id="theme-btn"
          title="Toggle Dark/Light Theme"
        >
          {theme === 'light' ? 'DARK' : 'LIGHT'}
        </button>

        <button
          className="btn-ghost"
          style={{ padding: '5px 12px', fontSize: '11px' }}
          onClick={clearCache}
          title="Restablecer Datos Locales"
        >
          RESTABLECER
        </button>

        <button
          className="btn-primary"
          style={{
            padding: '5px 12px',
            fontSize: '11px',
            opacity: isSyncing ? 0.7 : 1,
            cursor: isSyncing ? 'wait' : 'pointer'
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
            whiteSpace: 'nowrap'
          }}
          id="item-count"
        >
          {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </span>

        <button className="btn-export" onClick={handleExport}>
          EXPORTAR EXCEL
        </button>
      </div>
    </header>
  );
};

