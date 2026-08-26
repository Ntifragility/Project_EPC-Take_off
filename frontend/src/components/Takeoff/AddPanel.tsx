import React, { useState, useRef, useEffect } from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { getSequentialTagsExample } from '../../utils/calculations';

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
    setSelPkg,
    setAddMode,
    setCustomPlano,
    setCustomRev,
    addCustomItem,
    applyTriggerRule,
    handleCsvUpload,
    syncGlobalContext,
    setTab
  } = useTakeoff();

  // Autocomplete rule search state
  const [triggerQuery, setTriggerQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Manual custom inputs
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState('UND');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRules = triggerQuery.trim()
    ? rules.filter(r => r.trigger.toLowerCase().includes(triggerQuery.toLowerCase()))
    : rules;

  const handleApplyTrigger = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    let numInstances = 1;
    const upTrigger = rule.trigger.toUpperCase();
    const isCableRule =
      upTrigger.includes('CABLE DESNUDO 4/0 AWG') || upTrigger.includes('CABLE DESNUDO 2/0 AWG');

    if (
      upTrigger.includes('SOLDADURA') ||
      upTrigger.includes('POZO') ||
      isCableRule ||
      section === 'canalizado'
    ) {
      const countInput = window.prompt(
        `¿Cuántas veces deseas agregar la regla:\n"${rule.trigger}"?`,
        '1'
      );
      if (countInput === null) return;
      numInstances = parseInt(countInput, 10);
      if (isNaN(numInstances) || numInstances < 1) return;
    }

    let baseTagPlano = '';
    if (
      numInstances > 1 &&
      (upTrigger.includes('SOLDADURA') ||
        upTrigger.includes('POZO') ||
        isCableRule ||
        section === 'canalizado')
    ) {
      const promptText = `Ingresa el TAG EN PLANO BASE (ej: M04) para ${numInstances} instancias de:\n"${rule.trigger}"\n\nSe crearán secuencialmente: ${getSequentialTagsExample(
        'M04',
        numInstances
      )}`;
      const tagInput = window.prompt(promptText, '');
      if (tagInput === null) return;
      baseTagPlano = tagInput.trim();
    } else {
      const tagInput = window.prompt(
        `Ingresa el TAG EN PLANO para la regla seleccionada: ${rule.trigger}\n(Dejar en blanco si no aplica)`
      );
      if (tagInput === null) return;
      baseTagPlano = tagInput.trim();
    }

    let detalle = '';
    const tagForDetalle = (baseTagPlano || '').trim().toUpperCase();
    const startsWithC = tagForDetalle.startsWith('C');
    const defaultDet = startsWithC ? '167/G1' : '';

    if (section === 'canalizado') {
      detalle = rule.trigger.replace(/^DETALLE\s+/i, '').trim();
    } else if (upTrigger.includes('BARRA POT')) {
      if (activeArea === 'AREA HUMEDA') {
        const detInput = window.prompt(
          `⚡ SELECCIONAR DETALLE PARA BARRA POT (ÁREA HÚMEDA):\n\nOpciones válidas:\n- 010/17A (Barra + 4 Pernos + 2 Soportes)\n- 010/17B (Barra + 2 Soportes)\n- 010/17C (Barra + 2 Soportes)\n- 010/17D (Barra CON AISLADORES + 4 Pernos + 2 Soportes)`,
          '010/17A'
        );
        if (detInput === null) return;
        detalle = detInput.trim().toUpperCase() || '010/17A';
      } else {
        const detInput = window.prompt(`Ingresa el DETALLE para BARRA POT (ÁREA SECA):`, '166');
        if (detInput === null) return;
        detalle = detInput.trim();
      }
    } else if (upTrigger.includes('CABLE DESNUDO 2/0 AWG')) {
      if (activeArea === 'AREA HUMEDA') {
        const detInput = window.prompt(
          `Ingresa el DETALLE para CABLE DESNUDO 2/0 AWG (ÁREA HÚMEDA):\n(Ej: 010/17B, 008/5, 009/8, 009/9, 010/13, 010/14, 010/15...)`,
          '010/17B'
        );
        if (detInput === null) return;
        detalle = detInput.trim().toUpperCase() || '010/17B';
      } else {
        detalle = '151'; // Standard DETALLE for Area Seca
      }
    } else {
      const detInput = window.prompt(
        `Ingresa el DETALLE para la regla seleccionada: ${rule.trigger}\n(Dejar en blanco si no aplica)`,
        defaultDet
      );
      if (detInput === null) return;
      detalle = detInput.trim();
    }

    applyTriggerRule(ruleId, numInstances, baseTagPlano, detalle);
    setTriggerQuery('');
    setDropdownOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) {
        handleCsvUpload(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
              style={{ width: '40px', textTransform: 'uppercase' }}
              onChange={e => setCustomRev(e.target.value.toUpperCase())}
              placeholder="0"
            />
            <button
              className="btn-ghost"
              title="Sincronizar plano y rev en todo el metrado"
              style={{ padding: '0 8px', height: '32px', borderColor: 'var(--am)', color: 'var(--am)' }}
              onClick={syncGlobalContext}
            >
              🔄
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

        {/* Batch CSV */}
        <div className="field">
          <div className="field-label">LOTE CSV</div>
          <label
            className="btn-ghost"
            style={{
              cursor: 'pointer',
              padding: '8px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              borderColor: 'var(--am)',
              color: 'var(--am)',
              fontWeight: 700
            }}
          >
            + SUBIR CSV
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Dynamic Inputs according to Mode */}
        {addMode === 'rule' ? (
          <div className="field" style={{ flex: 1 }} ref={dropdownRef}>
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
                          {r.subitems.length} {r.subitems.length !== 1 ? 'ítems' : 'ítem'} se agregarán
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
      </div>
    </div>
  );
};

