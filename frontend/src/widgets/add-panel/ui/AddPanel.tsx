import React, { useState, useRef, useEffect, useMemo } from 'react';
import { usePackagesStore } from '../../../features/manage-packages/model/usePackagesStore';
import { useRulesStore } from '../../../features/manage-rules/model/useRulesStore';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { convertSpreadsheetToCsvText } from '../../../shared/lib/csvParser';
import { executeImportExcel } from '../../../features/import-excel/model/useImportExcel';
import { ExcelGuideModal } from '../../../features/import-excel/ui/ExcelGuideModal';
import { RuleTriggerModal } from '../../../features/apply-rule/ui/RuleTriggerModal';
import { PartidasGuideModal } from '../../../features/manage-partidas/ui/PartidasGuideModal';

export interface AddPanelProps {
  onCollapseSidebar?: () => void;
}

export const AddPanel: React.FC<AddPanelProps> = ({ onCollapseSidebar }) => {
  const { packages, selPkg, setSelPkg } = usePackagesStore();
  const { rules } = useRulesStore();
  const {
    items,
    customPlano,
    customRev,
    setCustomPlano,
    setCustomRev,
    addCustomItem,
    undoSnapshot,
    undoLastAction,
    syncGlobalContext
  } = useItemsStore();
  const { section, activeArea, setTab } = useAppStore();
  const {
    addMode,
    setAddMode,
    searchQuery,
    setSearchQuery,
    columnFilters,
    clearFilters,
    showToast,
    isPartidasModalOpen,
    setIsPartidasModalOpen
  } = useUIStore();

  const [showExcelGuide, setShowExcelGuide] = useState(false);
  const [selectedRuleForModal, setSelectedRuleForModal] = useState<TakeoffRule | null>(null);

  // Autocomplete rule search state
  const [triggerQuery, setTriggerQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Manual custom inputs
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState('UND');

  const filteredRules = triggerQuery.trim()
    ? rules.filter(r => r.trigger.toLowerCase().includes(triggerQuery.toLowerCase()))
    : rules;

  const getRuleSubtitle = (r: TakeoffRule): string => {
    const up = r.trigger.toUpperCase();
    if (up.includes('001/2B-X1') || up.includes('001/2B')) {
      return 'Riel Strut variable según ancho (900/600/450/300 mm) + 3 accesorios';
    }
    if (activeArea === 'AREA HUMEDA') {
      if (up.includes('BARRA POT')) {
        return '2 a 3 ítems según detalle (010/17A o 010/17B)';
      }
      if (up.includes('BARRA INST')) {
        return '2 a 3 ítems según detalle (010/17C o 010/17D)';
      }
      if (up.includes('CABLE DESNUDO 2/0 AWG')) {
        return 'Accesorios según detalle (008/05 - 010/18)';
      }
    } else {
      if (up.includes('BARRA POT')) {
        return '1 ítem (Detalle 166 convencional)';
      }
      if (up.includes('BARRA INST')) {
        return '2 ítems (Detalle 166C con aislador)';
      }
    }

    const count = r.subitems.length;
    return count === 1 ? '1 ítem' : `${count} ítems`;
  };

  const handleSelectRule = (rule: TakeoffRule) => {
    setSelectedRuleForModal(rule);
    setDropdownOpen(false);
    setTriggerQuery('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let text = '';
      if (['xlsx', 'xlsb', 'xls', 'xlsm'].includes(ext || '')) {
        text = await convertSpreadsheetToCsvText(file);
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        showToast('El archivo está vacío o no contiene hojas legibles', 'warn');
        return;
      }

      executeImportExcel(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
      showToast(msg, 'warn');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    addCustomItem(desc.trim().toUpperCase(), qty, unit.toUpperCase(), selPkg || 'p1', section, activeArea);
    setDesc('');
    setQty(1);
    setUnit('UND');
    showToast('Ítem manual agregado', 'info');
  };

  const hasActiveFilters = Boolean(searchQuery || Object.keys(columnFilters).length > 0);

  const availablePlanos = useMemo(() => {
    return Array.from(new Set(items.map(i => i.plano).filter(Boolean))).sort();
  }, [items]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="sidebar-panel">
      {/* Global Metadata Inputs (Plano & Rev) */}
      <div className="panel-section">
        <div className="panel-section-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="panel-section-title">Metadatos</span>
            {onCollapseSidebar && (
              <button
                type="button"
                className="btn-ghost"
                onClick={onCollapseSidebar}
                style={{ fontSize: '10.5px', padding: '1px 6px', color: 'var(--mu)' }}
                title="Ocultar / Replegar este panel a la izquierda"
              >
                ◀ Ocultar
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--accent)' }}
            onClick={() => syncGlobalContext(section)}
            title="Aplica este Plano y Rev a todas las filas en la pantalla"
          >
            Aplicar a todos
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              list="add-panel-planos-list"
              value={customPlano}
              onChange={e => setCustomPlano(e.target.value.toUpperCase())}
              placeholder="Plano (P22-DA-...)"
              style={{
                width: '100%',
                fontSize: '12px',
                fontFamily: 'var(--mo)',
                textTransform: 'uppercase'
              }}
            />
            <datalist id="add-panel-planos-list">
              {availablePlanos.map(p => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div style={{ width: '60px' }}>
            <input
              type="text"
              value={customRev}
              onChange={e => setCustomRev(e.target.value.toUpperCase())}
              placeholder="Rev"
              style={{
                width: '100%',
                fontSize: '12px',
                fontFamily: 'var(--mo)',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
      </div>

      {/* Package Selector */}
      <div className="panel-section">
        <div className="panel-section-hd">
          <span className="panel-section-title">Paquete</span>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '11px', padding: '2px 8px' }}
            onClick={() => setTab('packages')}
            title="Administrar / Agregar Partidas"
          >
            + Gestionar
          </button>
        </div>

        <select
          value={selPkg || ''}
          onChange={e => setSelPkg(e.target.value)}
          style={{
            width: '100%',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {packages.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mode Switcher Pill */}
      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${addMode === 'rule' ? 'active' : ''}`}
          onClick={() => setAddMode('rule')}
        >
          Por Regla
        </button>
        <button
          type="button"
          className={`mode-btn ${addMode === 'custom' ? 'active' : ''}`}
          onClick={() => setAddMode('custom')}
        >
          Manual
        </button>
      </div>

      {/* Rule Selection Mode */}
      {addMode === 'rule' && (
        <div className="panel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="panel-section-hd">
            <span className="panel-section-title">Catálogo de Reglas</span>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--accent)' }}
              onClick={() => setTab('rules')}
              title="Configurar y agregar nuevas reglas"
            >
              + Nueva
            </button>
          </div>

          {/* Autocomplete Input */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={triggerQuery}
              onChange={e => {
                setTriggerQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Buscar regla rápida..."
              style={{
                width: '100%',
                fontSize: '12px'
              }}
            />

            {dropdownOpen && filteredRules.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  maxHeight: '220px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--s1)',
                  border: '1px solid var(--b1)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--dropdown-shadow)',
                  zIndex: 30,
                  padding: '6px'
                }}
              >
                {filteredRules.map(r => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRule(r)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--s2)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--tx-hd)' }}>{r.trigger}</div>
                    <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '2px' }}>{getRuleSubtitle(r)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules List Scroll */}
          <div
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '2px'
            }}
          >
            {rules.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelectRule(r)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--b1)',
                  backgroundColor: 'var(--s2)',
                  color: 'var(--tx)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.backgroundColor = 'var(--s1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(91, 80, 230, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--b1)';
                  e.currentTarget.style.backgroundColor = 'var(--s2)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--tx-hd)' }}>{r.trigger}</div>
                <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '2px' }}>{getRuleSubtitle(r)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Input Mode */}
      {addMode === 'custom' && (
        <form
          onSubmit={handleAddManual}
          className="panel-section"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div className="panel-section-title">
            Ítem Manual
          </div>

          <div>
            <div className="field-label">Descripción</div>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Descripción del material..."
              required
              style={{ width: '100%', fontSize: '12px', textTransform: 'uppercase' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Cantidad</div>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(parseFloat(e.target.value) || 1)}
                min={0.001}
                step="any"
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>

            <div style={{ width: '80px' }}>
              <div className="field-label">Unidad</div>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value.toUpperCase())}
                placeholder="UND"
                style={{ width: '100%', fontSize: '12px', textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '4px' }}>
            + Agregar a Tabla
          </button>
        </form>
      )}

      {/* Filter / Search Box */}
      <div className="panel-section">
        <div className="panel-section-hd">
          <span className="panel-section-title">Filtrar Metrado</span>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '10.5px', padding: '2px 6px', color: 'var(--rd)' }}
              onClick={clearFilters}
            >
              Limpiar
            </button>
          )}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar descripción o TAG..."
          style={{
            width: '100%',
            fontSize: '12px'
          }}
        />
      </div>

      {/* Import / Guide Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        <label
          className="btn btn-secondary"
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: '11.5px',
            cursor: 'pointer',
            textAlign: 'center',
            margin: 0
          }}
          title="Subir archivo Excel (.xlsx, .xlsb, .xls) de Metrado"
        >
          <span>📁 Importar</span>
          <input
            type="file"
            accept=".xlsx,.xlsb,.xls,.csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </label>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '7px 10px', fontSize: '11.5px' }}
          onClick={() => setIsPartidasModalOpen(true)}
          title="Cargar / Actualizar Partidas Master en Supabase"
        >
          🏷️ Partidas
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '7px 10px', fontSize: '11.5px' }}
          onClick={() => setShowExcelGuide(true)}
          title="Ver guía y descargar plantilla Excel multi-pestaña"
        >
          📋 Guía
        </button>
      </div>

      {/* Undo Action Bar */}
      {undoSnapshot && (
        <button
          type="button"
          onClick={() => {
            if (undoLastAction(section)) {
              showToast('Acción deshecha', 'info');
            }
          }}
          className="btn"
          style={{
            width: '100%',
            fontSize: '11.5px',
            backgroundColor: 'var(--am-dim)',
            borderColor: 'var(--am)',
            color: 'var(--am)',
            fontWeight: 700
          }}
          title="Deshacer la última acción agregada o modificada"
        >
          ↩ Deshacer Última Acción
        </button>
      )}

      {/* Modals Hosted by AddPanel */}
      <ExcelGuideModal
        isOpen={showExcelGuide}
        onClose={() => setShowExcelGuide(false)}
        onFileUpload={handleFileUpload}
      />

      <RuleTriggerModal
        isOpen={Boolean(selectedRuleForModal)}
        rule={selectedRuleForModal}
        activeArea={activeArea}
        onClose={() => setSelectedRuleForModal(null)}
      />

      <PartidasGuideModal
        isOpen={isPartidasModalOpen}
        onClose={() => setIsPartidasModalOpen(false)}
      />
    </div>
  );
};
