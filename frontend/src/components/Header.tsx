import React from 'react';
import { useTakeoff } from '../context/TakeoffContext';
import { exportTakeoffCsv } from '../utils/csvExporter';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  onOpenSummaryModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSummaryModal }) => {
  const {
    section,
    tab,
    theme,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
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

