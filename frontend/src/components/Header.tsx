import React from 'react';
import { useTakeoff } from '../context/TakeoffContext';
import { exportTakeoffCsv } from '../utils/csvExporter';
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
    exportTakeoffCsv(items, packages, section);
  };

  const hasSupabase = isSupabaseConfigured();

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className="logo">
          ⚡ EPC TAKEOFF <span id="active-section-name">{section.toUpperCase()}</span>
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
            gap: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '6px',
            border: '1px solid var(--am)',
            background: 'rgba(255,166,0,0.12)',
            color: 'var(--am)',
            cursor: 'pointer',
            letterSpacing: '0.5px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--am)';
            (e.currentTarget as HTMLElement).style.color = '#000';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,166,0,0.12)';
            (e.currentTarget as HTMLElement).style.color = 'var(--am)';
          }}
        >
          <span>{activeArea === 'AREA HUMEDA' ? '💧 ÁREA HÚMEDA' : '🏜️ ÁREA SECA'}</span>
          <span style={{ fontSize: '10px' }}>▼</span>
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
            style={{ color: 'var(--am)' }}
            onClick={onOpenSummaryModal}
          >
            RESUMEN MAT P
          </button>
        </nav>
      </div>

      <div className="header-right">
        <button
          className="btn-icon"
          style={{ fontSize: '16px', padding: '3px 8px', borderColor: 'transparent' }}
          onClick={toggleTheme}
          id="theme-btn"
          title="Toggle Dark/Light Theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <button
          className="btn-ghost"
          style={{ padding: '4px 10px', fontSize: '11px' }}
          onClick={clearCache}
          title="Restablecer Datos Locales"
        >
          🗑️ RESTABLECER
        </button>

        <button
          className="btn-primary"
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            background: hasSupabase ? '#388bfd' : '#238636',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
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
          {isSyncing ? '⏳ SINCRONIZANDO...' : '☁️ GUARDAR EN BD'}
        </button>

        <span className="item-count" id="item-count">
          {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </span>

        <button className="btn-export" onClick={handleExport}>
          ↓ EXPORTAR CSV
        </button>
      </div>
    </header>
  );
};

