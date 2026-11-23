import React, { useState, useEffect, useMemo } from 'react';
import { TakeoffRule, RuleSubitem, DetalleDefinition } from '../../../entities/takeoff-rule/model/types';
import { AreaType, SubAreaHumeda } from '../../../shared/types/common';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';
import { formulaHint, shownFormula, shownVariantFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { fetchDetalleCatalog } from '../../../entities/takeoff-rule/api/ruleRepository';
import { getRuleDetallesForArea } from '../../../entities/takeoff-rule/model/areaCatalog';
import {
  getBarraVariants,
  getDetallesForArea,
  shouldAutoManageTuberia,
  DetalleVariantItem
} from '../../../entities/takeoff-rule/model/detalleVariants';
import {
  isBarraInstFamily,
  isBarraPotFamily,
  isCable20Family
} from '../../../entities/takeoff-rule/model/ruleFamily';
import { uid } from '../../../shared/lib/uid';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { siteConfirm } from '../../../shared/ui/askSite';
import { ErpDropdown, ErpDropdownOption } from '../../../shared/ui/ErpDropdown';

export interface RuleEditorModalProps {
  isOpen: boolean;
  initialRule: TakeoffRule | null;
  isNew: boolean;
  activeArea?: AreaType;
  activeSubArea?: SubAreaHumeda;
  availableRules?: TakeoffRule[];
  onClose: () => void;
  onSave: (rule: TakeoffRule, isNew: boolean) => void;
  onDelete?: (id: string) => void;
}

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  isOpen,
  initialRule,
  isNew,
  activeArea = 'AREA SECA',
  activeSubArea = 'NO_CORROSIVO',
  availableRules = [],
  onClose,
  onSave,
  onDelete
}) => {
  const currentArea = activeArea || 'AREA SECA';
  const currentSubArea: SubAreaHumeda = currentArea === 'AREA HUMEDA' ? (activeSubArea || 'NO_CORROSIVO') : 'NO_CORROSIVO';
  const [trigger, setTrigger] = useState('');
  const [detalle, setDetalle] = useState('');
  const [tagPrefix, setTagPrefix] = useState('M');
  const [allowDetalleEdit, setAllowDetalleEdit] = useState(true);
  const [subitems, setSubitems] = useState<RuleSubitem[]>([]);
  const [detalleOptions, setDetalleOptions] = useState<DetalleDefinition[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedVariantCode, setSelectedVariantCode] = useState<string>('');

  const isCable20Selected = useMemo(() => {
    if (!selectedTemplateId) return false;
    const rule = availableRules.find(r => r.id === selectedTemplateId);
    return rule ? (rule.id === 'r2' || isCable20Family(rule.trigger)) : false;
  }, [selectedTemplateId, availableRules]);

  const isBarraPotSelected = useMemo(() => {
    if (!selectedTemplateId) return false;
    const rule = availableRules.find(r => r.id === selectedTemplateId);
    return rule ? (rule.id === 'r8' || isBarraPotFamily(rule.trigger)) : false;
  }, [selectedTemplateId, availableRules]);

  const isBarraInstSelected = useMemo(() => {
    if (!selectedTemplateId) return false;
    const rule = availableRules.find(r => r.id === selectedTemplateId);
    return rule ? (rule.id === 'r9' || isBarraInstFamily(rule.trigger)) : false;
  }, [selectedTemplateId, availableRules]);

  const cable20DetalleList = useMemo(() => {
    if (!isCable20Selected) return [];
    return getDetallesForArea(currentArea, currentSubArea);
  }, [isCable20Selected, currentArea, currentSubArea]);

  const barraDetalleList = useMemo(() => {
    if (isBarraPotSelected) {
      return Object.entries(getBarraVariants('BARRA_POT', currentSubArea));
    }
    if (isBarraInstSelected) {
      return Object.entries(getBarraVariants('BARRA_INST', currentSubArea));
    }
    return [];
  }, [isBarraPotSelected, isBarraInstSelected, currentSubArea]);

  useEffect(() => {
    if (isOpen) {
      fetchDetalleCatalog().then(setDetalleOptions).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialRule) {
      setTrigger(initialRule.trigger);
      setTagPrefix(initialRule.tagPrefix || 'M');
      setAllowDetalleEdit(initialRule.allowDetalleEdit !== false);

      // Auto-resolve DETALLE for the currently active area
      const resolvedDetalle =
        initialRule.areaDetalles?.[currentArea] ||
        (initialRule.areas?.includes(currentArea) ? (initialRule.defaultDetalle || initialRule.detalle) : '') ||
        getRuleDetallesForArea(initialRule.trigger, currentArea)[0] ||
        initialRule.defaultDetalle ||
        initialRule.detalle ||
        '';
      setDetalle(resolvedDetalle);

      const copy: RuleSubitem[] = JSON.parse(JSON.stringify(initialRule.subitems || []));
      setSubitems(copy.map(item => ({
        ...item,
        id: isNew ? uid() : item.id,
        formula: shownFormula(item, initialRule.trigger),
        material: componentClass(item.desc, item.material),
        optional: Boolean(item.optional)
      })));
      setSelectedTemplateId(initialRule.id || '');
      setSelectedVariantCode(resolvedDetalle || '');
    } else {
      setTrigger('');
      setTagPrefix('M');
      setAllowDetalleEdit(true);
      setDetalle('');
      setSubitems([{ id: uid(), desc: '', qty: 1, unit: 'UND', formula: '', material: 'C', optional: false }]);
      setSelectedTemplateId('');
      setSelectedVariantCode('');
    }
  }, [initialRule, isOpen, currentArea, isNew]);

  const handleSelectCable20Option = (code: string) => {
    setSelectedVariantCode(code);
    if (!code) return;

    const found = cable20DetalleList.find(([c]) => c === code);
    if (!found) return;

    const [, itemsList] = found;
    const tuberiaDesc = code.startsWith('020')
      ? 'TUBERIA RIGIDA DE ACERO GALVANIZADO EN CALIENTE DE WHEATLAND"'
      : 'TUBERIA PVC SCH 80 Ø3/4"';

    const itemsWithTuberia =
      currentArea === 'AREA SECA' &&
      shouldAutoManageTuberia(code) &&
      code !== '153' &&
      code !== 'NA'
        ? [...itemsList, { desc: tuberiaDesc, qty: 1, unit: 'm', ot: 'Var.' }]
        : [...itemsList];

    setTrigger(`CABLE DESNUDO 2/0 AWG - DET. ${code} (COPIA)`);
    setDetalle(code);
    setSubitems(
      itemsWithTuberia.map((it: any) => ({
        id: uid(),
        desc: it.desc,
        qty: it.qty !== undefined && it.qty !== '' ? it.qty : (it.ot !== undefined && it.ot !== '' ? it.ot : 1),
        unit: it.unit || 'und',
        formula: shownVariantFormula(it) || (it.otDynamic === '1c/3m' ? 'ceil(length/3)' : ''),
        material: it.material || componentClass(it.desc),
        optional: false
      }))
    );
  };

  const handleSelectBarraOption = (code: string) => {
    setSelectedVariantCode(code);
    if (!code) return;
    const found = barraDetalleList.find(([c]) => c === code);
    if (!found) return;
    const [, itemsList] = found;
    const prefix = isBarraPotSelected ? 'BARRA DE POTENCIAL' : 'BARRA DE INSTRUMENTACIÓN';
    setTrigger(`${prefix} - DET. ${code} (COPIA)`);
    setDetalle(code);
    setSubitems(
      itemsList.map((it: any) => ({
        id: uid(),
        desc: it.desc,
        qty: it.qty !== undefined && it.qty !== '' ? it.qty : (it.ot !== undefined && it.ot !== '' ? it.ot : 1),
        unit: it.unit || 'und',
        formula: shownVariantFormula(it) || '',
        material: it.material || componentClass(it.desc),
        optional: false
      }))
    );
  };

  const handleSelectTemplate = (ruleId: string) => {
    setSelectedTemplateId(ruleId);
    setSelectedVariantCode('');
    if (!ruleId) {
      setTrigger('');
      setTagPrefix('M');
      setAllowDetalleEdit(true);
      setDetalle('');
      setSelectedVariantCode('');
      setSubitems([{ id: uid(), desc: '', qty: 1, unit: 'UND', formula: '', material: 'C', optional: false }]);
      return;
    }
    const baseRule = availableRules.find(r => r.id === ruleId);
    if (!baseRule) return;

    // Check if Cable 2/0
    const isC20 = baseRule.id === 'r2' || isCable20Family(baseRule.trigger);
    if (isC20) {
      const variants = getDetallesForArea(currentArea, currentSubArea);
      if (variants.length > 0) {
        const firstCode = variants[0][0];
        handleSelectCable20Option(firstCode);
        return;
      }
    }

    // Check if Barra
    const isBPot = baseRule.id === 'r8' || isBarraPotFamily(baseRule.trigger);
    const isBInst = baseRule.id === 'r9' || isBarraInstFamily(baseRule.trigger);
    if (isBPot || isBInst) {
      const bList = isBPot
        ? Object.entries(getBarraVariants('BARRA_POT', currentSubArea))
        : Object.entries(getBarraVariants('BARRA_INST', currentSubArea));
      if (bList.length > 0) {
        const firstCode = bList[0][0];
        handleSelectBarraOption(firstCode);
        return;
      }
    }

    setTrigger(`${baseRule.trigger} (COPIA)`);
    setTagPrefix(baseRule.tagPrefix || 'M');
    setAllowDetalleEdit(baseRule.allowDetalleEdit !== false);

    const defaultDet = getRuleDetallesForArea('', currentArea)[0] || (currentArea === 'AREA HUMEDA' ? '008/3A' : '151');
    const resolvedDetalle =
      baseRule.areaDetalles?.[currentArea] ||
      (baseRule.areas?.includes(currentArea) ? (baseRule.defaultDetalle || baseRule.detalle) : '') ||
      getRuleDetallesForArea(baseRule.trigger, currentArea)[0] ||
      baseRule.defaultDetalle ||
      baseRule.detalle ||
      defaultDet;
    setDetalle(resolvedDetalle);
    setSelectedVariantCode(resolvedDetalle);

    const copy: RuleSubitem[] = JSON.parse(JSON.stringify(baseRule.subitems || []));
    setSubitems(
      copy.map(item => ({
        ...item,
        id: uid(),
        formula: shownFormula(item, baseRule.trigger),
        material: componentClass(item.desc, item.material),
        optional: Boolean(item.optional)
      }))
    );
  };

  const handleSelectAnyDetalleOption = (code: string) => {
    setSelectedVariantCode(code);
    if (!code) return;
    setDetalle(code);

    if (isCable20Selected) {
      handleSelectCable20Option(code);
      return;
    }
    if (isBarraPotSelected || isBarraInstSelected) {
      handleSelectBarraOption(code);
      return;
    }

    // When starting from a blank rule (or matching a known Cable 2/0 / Barra constructivo detail),
    // preload its materials if available so picking a constructivo detail accelerates setup.
    if (!selectedTemplateId) {
      const areaVariant = getDetallesForArea(currentArea, currentSubArea).find(([c]) => c === code);
      const barraPotVariant = getBarraVariants('BARRA_POT', currentSubArea)[code];
      const barraInstVariant = getBarraVariants('BARRA_INST', currentSubArea)[code];
      const matchedItems: any[] | undefined = areaVariant?.[1] || barraPotVariant || barraInstVariant;

      if (matchedItems && matchedItems.length > 0) {
        setSubitems(
          matchedItems.map((it: any) => ({
            id: uid(),
            desc: it.desc,
            qty: it.qty !== undefined && it.qty !== '' ? it.qty : (it.ot !== undefined && it.ot !== '' ? it.ot : 1),
            unit: it.unit || 'und',
            formula: shownVariantFormula(it) || (it.otDynamic === '1c/3m' ? 'ceil(length/3)' : ''),
            material: it.material || componentClass(it.desc),
            optional: false
          }))
        );
      }
    }
  };

  const filteredDetalleOptions = useMemo(
    () => detalleOptions.filter(d => d.area === currentArea || d.area === 'GENERAL'),
    [detalleOptions, currentArea]
  );

  const templateDropdownOptions: ErpDropdownOption[] = useMemo(() => {
    const list: ErpDropdownOption[] = [
      {
        value: '',
        code: 'NUEVA',
        label: 'Regla en blanco (desde cero)',
        description: 'Comienza con una lista vacía de materiales'
      }
    ];
    for (const r of availableRules) {
      const code = r.areaDetalles?.[currentArea] || r.defaultDetalle || r.detalle || r.tagPrefix || 'M';
      const preview = (r.subitems || []).map(s => s.desc).filter(Boolean).slice(0, 2).join(', ');
      list.push({
        value: r.id,
        code,
        label: r.trigger,
        description: preview || undefined,
        meta: `${r.subitems?.length || 0} insumos`
      });
    }
    return list;
  }, [availableRules, currentArea]);

  const detalleSubmenuOptions: ErpDropdownOption[] = useMemo(() => {
    if (isCable20Selected && cable20DetalleList.length > 0) {
      return cable20DetalleList.map(([code, items]) => ({
        value: code,
        code,
        label: `Detalle ${code}`,
        description: `${items.map(it => it.desc).slice(0, 2).join(', ')}${items.length > 2 ? '...' : ''}`,
        meta: `${items.length} insumos`,
        group: 'Variantes Cable Desnudo 2/0 AWG'
      }));
    }

    if ((isBarraPotSelected || isBarraInstSelected) && barraDetalleList.length > 0) {
      return barraDetalleList.map(([code, items]) => ({
        value: code,
        code,
        label: `Detalle ${code}`,
        description: `${items.map((it: any) => it.desc).slice(0, 2).join(', ')}${items.length > 2 ? '...' : ''}`,
        meta: `${items.length} insumos`,
        group: isBarraPotSelected ? 'Variantes Barra de Potencial' : 'Variantes Barra de Instrumentación'
      }));
    }

    const seen = new Set<string>();
    const options: ErpDropdownOption[] = [];
    const selectedRule = selectedTemplateId ? availableRules.find(r => r.id === selectedTemplateId) : null;

    if (selectedRule) {
      const ruleCodes = Array.from(
        new Set([
          selectedRule.areaDetalles?.[currentArea] || '',
          selectedRule.defaultDetalle || '',
          selectedRule.detalle || '',
          ...getRuleDetallesForArea(selectedRule.trigger, currentArea)
        ].filter(Boolean))
      );

      for (const code of ruleCodes) {
        seen.add(code);
        const catMatch = filteredDetalleOptions.find(d => d.code === code);
        options.push({
          value: code,
          code,
          label: `Detalle ${code}`,
          description: catMatch?.description || `Detalle asignado a ${selectedRule.trigger}`,
          meta: 'De esta regla',
          group: 'Detalles de esta regla'
        });
      }
    }

    for (const d of filteredDetalleOptions) {
      if (seen.has(d.code)) continue;
      seen.add(d.code);
      options.push({
        value: d.code,
        code: d.code,
        label: `Detalle ${d.code}`,
        description: d.description || d.area,
        group: 'Catálogo de detalles constructivos'
      });
    }

    for (const [code, items] of getDetallesForArea(currentArea, currentSubArea)) {
      if (seen.has(code)) continue;
      seen.add(code);
      options.push({
        value: code,
        code,
        label: `Detalle ${code}`,
        description: `${items.map(it => it.desc).slice(0, 2).join(', ')}${items.length > 2 ? '...' : ''}`,
        meta: `${items.length} insumos`,
        group: 'Variantes Cable 2/0 AWG'
      });
    }

    for (const [code, items] of Object.entries(getBarraVariants('BARRA_POT', currentSubArea))) {
      if (seen.has(code)) continue;
      seen.add(code);
      options.push({
        value: code,
        code,
        label: `Detalle ${code}`,
        description: `${items.map((it: any) => it.desc).slice(0, 2).join(', ')}`,
        meta: `${items.length} insumos`,
        group: 'Variantes Barra'
      });
    }

    for (const [code, items] of Object.entries(getBarraVariants('BARRA_INST', currentSubArea))) {
      if (seen.has(code)) continue;
      seen.add(code);
      options.push({
        value: code,
        code,
        label: `Detalle ${code}`,
        description: `${items.map((it: any) => it.desc).slice(0, 2).join(', ')}`,
        meta: `${items.length} insumos`,
        group: 'Variantes Barra'
      });
    }

    return options;
  }, [
    isCable20Selected,
    cable20DetalleList,
    isBarraPotSelected,
    isBarraInstSelected,
    barraDetalleList,
    selectedTemplateId,
    availableRules,
    currentArea,
    filteredDetalleOptions
  ]);

  if (!isOpen) return null;

  const handleAddSubitem = () => {
    setSubitems(prev => [...prev, { id: uid(), desc: '', qty: 1, unit: 'UND', formula: '', material: 'C', optional: false }]);
  };

  const handleUpdateSubitem = (id: string, field: keyof RuleSubitem, value: any) => {
    setSubitems(prev =>
      prev.map(s => {
        if (s.id === id) {
          if (field === 'qty') {
            const num = Number(value);
            return { ...s, qty: isNaN(num) || String(value).trim() === '' ? value : num };
          }
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleRemoveSubitem = (id: string) => {
    setSubitems(prev => prev.filter(s => s.id !== id));
  };

  const handleTriggerChange = (newTrigger: string) => {
    setTrigger(newTrigger);
    if (isNew && !detalle.trim()) {
      const defs = getRuleDetallesForArea(newTrigger, currentArea);
      if (defs.length > 0 && defs[0]) {
        setDetalle(defs[0]);
        setSelectedVariantCode(defs[0]);
      }
    }
  };

  const handleSave = () => {
    const cleanTrigger = trigger.trim().toUpperCase();
    if (!cleanTrigger) return;
    const cleanDetalle = detalle.trim().toUpperCase();

    const updatedAreaDetalles: Record<string, string> = {
      ...(initialRule?.areaDetalles || {}),
      [currentArea]: cleanDetalle
    };

    const rule: TakeoffRule = {
      ...initialRule,
      id: isNew ? uid() : (initialRule?.id || uid()),
      trigger: cleanTrigger,
      defaultDetalle: cleanDetalle,
      detalle: cleanDetalle,
      tagPrefix: tagPrefix.trim().toUpperCase() || 'M',
      allowDetalleEdit,
      areas: initialRule?.areas?.length ? initialRule.areas : [currentArea],
      areaDetalles: updatedAreaDetalles,
      subitems: subitems.map(s => {
        const { subitemDetalle, ...rest } = s;
        return {
          ...rest,
          id: isNew ? uid() : (s.id || uid())
        };
      })
    };
    onSave(rule, isNew);
    onClose();
  };

  const detalleSubmenuLabel = isCable20Selected
    ? 'Detalle constructivo (Cable 2/0):'
    : isBarraPotSelected
      ? 'Detalle constructivo (Barra Potencial):'
      : isBarraInstSelected
        ? 'Detalle constructivo (Barra Instrumentación):'
        : 'Detalle constructivo (catálogo / variante):';

  return (
    <ModalShell
      title={isNew ? (initialRule ? `Nueva regla (basada en ${initialRule.trigger})` : 'Nueva regla de metrado') : 'Editar regla de metrado'}
      subtitle={trigger.trim() || 'Regla'}
      onClose={onClose}
      maxWidth="1050px"
    >
      <div className="modal-body prompt">
        {/* TEMPLATE & CONSTRUCTIVE DETAIL PICKER WHEN CREATING NEW RULE */}
        {isNew && (
          <div
            style={{
              marginBottom: '1.2rem',
              padding: '12px 14px',
              background: 'var(--s1)',
              borderRadius: '3px',
              border: '1px solid var(--b1)'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--mu)',
                marginBottom: '10px'
              }}
            >
              Plantilla base y detalle constructivo (opcional)
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                alignItems: 'end'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx)' }}>
                  Regla base:
                </span>
                <ErpDropdown
                  ariaLabel="Regla base"
                  value={selectedTemplateId}
                  options={templateDropdownOptions}
                  placeholder="Regla en blanco (desde cero)"
                  searchPlaceholder="Buscar regla base o código..."
                  onChange={handleSelectTemplate}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx)' }}>
                  {detalleSubmenuLabel}
                </span>
                <ErpDropdown
                  ariaLabel="Detalle constructivo"
                  value={selectedVariantCode || detalle}
                  options={detalleSubmenuOptions}
                  placeholder="Seleccionar detalle constructivo..."
                  searchPlaceholder="Filtrar por código o material..."
                  accent={true}
                  onChange={handleSelectAnyDetalleOption}
                />
              </div>
            </div>
          </div>
        )}

        {/* ROW 1: DISPARADOR, DETALLE CONSTRUCTIVO, PREFIJO TAG IN ONE CLEAN LINE */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr', gap: '1rem', marginBottom: '1.2rem', alignItems: 'end' }}>
          <label style={{ margin: 0 }}>
            Disparador / Nombre de Regla:
            <input
              id="modal-trigger"
              type="text"
              value={trigger}
              placeholder="Ej. CABLE DESNUDO 4/0 AWG"
              onChange={e => handleTriggerChange(e.target.value.toUpperCase())}
            />
          </label>

          <label style={{ margin: 0 }}>
            Código DETALLE Constructivo:
            <input
              type="text"
              value={detalle}
              placeholder="Ej. 167/G1, 008/3A"
              onChange={e => {
                const val = e.target.value.toUpperCase();
                setDetalle(val);
                setSelectedVariantCode(val);
              }}
            />
          </label>

          <label style={{ margin: 0 }}>
            Prefijo TAG (M, C, TT, PC, SE):
            <input
              type="text"
              value={tagPrefix}
              placeholder="Ej. C"
              onChange={e => setTagPrefix(e.target.value.toUpperCase())}
            />
          </label>
        </div>



        {/* SUBITEMS TABLE (NO REDUNDANT DETALLE COLUMN) */}
        <div className="prompt-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0 }}>Ítems asociados (Lista de Materiales P / C)</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={handleAddSubitem}>
            + Agregar material
          </button>
        </div>

        {subitems.length === 0 ? (
          <p className="prompt-note">Sin materiales asociados. Agrega al menos una línea.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="prompt-table" id="modal-subitems" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '105px' }}>MAT</th>
                  <th>Descripción del Material</th>
                  <th style={{ width: '85px' }}>Cantidad</th>
                  <th style={{ width: '190px' }}>Fórmula / Expresión</th>
                  <th style={{ width: '75px' }}>Unidad</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Opcional</th>
                  <th style={{ width: '50px' }} />
                </tr>
              </thead>
              <tbody>
                {subitems.map((s, i) => (
                  <tr key={s.id} id={`sub-row-${s.id}`}>
                    <td>
                      <select
                        value={s.material === 'P' ? 'P' : 'C'}
                        aria-label={`MAT ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'material', e.target.value)}
                        style={{
                          width: '100%',
                          minWidth: '95px',
                          padding: '6px 4px',
                          fontSize: '11px',
                          fontFamily: 'var(--mo)',
                          fontWeight: 500,
                          border: s.material === 'P' ? '1px solid #a7f3d0' : '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: s.material === 'P' ? '#f0fdf4' : '#ffffff',
                          color: s.material === 'P' ? '#107c41' : '#111827',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="P">P (Prin.)</option>
                        <option value="C">C (Cons.)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.desc}
                        aria-label={`Descripción ${i + 1}`}
                        placeholder="Descripción técnica del material"
                        onChange={e => handleUpdateSubitem(s.id, 'desc', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.qty}
                        aria-label={`Cantidad ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'qty', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.formula || ''}
                        aria-label={`Fórmula ${i + 1}`}
                        placeholder="count * 1 o length * 0.5"
                        onChange={e => handleUpdateSubitem(s.id, 'formula', e.target.value)}
                        style={{ width: '100%', fontFamily: 'monospace' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.unit}
                        aria-label={`Unidad ${i + 1}`}
                        placeholder="UND, m"
                        onChange={e => handleUpdateSubitem(s.id, 'unit', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(s.optional)}
                        aria-label={`Opcional ${i + 1}`}
                        onChange={e => handleUpdateSubitem(s.id, 'optional', e.target.checked)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        aria-label={`Eliminar fila ${i + 1}`}
                        onClick={() => handleRemoveSubitem(s.id)}
                        style={{ padding: '0.2rem 0.5rem' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="prompt-note" style={{ marginTop: '0.8rem' }}>
          {formulaHint(subitems.map(s => s.formula || ''))}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--b2, #181c24)' }}>
          <div>
            {!isNew && onDelete && (
              <button
                type="button"
                className="btn-danger"
                onClick={async () => {
                  const ok = await siteConfirm(`¿Eliminar la regla "${trigger}"?`);
                  if (ok) {
                    onDelete(initialRule?.id || '');
                    onClose();
                  }
                }}
              >
                Eliminar regla
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Guardar regla
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
