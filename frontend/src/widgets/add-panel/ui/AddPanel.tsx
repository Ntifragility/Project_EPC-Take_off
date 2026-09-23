import React, { useState, useRef, useEffect } from 'react';
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

export const AddPanel: React.FC = () => {
  const { packages, selPkg, setSelPkg } = usePackagesStore();
  const { rules } = useRulesStore();
  const {
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
    filterPlano,
    filterDetalle,
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

  const hasActiveFilters = Boolean(searchQuery || filterPlano || filterDetalle);

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
    <div className="add-panel">
      {/* Global Metadata Inputs (Plano & Rev) */}
      <div
        className="add-panel-card"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="add-panel-title" style={{ margin: 0, fontSize: '11px' }}>
            METADATOS GLOBALES
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              height: '20px',
              color: 'var(--tx)',
              borderColor: 'var(--b1)'
            }}
            onClick={() => syncGlobalContext(section)}
            title="Aplica este Plano y Rev a todas las filas en la pantalla"
          >
            APLICAR A TODOS
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div className="field-label" style={{ fontSize: '9.5px', marginBottom: '2px' }}>
              PLANO
            </div>
            <input
              type="text"
              value={customPlano}
              onChange={e => setCustomPlano(e.target.value.toUpperCase())}
              placeholder="P22-DA-2151..."
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '4px 6px',
                fontFamily: 'var(--mo)',
                textTransform: 'uppercase'
              }}
            />
          </div>

          <div style={{ width: '60px' }}>
            <div className="field-label" style={{ fontSize: '9.5px', marginBottom: '2px' }}>
              REV
            </div>
            <input
              type="text"
              value={customRev}
              onChange={e => setCustomRev(e.target.value.toUpperCase())}
              placeholder="0"
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '4px 6px',
                fontFamily: 'var(--mo)',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
      </div>

      {/* Package Selector */}
      <div className="add-panel-card" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div className="add-panel-title" style={{ margin: 0, fontSize: '11px' }}>
            PARTIDA ACTIVA
          </div>
          <button
            className="btn-ghost"
            style={{
              fontSize: '10px',
              height: '20px',
              padding: '0 6px',
              color: 'var(--tx)',
              borderColor: 'var(--b1)'
            }}
            onClick={() => setTab('packages')}
            title="Administrar / Agregar Partidas"
          >
            + GESTIONAR
          </button>
        </div>

        <select
          value={selPkg || ''}
          onChange={e => setSelPkg(e.target.value)}
          style={{
            width: '100%',
            fontSize: '11px',
            padding: '5px 6px',
            fontFamily: 'var(--mo)',
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

      {/* Mode Switcher Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1,
            padding: '6px',
            fontSize: '11px',
            fontWeight: addMode === 'rule' ? 'bold' : 'normal',
            borderColor: addMode === 'rule' ? 'var(--accent)' : 'var(--b1)',
            backgroundColor: addMode === 'rule' ? 'var(--accent-dim)' : 'transparent',
            color: addMode === 'rule' ? 'var(--accent)' : 'var(--tx)'
          }}
          onClick={() => setAddMode('rule')}
        >
          ⚡ Por Regla
        </button>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1,
            padding: '6px',
            fontSize: '11px',
            fontWeight: addMode === 'custom' ? 'bold' : 'normal',
            borderColor: addMode === 'custom' ? 'var(--accent)' : 'var(--b1)',
            backgroundColor: addMode === 'custom' ? 'var(--accent-dim)' : 'transparent',
            color: addMode === 'custom' ? 'var(--accent)' : 'var(--tx)'
          }}
          onClick={() => setAddMode('custom')}
        >
          ✏️ Manual
        </button>
      </div>

      {/* Rule Selection Mode */}
      {addMode === 'rule' && (
        <div className="add-panel-card" style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div className="add-panel-title" style={{ margin: 0, fontSize: '11px' }}>
              SELECCIONAR REGLA
            </div>
            <button
              className="btn-ghost"
              style={{
                fontSize: '10px',
                height: '20px',
                padding: '0 6px',
                color: 'var(--tx)',
                borderColor: 'var(--b1)'
              }}
              onClick={() => setTab('rules')}
              title="Configurar y agregar nuevas reglas"
            >
              + NUEVA
            </button>
          </div>

          {/* Autocomplete Input */}
          <div ref={dropdownRef} style={{ position: 'relative', marginBottom: '8px' }}>
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
                fontSize: '11px',
                padding: '5px 8px',
                fontFamily: 'var(--mo)'
              }}
            />

            {dropdownOpen && filteredRules.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--s1)',
                  border: '1px solid var(--b1)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 20
                }}
              >
                {filteredRules.map(r => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRule(r)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--b1)'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--s2)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ fontWeight: 600 }}>{r.trigger}</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--mu)' }}>{getRuleSubtitle(r)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules List Scroll */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
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
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--b1)',
                  backgroundColor: 'var(--s2)',
                  color: 'var(--tx)',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.backgroundColor = 'var(--s3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--b1)';
                  e.currentTarget.style.backgroundColor = 'var(--s2)';
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx)' }}>{r.trigger}</div>
                <div style={{ fontSize: '9.5px', color: 'var(--mu)', marginTop: '2px' }}>{getRuleSubtitle(r)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Input Mode */}
      {addMode === 'custom' && (
        <form
          onSubmit={handleAddManual}
          className="add-panel-card"
          style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <div className="add-panel-title" style={{ margin: 0, fontSize: '11px' }}>
            AGREGAR ÍTEM MANUAL
          </div>

          <div>
            <div className="field-label" style={{ fontSize: '9.5px', marginBottom: '2px' }}>
              DESCRIPCIÓN
            </div>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Descripción del material..."
              required
              style={{ width: '100%', fontSize: '11px', padding: '4px 6px', textTransform: 'uppercase' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div className="field-label" style={{ fontSize: '9.5px', marginBottom: '2px' }}>
                CANTIDAD
              </div>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(parseFloat(e.target.value) || 1)}
                min={0.001}
                step="any"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              />
            </div>

            <div style={{ width: '80px' }}>
              <div className="field-label" style={{ fontSize: '9.5px', marginBottom: '2px' }}>
                UNIDAD
              </div>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value.toUpperCase())}
                placeholder="UND"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px', textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '4px', padding: '6px' }}>
            + Agregar a Tabla
          </button>
        </form>
      )}

      {/* Excel / CSV File Import & Template Action Card */}
      <div
        className="add-panel-card"
        style={{
          padding: '12px 14px',
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="add-panel-title" style={{ margin: 0, fontSize: '11px' }}>
            IMPORTAR / CARGAR
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              height: '20px',
              color: 'var(--accent)',
              borderColor: 'var(--b1)'
            }}
            onClick={() => setShowExcelGuide(true)}
            title="Ver guía y descargar plantilla Excel multi-pestaña"
          >
            📋 GUÍA EXCEL
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <label
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 0
            }}
            title="Subir archivo Excel (.xlsx, .xlsb, .xls) de Metrado"
          >
            <span>📁 Importar Metrado</span>
            <input
              type="file"
              accept=".xlsx,.xlsb,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>

          <button
            type="button"
            className="btn"
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              borderColor: 'var(--b1)'
            }}
            onClick={() => setIsPartidasModalOpen(true)}
            title="Cargar / Actualizar Partidas Master en Supabase"
          >
            🏷️ Partidas
          </button>
        </div>
      </div>

      {/* Filter / Search Box */}
      <div
        className="add-panel-card"
        style={{
          padding: '12px 14px',
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="add-panel-title" style={{ margin: 0, fontSize: '11px' }}>
            FILTRAR TABLA
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-ghost"
              style={{
                padding: '1px 5px',
                fontSize: '9.5px',
                height: '18px',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.3)'
              }}
              onClick={clearFilters}
            >
              LIMPIAR
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
            fontSize: '11px',
            padding: '4px 6px',
            fontFamily: 'var(--mo)'
          }}
        />
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
            marginTop: '8px',
            padding: '6px',
            width: '100%',
            fontSize: '11px',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            borderColor: 'rgba(234, 179, 8, 0.4)',
            color: 'var(--am, #eab308)',
            fontWeight: 600
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
