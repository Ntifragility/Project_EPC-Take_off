import React, { useState, useRef, useEffect } from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { getSequentialTagsExample } from '../../utils/calculations';
import { TakeoffRule } from '../../types/takeoff';
import { hasSoporteItems, hasJumperItems, getDetallesForArea } from '../../data/detalleVariants';
import { convertSpreadsheetToCsvText } from '../../utils/csvParser';
import { ExcelGuideModal } from '../Modals/ExcelGuideModal';
import { getDefaultTagPrefixByRule, getDefaultDetalleByRule } from '../../data/seedRules';

export const AddPanel: React.FC = () => {
  const {
    packages,
    rules,
    selPkg,
    addMode,
    customPlano,
    customRev,
    section,
    activeArea,
    searchQuery,
    setSearchQuery,
    filterPlano,
    filterDetalle,
    clearFilters,
    undoSnapshot,
    undoLastAction,
    setSelPkg,
    setAddMode,
    setCustomPlano,
    setCustomRev,
    addCustomItem,
    applyTriggerRule,
    handleCsvUpload,
    syncGlobalContext,
    setTab,
    showToast
  } = useTakeoff();

  const hasActiveFilters = Boolean(searchQuery || filterPlano || filterDetalle);

  // Excel Guide modal state
  const [showExcelGuide, setShowExcelGuide] = useState(false);

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

  const handleApplyTrigger = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    let numInstances = 1;
    const upTrigger = rule.trigger.toUpperCase();
    const isCableRule =
      upTrigger.includes('CABLE DESNUDO 4/0 AWG') || upTrigger.includes('CABLE DESNUDO 2/0 AWG');
    const isBarraRule = upTrigger.includes('BARRA');
    const isMultiInstanceRule =
      upTrigger.includes('SOLDADURA') ||
      upTrigger.includes('POZO') ||
      isCableRule ||
      isBarraRule ||
      section === 'canalizado';

    if (isMultiInstanceRule) {
      const countInput = window.prompt(
        `¿Cuántas veces deseas agregar la regla:\n"${rule.trigger}"?`,
        '1'
      );
      if (countInput === null) return;
      numInstances = parseInt(countInput, 10);
      if (isNaN(numInstances) || numInstances < 1) return;
    }

    const autoPrefix = rule.tagPrefix || getDefaultTagPrefixByRule(rule.trigger);
    const autoDetalle = rule.detalle || getDefaultDetalleByRule(rule.trigger, activeArea);

    let baseTagPlano = '';
    const suggestedTag = autoPrefix ? `${autoPrefix}01` : 'M04';

    if (numInstances > 1 && isMultiInstanceRule) {
      const promptText = `Ingresa el TAG EN PLANO BASE (ej: ${suggestedTag}) para ${numInstances} instancias de:\n"${rule.trigger}"\n\nSe crearán secuencialmente: ${getSequentialTagsExample(
        suggestedTag,
        numInstances
      )}`;
      const tagInput = window.prompt(promptText, suggestedTag);
      if (tagInput === null) return;
      baseTagPlano = tagInput.trim();
    } else {
      const tagInput = window.prompt(
        `Ingresa el TAG EN PLANO para la regla seleccionada: ${rule.trigger}\n(Prefijo sugerido: ${autoPrefix || '—'})`,
        suggestedTag
      );
      if (tagInput === null) return;
      baseTagPlano = tagInput.trim();
    }

    let detalle = autoDetalle;
    let numSoportes = 1;
    let numJumpers = 1;
    let jumperPrompted = false;

    if (section === 'canalizado') {
      detalle = rule.trigger.replace(/^DETALLE\s+/i, '').trim();
    } else if (upTrigger.includes('SOLDADURA T 4/0 -2/0') || upTrigger.includes('SOLDADURA T 4/0-2/0')) {
      if (activeArea === 'AREA HUMEDA') {
        const detInput = window.prompt(
          `SELECCIONAR DETALLE PARA SOLDADURA T 4/0 -2/0 (ÁREA HÚMEDA):\n\nOpciones válidas:\n- 008/4T2 (Estándar)\n\nIngresa el código de DETALLE:`,
          '008/4T2'
        );
        if (detInput === null) return;
        detalle = detInput.trim().toUpperCase() || '008/4T2';
      } else {
        detalle = '167/X2';
      }
    } else if (upTrigger === 'SOLDADURA T 4/0' || upTrigger.startsWith('SOLDADURA T 4/0')) {
      if (activeArea === 'AREA HUMEDA') {
        const detInput = window.prompt(
          `SELECCIONAR DETALLE PARA SOLDADURA T 4/0 (ÁREA HÚMEDA):\n\nOpciones válidas:\n- 008/4T1 (Estándar)\n\nIngresa el código de DETALLE:`,
          '008/4T1'
        );
        if (detInput === null) return;
        detalle = detInput.trim().toUpperCase() || '008/4T1';
      } else {
        detalle = '167/X1';
      }
    } else if (upTrigger.includes('CABLE DESNUDO 4/0')) {
      if (activeArea === 'AREA HUMEDA') {
        const detInput = window.prompt(
          `SELECCIONAR DETALLE PARA CABLE DESNUDO 4/0 AWG (ÁREA HÚMEDA):\n\nOpciones válidas:\n- 008/3A (Estándar)\n\nIngresa el código de DETALLE:`,
          '008/3A'
        );
        if (detInput === null) return;
        detalle = detInput.trim().toUpperCase() || '008/3A';
      } else {
        detalle = '167/G1';
      }
    } else if (upTrigger.includes('CABLE DESNUDO 2/0 AWG')) {
      const validDetalles = getDetallesForArea(activeArea).map(([k]) => k);
      const detInput = window.prompt(
        `SELECCIONAR DETALLE PARA CABLE DESNUDO 2/0 AWG (${activeArea}):\n\nOpciones disponibles:\n${validDetalles.join(', ')}\n\nIngresa el código de DETALLE:`,
        'ND'
      );
      if (detInput === null) return;
      detalle = detInput.trim().toUpperCase() || 'ND';

      if (hasSoporteItems(detalle, activeArea)) {
        const sopInput = window.prompt(
          `¿Cuántos soportes se requieren por mecha para el detalle ${detalle}?\n(Multiplica los materiales "u / soporte" y "m/ soporte")`,
          '1'
        );
        if (sopInput === null) return;
        numSoportes = parseInt(sopInput, 10);
        if (isNaN(numSoportes) || numSoportes < 1) numSoportes = 1;
      }

      if (hasJumperItems(detalle, activeArea)) {
        const jmpInput = window.prompt(
          `¿Cuántos jumpers se requieren por mecha para el detalle ${detalle}?\n(Multiplica los materiales con Jumper)`,
          '1'
        );
        if (jmpInput === null) return;
        numJumpers = parseInt(jmpInput, 10);
        if (isNaN(numJumpers) || numJumpers < 1) numJumpers = 1;
        jumperPrompted = true;
      }
    } else if (upTrigger.includes('BARRA POT')) {
      if (activeArea === 'AREA HUMEDA') {
        const detInput = window.prompt(
          `SELECCIONAR DETALLE PARA BARRA POT (ÁREA HÚMEDA):\n\nOpciones válidas:\n- 010/17A (Barra + 4 Anclajes HDI + 2 Soportes)\n- 010/17B (Barra + 2 Soportes)`,
          '010/17A'
        );
        if (detInput === null) return;
        detalle = detInput.trim().toUpperCase() || '010/17A';

        const sopInput = window.prompt(
          `¿Cuántos soportes se requieren para BARRA POT (${detalle})?\n(Por defecto: 1 - Multiplica materiales "u / soporte")`,
          '1'
        );
        if (sopInput === null) return;
        numSoportes = parseInt(sopInput, 10);
        if (isNaN(numSoportes) || numSoportes < 1) numSoportes = 1;
      } else {
        detalle = '166A';
      }
    } else if (upTrigger.includes('BARRA INST')) {
      if (activeArea === 'AREA HUMEDA') {
        const detInput = window.prompt(
          `SELECCIONAR DETALLE PARA BARRA INST (ÁREA HÚMEDA):\n\nOpciones válidas:\n- 010/17C (Barra CON AISLADORES + 2 Soportes)\n- 010/17D (Barra CON AISLADORES + 4 Anclajes HDI + 2 Soportes)`,
          '010/17C'
        );
        if (detInput === null) return;
        detalle = detInput.trim().toUpperCase() || '010/17C';

        const sopInput = window.prompt(
          `¿Cuántos soportes se requieren para BARRA INST (${detalle})?\n(Por defecto: 1 - Multiplica materiales "u / soporte")`,
          '1'
        );
        if (sopInput === null) return;
        numSoportes = parseInt(sopInput, 10);
        if (isNaN(numSoportes) || numSoportes < 1) numSoportes = 1;
      } else {
        detalle = '166C';
      }
    } else if (!detalle) {
      const detInput = window.prompt(
        `Ingresa el DETALLE para la regla seleccionada: ${rule.trigger}\n(Dejar en blanco si no aplica)`,
        ''
      );
      if (detInput === null) return;
      detalle = detInput.trim();
    }

    // Every time the word JUMPER appears anywhere, prompt for number of jumpers if not prompted yet
    const containsJumper =
      detalle.toUpperCase().includes('JUMPER') ||
      hasJumperItems(detalle, activeArea) ||
      upTrigger.includes('JUMPER') ||
      rule.subitems.some(s => s.desc.toUpperCase().includes('JUMPER') || s.unit.toUpperCase().includes('JUMPER'));

    if (containsJumper && !jumperPrompted) {
      const promptLabel = detalle ? `para el detalle ${detalle}` : `para ${rule.trigger}`;
      const jmpInput = window.prompt(
        `¿Cuántos jumpers se requieren por mecha ${promptLabel}?\n(Multiplica los materiales con Jumper)`,
        '1'
      );
      if (jmpInput === null) return;
      numJumpers = parseInt(jmpInput, 10);
      if (isNaN(numJumpers) || numJumpers < 1) numJumpers = 1;
    }

    applyTriggerRule(ruleId, numInstances, baseTagPlano, detalle, numSoportes, numJumpers);
    setTriggerQuery('');
    setDropdownOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!['xlsx', 'xlsb', 'xls', 'xlsm'].includes(ext)) {
        showToast('Formato no permitido. Solo se aceptan archivos Excel (.xlsx, .xlsb, .xls)', 'warn');
        return;
      }
      const text = await convertSpreadsheetToCsvText(file);
      if (text && text.trim()) {
        handleCsvUpload(text);
      } else {
        showToast('El archivo Excel está vacío o no contiene datos válidos', 'warn');
      }
    } catch (err: any) {
      console.error('Error al procesar archivo:', err);
      showToast('Error al leer el archivo Excel: ' + (err?.message || ''), 'warn');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddManual = () => {
    addCustomItem(desc, qty, unit);
    setDesc('');
    setQty(1);
    setUnit('UND');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="card add-panel" style={{ marginBottom: '20px' }}>
      <div className="add-row">
        {/* Partida Selector */}
        <div className="field">
          <div className="field-label">PARTIDA</div>
          {packages.length === 0 ? (
            <div style={{ color: 'var(--mu)', fontSize: '12px', padding: '8px 0' }}>
              Sin partidas —{' '}
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  setTab('packages');
                }}
                style={{ color: 'var(--am)' }}
              >
                crear una
              </a>
            </div>
          ) : (
            <select
              value={selPkg || ''}
              onChange={e => setSelPkg(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Plano */}
        <div className="field">
          <div className="field-label">PLANO</div>
          <input
            id="global-plano"
            type="text"
            value={customPlano}
            style={{ width: '200px', textTransform: 'uppercase' }}
            onChange={e => setCustomPlano(e.target.value.toUpperCase())}
            placeholder="P22-DA-2151-07-GL-001"
          />
        </div>

        {/* Rev */}
        <div className="field">
          <div className="field-label">REV</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              id="global-rev"
              type="text"
              value={customRev}
              style={{ width: '80px', textTransform: 'uppercase' }}
              onChange={e => setCustomRev(e.target.value.toUpperCase())}
              placeholder="0"
            />
            <button
              className="btn-ghost"
              title="Sincronizar plano y rev en todo el metrado"
              style={{ padding: '0 8px', height: '32px', borderColor: 'var(--b1)', color: 'var(--tx)', fontSize: '11px', fontWeight: 600 }}
              onClick={syncGlobalContext}
            >
              SYNC
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="field">
          <div className="field-label">MODO</div>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${addMode === 'rule' ? 'active' : ''}`}
              onClick={() => setAddMode('rule')}
            >
              REGLA
            </button>
            <button
              className={`mode-btn ${addMode === 'custom' ? 'active' : ''}`}
              onClick={() => setAddMode('custom')}
            >
              MANUAL
            </button>
          </div>
        </div>

        {/* Batch CSV / Excel */}
        <div className="field">
          <button
            type="button"
            className="btn-ghost btn-success"
            style={{
              width: '100%',
              padding: '7px 12px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => setShowExcelGuide(true)}
            title="Ver formato, plantilla y subir archivo Excel"
          >
            <span>SUBIR EXCEL</span>
          </button>
        </div>

        {/* Dynamic Inputs according to Mode */}
        {addMode === 'rule' ? (
          <div className="field" style={{ flex: 1.5 }} ref={dropdownRef}>
            <div className="field-label">BUSCAR REGLA / DISPARADOR</div>
            <div className="ac-wrap">
              <input
                className="ac-input"
                id="trigger-input"
                type="text"
                placeholder="Escribir para buscar reglas..."
                value={triggerQuery}
                onChange={e => {
                  setTriggerQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setTriggerQuery('');
                    setDropdownOpen(false);
                  }
                }}
              />
              {dropdownOpen && (
                <div className="ac-dropdown" id="trigger-dropdown" style={{ display: 'block' }}>
                  {filteredRules.length === 0 ? (
                    <div className="ac-empty">Sin coincidencias</div>
                  ) : (
                    filteredRules.map(r => (
                      <div
                        key={r.id}
                        className="ac-option"
                        onMouseDown={() => handleApplyTrigger(r.id)}
                      >
                        <div className="ac-opt-name">{r.trigger}</div>
                        <div className="ac-opt-sub">
                          {getRuleSubtitle(r)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="field" style={{ flex: 2, minWidth: '200px' }}>
              <div className="field-label">DESCRIPCIÓN</div>
              <input
                id="custom-desc"
                type="text"
                value={desc}
                style={{ fontFamily: 'var(--mo)', fontSize: '12px' }}
                placeholder="Descripción del ítem..."
                onChange={e => setDesc(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddManual();
                }}
              />
            </div>
            <div className="field">
              <div className="field-label">CANTIDAD</div>
              <input
                id="custom-qty"
                type="number"
                min="0"
                value={qty}
                style={{ width: '84px' }}
                onChange={e => setQty(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <div className="field-label">UNIDAD</div>
              <input
                id="custom-unit"
                type="text"
                value={unit}
                style={{ width: '80px', textTransform: 'uppercase' }}
                onChange={e => setUnit(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddManual();
                }}
              />
            </div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={handleAddManual}>
                + AGREGAR
              </button>
            </div>
          </>
        )}

        {/* Search / Filter Table Field next to BUSCAR REGLA / DISPARADOR */}
        <div className="field" style={{ flex: 0.5, minWidth: '150px' }}>
          <div className="field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>FILTRAR TABLA</span>
            {undoSnapshot && (
              <button
                type="button"
                className="btn-ghost btn-sm btn-danger"
                style={{ padding: '0 6px', height: '18px', fontSize: '9.5px', lineHeight: 1 }}
                title="Deshacer la última regla aplicada"
                onClick={undoLastAction}
              >
                DESHACER
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              className="ac-input"
              id="search-input"
              type="text"
              placeholder="Buscar por TAG, PLANO o DESCRIPCIÓN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setSearchQuery('')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px 8px',
                  height: '32px',
                  color: '#ef4444',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  borderRadius: '4px',
                  flexShrink: 0
                }}
                title="Quitar término de búsqueda"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  <line x1="16" y1="14" x2="22" y2="20" stroke="#ef4444" strokeWidth="2.5" />
                  <line x1="22" y1="14" x2="16" y2="20" stroke="#ef4444" strokeWidth="2.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <ExcelGuideModal
        isOpen={showExcelGuide}
        onClose={() => setShowExcelGuide(false)}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
};

