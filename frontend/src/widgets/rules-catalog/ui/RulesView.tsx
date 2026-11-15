import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRulesStore } from '../../../features/manage-rules/model/useRulesStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { RuleEditorModal } from '../../../features/manage-rules/ui/RuleEditorModal';
import { DetalleEditorModal } from '../../../features/manage-rules/ui/DetalleEditorModal';
import { CableTrayEditorModal } from '../../../features/manage-rules/ui/CableTrayEditorModal';
import {
  getDetallesForArea,
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS,
  DetalleVariantItem
} from '../../../entities/takeoff-rule/model/detalleVariants';
import { Cable40RuleCard } from './Cable40RuleCard';
import { Cable20RuleCard } from './Cable20RuleCard';
import { BarraRuleCard } from './BarraRuleCard';
import { CableTrayRuleCard } from './CableTrayRuleCard';
import { GenericRuleCard } from './GenericRuleCard';
import { detalleBelongsToArea, getCatalogForArea } from '../../../entities/takeoff-rule/model/areaCatalog';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';
import { useAuthStore } from '../../../features/auth/model/useAuthStore';
import { getRoleLevel } from '../../../features/auth/model/authTypes';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { SubAreaHumeda } from '../../../shared/types/common';
import { uid } from '../../../shared/lib/uid';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export const RulesView: React.FC = () => {
  const showToast = useUIStore(state => state.showToast);
  const currentUser = useAuthStore(state => state.currentUser);
  const canEdit = getRoleLevel(currentUser?.role) >= 2;

  const rules = useRulesStore(state => state.rules);
  const loadRules = useRulesStore(state => state.loadRules);
  const saveRule = useRulesStore(state => state.saveRule);
  const deleteRule = useRulesStore(state => state.deleteRule);
  const saveDetalleVariant = useRulesStore(state => state.saveDetalleVariant);
  const deleteDetalleVariant = useRulesStore(state => state.deleteDetalleVariant);
  const activeArea = useAppStore(state => state.activeArea);
  const subAreaHumeda = useAppStore(state => state.subAreaHumeda);
  const setSubAreaHumeda = useAppStore(state => state.setSubAreaHumeda);
  const section = useAppStore(state => state.section);

  useEffect(() => {
    loadRules(section);
  }, [section, loadRules]);

  const handleDeleteRule = (id: string) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden eliminar reglas', 'warn');
      return;
    }
    deleteRule(id, section);
  };

  const handleSaveRule = (rule: TakeoffRule, isNewRule: boolean) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden guardar o modificar reglas', 'warn');
      return;
    }
    const withArea: TakeoffRule =
      isNewRule && !(rule.areas && rule.areas.length)
        ? { ...rule, areas: [activeArea] }
        : rule;
    saveRule(withArea, isNewRule, section);
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TakeoffRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionSlot(document.getElementById('catalog-subnav-actions'));
  }, []);

  // Cable tray matrix modal state
  const [cableTrayModalOpen, setCableTrayModalOpen] = useState(false);
  const [editingCableTrayRule, setEditingCableTrayRule] = useState<TakeoffRule | null>(null);

  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [editingDetalle, setEditingDetalle] = useState<{
    code: string;
    area: string;
    subArea?: SubAreaHumeda;
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST';
    items: DetalleVariantItem[];
  } | null>(null);

  const effectiveSubArea = activeArea === 'AREA HUMEDA' ? subAreaHumeda : 'NO_CORROSIVO';
  const areaDetalles = getDetallesForArea(activeArea, effectiveSubArea);
  const catalogRules = getCatalogForArea(rules, activeArea);

  const isCable20Trigger = (trigger: string) => {
    const up = (trigger || '').trim().toUpperCase();
    return up === 'CABLE DESNUDO 2/0 AWG' || up === 'CABLE DESNUDO 2/0' || up === 'CABLE 2/0 AWG';
  };

  const isBarraPotTrigger = (trigger: string) => {
    const up = (trigger || '').trim().toUpperCase();
    return up === 'BARRA POT' || up === 'BARRA DE POTENCIAL' || up === 'BARRA DE POTENCIAL A TIERRA';
  };

  const isBarraInstTrigger = (trigger: string) => {
    const up = (trigger || '').trim().toUpperCase();
    return up === 'BARRA INST' || up === 'BARRA DE INSTRUMENTACIÓN' || up === 'BARRA DE INSTRUMENTACION';
  };

  const cable20CustomRules = useMemo(() => {
    return catalogRules.filter(r => isCable20Trigger(r.trigger) && r.id !== 'r2');
  }, [catalogRules]);

  const currentAreaCodes: string[] = useMemo(() => {
    const set = new Set<string>(areaDetalles.map(([c]) => c));
    cable20CustomRules.forEach(r => {
      const c = r.detalle || r.defaultDetalle;
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [areaDetalles, cable20CustomRules]);

  const barraPotCustomRules = useMemo(() => {
    return catalogRules.filter(r => isBarraPotTrigger(r.trigger) && r.id !== 'r8');
  }, [catalogRules]);

  const barraInstCustomRules = useMemo(() => {
    return catalogRules.filter(r => isBarraInstTrigger(r.trigger) && r.id !== 'r9');
  }, [catalogRules]);

  const visibleCatalogRules = useMemo(() => {
    return catalogRules.filter(r => {
      if (r.id !== 'r2' && isCable20Trigger(r.trigger)) return false;
      if (r.id !== 'r8' && isBarraPotTrigger(r.trigger)) return false;
      if (r.id !== 'r9' && isBarraInstTrigger(r.trigger)) return false;
      return true;
    });
  }, [catalogRules]);

  const getDetalleItemsForCode = (
    code: string,
    cat: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0'
  ): DetalleVariantItem[] => {
    if (cat === 'BARRA_POT') {
      return (DYNAMIC_BARRA_POT_VARIANTS[code] || []) as any;
    }
    if (cat === 'BARRA_INST') {
      return (DYNAMIC_BARRA_INST_VARIANTS[code] || []) as any;
    }
    const found = areaDetalles.find(([c]) => c === code);
    return found ? found[1] : [];
  };

  const handleOpenDetalleEdit = (
    code: string,
    items: DetalleVariantItem[],
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0'
  ) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden editar materiales de detalles', 'warn');
      return;
    }
    setEditingDetalle({
      code,
      area: activeArea,
      subArea: activeArea === 'AREA HUMEDA' ? subAreaHumeda : undefined,
      category,
      items: items && items.length > 0 ? items : getDetalleItemsForCode(code, category)
    });
    setDetalleModalOpen(true);
  };

  const handleOpenNew = () => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden crear reglas', 'warn');
      return;
    }
    setEditingRule(null);
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenDuplicate = (rule: TakeoffRule) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden crear o duplicar reglas', 'warn');
      return;
    }
    const clonedRule: TakeoffRule = {
      ...rule,
      id: uid(),
      trigger: `${rule.trigger} (COPIA)`,
      subitems: rule.subitems ? rule.subitems.map(s => ({ ...s, id: uid() })) : []
    };
    setEditingRule(clonedRule);
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenDuplicateCable20Detalle = (detalleCode: string, itemsList: DetalleVariantItem[]) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden crear o duplicar reglas', 'warn');
      return;
    }
    const clonedRule: TakeoffRule = {
      id: uid(),
      trigger: `CABLE DESNUDO 2/0 AWG - DET. ${detalleCode} (COPIA)`,
      detalle: detalleCode,
      defaultDetalle: detalleCode,
      tagPrefix: 'M',
      allowDetalleEdit: true,
      areas: [activeArea],
      areaDetalles: { [activeArea]: detalleCode },
      subitems: itemsList.map(it => ({
        id: uid(),
        desc: it.desc,
        qty: typeof it.qty === 'number' ? it.qty : 1,
        unit: it.unit || 'und',
        formula: it.formula || (it.otDynamic === '1c/3m' ? 'ceil(length/3)' : ''),
        material: it.material || componentClass(it.desc),
        optional: false
      }))
    };
    setEditingRule(clonedRule);
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenDuplicateBarraDetalle = (
    detCode: string,
    vItems: DetalleVariantItem[],
    category: 'BARRA_POT' | 'BARRA_INST'
  ) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden crear o duplicar reglas', 'warn');
      return;
    }
    const prefix = category === 'BARRA_POT' ? 'BARRA DE POTENCIAL' : 'BARRA DE INSTRUMENTACIÓN';
    const clonedRule: TakeoffRule = {
      id: uid(),
      trigger: `${prefix} - DET. ${detCode} (COPIA)`,
      detalle: detCode,
      defaultDetalle: detCode,
      tagPrefix: 'M',
      allowDetalleEdit: true,
      areas: [activeArea],
      areaDetalles: { [activeArea]: detCode },
      subitems: vItems.map(it => ({
        id: uid(),
        desc: it.desc,
        qty: typeof it.qty === 'number' ? it.qty : 1,
        unit: it.unit || 'und',
        formula: it.formula || '',
        material: it.material || componentClass(it.desc),
        optional: false
      }))
    };
    setEditingRule(clonedRule);
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: TakeoffRule) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden editar reglas', 'warn');
      return;
    }
    if (
      Boolean(rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0) ||
      rule.id === 'r-001-2b-x1' ||
      rule.id === 'r-001-2b-x1-can' ||
      rule.trigger.includes('001/2B-X1') ||
      rule.trigger.includes('001/2B') ||
      Boolean(rule.detalle && rule.detalle.includes('001/2B-X1'))
    ) {
      handleOpenCableTrayEdit(rule);
      return;
    }
    setEditingRule(rule);
    setIsNew(false);
    setModalOpen(true);
  };

  const handleOpenCableTrayEdit = (rule: TakeoffRule) => {
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden editar matrices de bandejas', 'warn');
      return;
    }
    setEditingCableTrayRule(rule);
    setCableTrayModalOpen(true);
  };

  const toggleRuleExpand = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const allExpanded = visibleCatalogRules.length > 0 && visibleCatalogRules.every(r => expandedRules.has(r.id));

  const toggleAllExpand = () => {
    if (allExpanded) {
      setExpandedRules(new Set());
    } else {
      setExpandedRules(new Set(visibleCatalogRules.map(r => r.id)));
    }
  };

  return (
    <div className="catalog-pane">
      {actionSlot && createPortal(
        <>
          {visibleCatalogRules.length > 0 && (
            <button type="button" className="btn-ghost" onClick={toggleAllExpand}>
              {allExpanded ? '▲ Colapsar todas' : '▼ Expandir todas'}
            </button>
          )}
          {canEdit && (
            <button type="button" className="btn-primary" onClick={handleOpenNew}>
              + Nueva regla
            </button>
          )}
        </>,
        actionSlot
      )}
      <div className="catalog-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <p className="catalog-note" style={{ margin: 0 }}>
            {activeArea === 'AREA HUMEDA'
              ? 'Reglas y matrices constructivas para Área Húmeda.'
              : 'Reglas y matrices estándar para Área Seca.'}
          </p>

          {activeArea === 'AREA HUMEDA' && (
            <div style={{ display: 'inline-flex', borderRadius: '4px', border: '1px solid var(--b1)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setSubAreaHumeda('NO_CORROSIVO')}
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: subAreaHumeda === 'NO_CORROSIVO' ? 'var(--p1)' : 'var(--s1)',
                  color: subAreaHumeda === 'NO_CORROSIVO' ? '#fff' : 'var(--tx2)'
                }}
              >
                No Corrosivo
              </button>
              <button
                type="button"
                onClick={() => setSubAreaHumeda('CORROSIVO')}
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: subAreaHumeda === 'CORROSIVO' ? 'var(--p1)' : 'var(--s1)',
                  color: subAreaHumeda === 'CORROSIVO' ? '#fff' : 'var(--tx2)'
                }}
              >
                Corrosivo
              </button>
            </div>
          )}
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: canEdit ? 'rgba(16, 124, 65, 0.12)' : 'rgba(100, 116, 139, 0.12)',
            color: canEdit ? '#107c41' : '#64748b',
            border: canEdit ? '1px solid rgba(16, 124, 65, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)'
          }}
        >
          {canEdit ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {canEdit ? 'Edición habilitada (Level 2 / Level 3)' : 'Solo Lectura (Requiere Level 2 o Level 3)'}
        </span>
      </div>

      {visibleCatalogRules.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">—</div>
          <div className="empty-title">Sin reglas para esta área</div>
          <div className="empty-sub">Crea una regla o cambia de área de trabajo</div>
        </div>
      ) : (
        <div className="rules-catalog">
        {visibleCatalogRules.map(r => {
          const isExpanded = expandedRules.has(r.id);

          // CABLE DESNUDO 4/0 AWG in Area Humeda
          if (r.id === 'r1' && activeArea === 'AREA HUMEDA') {
            return (
              <Cable40RuleCard
                key={r.id}
                rule={r}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onEdit={canEdit ? handleOpenEdit : undefined}
                onDuplicate={canEdit ? handleOpenDuplicate : undefined}
                onDelete={canEdit ? handleDeleteRule : undefined}
              />
            );
          }

          // CABLE DESNUDO 2/0 AWG (Anchor rule or primary Cable 2/0)
          if (r.id === 'r2' || isCable20Trigger(r.trigger)) {
            return (
              <Cable20RuleCard
                key={r.id}
                rule={r}
                customRules={cable20CustomRules}
                activeArea={activeArea}
                subArea={subAreaHumeda}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onDuplicate={canEdit ? handleOpenDuplicate : undefined}
                onDelete={canEdit ? handleDeleteRule : undefined}
                onEditDetalle={canEdit ? (code, items) => handleOpenDetalleEdit(code, items, 'CABLE_2_0') : undefined}
                onDuplicateDetalle={canEdit ? handleOpenDuplicateCable20Detalle : undefined}
                onEditCustomRule={canEdit ? handleOpenEdit : undefined}
                onDeleteCustomRule={canEdit ? handleDeleteRule : undefined}
              />
            );
          }

          // BARRA POT in Area Humeda
          if ((r.id === 'r8' || isBarraPotTrigger(r.trigger)) && activeArea === 'AREA HUMEDA') {
            return (
              <BarraRuleCard
                key={r.id}
                rule={r}
                customRules={barraPotCustomRules}
                category="BARRA_POT"
                activeArea={activeArea}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onDuplicate={canEdit ? handleOpenDuplicate : undefined}
                onDelete={canEdit ? handleDeleteRule : undefined}
                onEditDetalle={canEdit ? handleOpenDetalleEdit : undefined}
                onDuplicateDetalle={canEdit ? handleOpenDuplicateBarraDetalle : undefined}
                onEditCustomRule={canEdit ? handleOpenEdit : undefined}
                onDeleteCustomRule={canEdit ? handleDeleteRule : undefined}
              />
            );
          }

          // BARRA INST in Area Humeda
          if ((r.id === 'r9' || isBarraInstTrigger(r.trigger)) && activeArea === 'AREA HUMEDA') {
            return (
              <BarraRuleCard
                key={r.id}
                rule={r}
                customRules={barraInstCustomRules}
                category="BARRA_INST"
                activeArea={activeArea}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onDuplicate={canEdit ? handleOpenDuplicate : undefined}
                onDelete={canEdit ? handleDeleteRule : undefined}
                onEditDetalle={canEdit ? handleOpenDetalleEdit : undefined}
                onDuplicateDetalle={canEdit ? handleOpenDuplicateBarraDetalle : undefined}
                onEditCustomRule={canEdit ? handleOpenEdit : undefined}
                onDeleteCustomRule={canEdit ? handleDeleteRule : undefined}
              />
            );
          }

          // DET.001/2B-X1 (Cable Tray Support / Width Matrix)
          if (
            Boolean(r.cableTrayMatrix && r.cableTrayMatrix.length > 0) ||
            r.id === 'r-001-2b-x1' ||
            r.id === 'r-001-2b-x1-can' ||
            r.trigger.includes('001/2B-X1') ||
            r.trigger.includes('001/2B') ||
            Boolean(r.detalle && r.detalle.includes('001/2B-X1'))
          ) {
            return (
              <CableTrayRuleCard
                key={r.id}
                rule={r}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onEdit={canEdit ? handleOpenCableTrayEdit : undefined}
                onDuplicate={canEdit ? handleOpenDuplicate : undefined}
                onDelete={canEdit ? handleDeleteRule : undefined}
              />
            );
          }

          // Generic rules
          return (
            <GenericRuleCard
              key={r.id}
              rule={r}
              activeArea={activeArea}
              isExpanded={isExpanded}
              onToggleExpand={() => toggleRuleExpand(r.id)}
              onEdit={canEdit ? handleOpenEdit : undefined}
              onDuplicate={canEdit ? handleOpenDuplicate : undefined}
              onDelete={canEdit ? handleDeleteRule : undefined}
            />
          );
        })}
        </div>
      )}

      <RuleEditorModal
        isOpen={modalOpen}
        initialRule={editingRule}
        isNew={isNew}
        activeArea={activeArea}
        availableRules={rules}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveRule}
        onDelete={handleDeleteRule}
      />

      <CableTrayEditorModal
        isOpen={cableTrayModalOpen}
        rule={editingCableTrayRule}
        onClose={() => setCableTrayModalOpen(false)}
        onSave={(updatedRule) => {
          saveRule(updatedRule, false, section);
          setCableTrayModalOpen(false);
        }}
        onDelete={handleDeleteRule}
      />

      {editingDetalle && (
        <DetalleEditorModal
          isOpen={detalleModalOpen}
          area={editingDetalle.area}
          subArea={editingDetalle.subArea}
          detalleCode={editingDetalle.code}
          category={editingDetalle.category}
          initialItems={editingDetalle.items}
          availableCodes={
            editingDetalle.category === 'BARRA_POT'
              ? Object.keys(DYNAMIC_BARRA_POT_VARIANTS).filter(code =>
                  detalleBelongsToArea(code, activeArea)
                )
              : editingDetalle.category === 'BARRA_INST'
                ? Object.keys(DYNAMIC_BARRA_INST_VARIANTS).filter(code =>
                    detalleBelongsToArea(code, activeArea)
                  )
                : currentAreaCodes
          }
          onSelectDetalle={(newCode: string) => {
            const itemsForCode = getDetalleItemsForCode(newCode, editingDetalle.category);
            setEditingDetalle({
              code: newCode,
              area: activeArea,
              subArea: editingDetalle.subArea,
              category: editingDetalle.category,
              items: itemsForCode
            });
          }}
          onClose={() => setDetalleModalOpen(false)}
          onSave={(area, code, items, cat) => saveDetalleVariant(area, code, items, cat, editingDetalle.subArea)}
          onDelete={(area, code, cat) => deleteDetalleVariant(area, code, cat, editingDetalle.subArea)}
        />
      )}
    </div>
  );
};
