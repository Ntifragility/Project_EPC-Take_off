import React from 'react';
import { Redo2, Undo2, LogOut, ShieldCheck, User, UserPlus } from 'lucide-react';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { isSupabaseConfigured } from '../../../shared/api/supabase';
import { executeSyncBductosToDatabase, executeSyncToDatabase } from '../../../features/sync-cloud/model/useCloudSync';
import { ToolsPanel } from '../../actions-drawer/ui/ActionsDrawer';
import { useBductoStore } from '../../../features/generate-bducto/model/useBductoStore';
import { useCurveCatalogHistory } from '../../../features/generate-bducto/model/curveCatalogHistory';
import { rememberRestoreAnchor, RESTORE_BUTTON_ID, RULE_RESTORE_BUTTON_ID } from '../../../shared/ui/windowMotion';
import { SectionType, TabType } from '../../../shared/types/common';
import { useAuthStore } from '../../../features/auth/model/useAuthStore';
import { UserProfileButton } from '../../../features/auth/ui/UserProfileButton';

export interface HeaderProps {
  onOpenAreaModal: () => void;
}

const WINDOWS: { id: SectionType; label: string; sub?: { tab: TabType; label: string } }[] = [
  { id: 'pat', label: 'PAT', sub: { tab: 'rules', label: 'REGLAS' } },
  { id: 'canalizado', label: 'CANALIZADO' },
  { id: 'bductos', label: 'BDUCTOS', sub: { tab: 'curves', label: 'ACCESORIOS' } }
];

export const Header: React.FC<HeaderProps> = ({ onOpenAreaModal }) => {
  const { section, tab, theme, activeArea, setSection, setTab, toggleTheme } = useAppStore();
  const { items, undoSnapshot, redoSnapshot, undoLastAction, redoLastAction } = useItemsStore();
  const bductoRows = useBductoStore(state => state.rows);
  const bductoUndoSnapshot = useBductoStore(state => state.undoSnapshot);
  const bductoRedoSnapshot = useBductoStore(state => state.redoSnapshot);
  const undoBducto = useBductoStore(state => state.undoLastAction);
  const redoBducto = useBductoStore(state => state.redoLastAction);
  const promptMinimized = useBductoStore(state => state.promptMinimized);
  const restoreArmed = useBductoStore(state => state.restoreArmed);
  const setPromptMinimized = useBductoStore(state => state.setPromptMinimized);
  const rulePromptMinimized = useUIStore(state => state.rulePromptMinimized);
  const ruleRestoreArmed = useUIStore(state => state.ruleRestoreArmed);
  const setRulePromptMinimized = useUIStore(state => state.setRulePromptMinimized);
  const curveCanUndo = useCurveCatalogHistory(state => state.canUndo);
  const curveCanRedo = useCurveCatalogHistory(state => state.canRedo);
  const undoCurve = useCurveCatalogHistory(state => state.undo);
  const redoCurve = useCurveCatalogHistory(state => state.redo);
  const onCurves = section === 'bductos' && tab === 'curves';
  const canUndo = (onCurves && curveCanUndo) || (section === 'bductos' ? Boolean(bductoUndoSnapshot) : Boolean(undoSnapshot));
  const canRedo = (onCurves && curveCanRedo) || (section === 'bductos' ? Boolean(bductoRedoSnapshot) : Boolean(redoSnapshot));
  const showHistory = section === 'bductos' || canUndo || canRedo;
  const { isSyncing, showToast, searchQuery, setSearchQuery } = useUIStore();
  const { currentUser, setShowUserManagement, signOut } = useAuthStore();

  const hasSupabase = isSupabaseConfigured();
  const onPartidas = tab === 'packages';
  const activeWindow = WINDOWS.find(window => window.id === section);

  const openWindow = (id: SectionType) => {
    setSection(id);
    setTab('takeoff');
  };

  return (
    <header className="header">
      <div className="header-bar">
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
      </div>

      <nav className="nav" aria-label="Metrados">
        {WINDOWS.map(window => {
          const current = section === window.id;
          const onThisWindow = current && !onPartidas;
          return (
            <button
              key={window.id}
              type="button"
              data-section={window.id}
              className={`nav-tab${onThisWindow ? ' active' : ''}${current && onPartidas ? ' current' : ''}`}
              onClick={() => openWindow(window.id)}
            >
              {window.label}
            </button>
          );
        })}
        <span className="nav-divider" aria-hidden="true" />
        <button
          type="button"
          className={`nav-tab${onPartidas ? ' active' : ''}`}
          onClick={() => setTab('packages')}
        >
          PARTIDAS
        </button>
      </nav>

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

        {section !== 'bductos' && (rulePromptMinimized || ruleRestoreArmed) && (
          <button
            type="button"
            id={RULE_RESTORE_BUTTON_ID}
            className="btn-icon bducto-restore-btn"
            onClick={() => {
              const button = document.getElementById(RULE_RESTORE_BUTTON_ID);
              if (button) rememberRestoreAnchor(button.getBoundingClientRect());
              setRulePromptMinimized(false);
            }}
            title="Restaurar la regla"
            aria-label="Restaurar la regla"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.25" y="2.25" width="13.5" height="11.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M1.25 5.25h13.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        )}

        {showHistory && (
          <>
            <button
              type="button"
              className="btn-icon history-btn"
              disabled={!canUndo}
              onClick={() => {
                if (onCurves && curveCanUndo) {
                  if (undoCurve()) showToast('Curva restaurada', 'info');
                  return;
                }
                const undone = section === 'bductos' ? undoBducto() : undoLastAction(section);
                if (undone) showToast('Acción deshecha', 'info');
              }}
              title="Deshacer"
              aria-label="Deshacer"
            >
              <Undo2 size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="btn-icon history-btn"
              disabled={!canRedo}
              onClick={() => {
                if (onCurves && curveCanRedo) {
                  if (redoCurve()) showToast('Curva quitada de nuevo', 'info');
                  return;
                }
                const redone = section === 'bductos' ? redoBducto() : redoLastAction(section);
                if (redone) showToast('Acción rehecha', 'info');
              }}
              title="Rehacer"
              aria-label="Rehacer"
            >
              <Redo2 size={16} strokeWidth={2} />
            </button>
          </>
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

        {/* Compact, discreet profile avatar icon with dropdown */}
        <UserProfileButton />
      </div>
      </div>



      {activeWindow && !onPartidas && (
        <nav className="section-subnav" aria-label={activeWindow.label}>
          {activeWindow.sub && (
            <>
              <button
                type="button"
                className={tab === 'takeoff' ? 'active' : ''}
                onClick={() => {
                  setSection(activeWindow.id);
                  setTab('takeoff');
                }}
              >
                Metrado
              </button>
              <button
                type="button"
                className={tab === activeWindow.sub.tab ? 'active' : ''}
                onClick={() => {
                  setSection(activeWindow.id);
                  setTab(tab === activeWindow.sub!.tab ? 'takeoff' : activeWindow.sub!.tab);
                }}
              >
                {activeWindow.sub.label === 'REGLAS' ? 'Reglas' : 'Accesorios'}
              </button>
            </>
          )}
          {(tab === 'takeoff' || tab === 'rules' || tab === 'curves') && (
            <div className="metrado-search">
              <input
                type="text"
                placeholder="Buscar por SICME, BALANCE, TAG o DESCRIPCIÓN..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                aria-label="Buscar en el metrado"
              />
              {searchQuery && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => setSearchQuery('')}>
                  Limpiar
                </button>
              )}
            </div>
          )}
        </nav>
      )}
    </header>
  );
};
