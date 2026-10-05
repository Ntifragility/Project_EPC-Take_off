import React, { useState, useEffect } from 'react';
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

export const RulesView: React.FC = () => {
  const rules = useRulesStore(state => state.rules);
  const loadRules = useRulesStore(state => state.loadRules);
  const saveRule = useRulesStore(state => state.saveRule);
  const deleteRule = useRulesStore(state => state.deleteRule);
  const saveDetalleVariant = useRulesStore(state => state.saveDetalleVariant);
  const deleteDetalleVariant = useRulesStore(state => state.deleteDetalleVariant);
  const activeArea = useAppStore(state => state.activeArea);
  const section = useAppStore(state => state.section);

  useEffect(() => {
    loadRules(section);
  }, [section, loadRules]);

  const handleDeleteRule = (id: string) => {
    deleteRule(id, section);
  };

  const handleSaveRule = (rule: TakeoffRule, isNewRule: boolean) => {
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

  // Cable tray matrix modal state
  const [cableTrayModalOpen, setCableTrayModalOpen] = useState(false);
  const [editingCableTrayRule, setEditingCableTrayRule] = useState<TakeoffRule | null>(null);

  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [editingDetalle, setEditingDetalle] = useState<{
    code: string;
    area: string;
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST';
    items: DetalleVariantItem[];
  } | null>(null);

  const areaDetalles = getDetallesForArea(activeArea);
  const currentAreaCodes: string[] = areaDetalles.map(([c]) => c);
  const catalogRules = getCatalogForArea(rules, activeArea);

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
    setEditingDetalle({
      code,
      area: activeArea,
      category,
      items: items && items.length > 0 ? items : getDetalleItemsForCode(code, category)
    });
    setDetalleModalOpen(true);
  };

  const handleOpenDirectDetalle = () => {
    const firstCode = currentAreaCodes[0] || 'ND';
    const items = getDetalleItemsForCode(firstCode, 'CABLE_2_0');
    handleOpenDetalleEdit(firstCode, items, 'CABLE_2_0');
  };

  const handleOpenNew = () => {
    setEditingRule(null);
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: TakeoffRule) => {
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

  const allExpanded = catalogRules.length > 0 && catalogRules.every(r => expandedRules.has(r.id));

  const toggleAllExpand = () => {
    if (allExpanded) {
      setExpandedRules(new Set());
    } else {
      setExpandedRules(new Set(catalogRules.map(r => r.id)));
    }
  };

  return (
    <div>
      <div className="view-hd">
        <div>
          <div className="view-title">
            REGLAS DE AUTO-LLENADO &bull; {activeArea === 'AREA HUMEDA' ? 'ÁREA HÚMEDA' : 'ÁREA SECA'}
          </div>
          <div className="view-sub">
            {activeArea === 'AREA HUMEDA'
              ? 'Reglas y matrices constructivas para Área Húmeda.'
              : 'Reglas y matrices estándar para Área Seca.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {catalogRules.length > 0 && (
            <button
              className="btn-ghost"
              onClick={toggleAllExpand}
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              {allExpanded ? '▲ COLAPSAR TODAS' : '▼ EXPANDIR TODAS'}
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={handleOpenDirectDetalle}
            style={{ fontSize: '11px', padding: '6px 14px' }}
            title="Abrir editor para cualquier detalle constructivo de esta área"
          >
            EDITAR DETALLES
          </button>
          <button className="btn-primary" onClick={handleOpenNew}>
            + NUEVA REGLA
          </button>
        </div>
      </div>

      {catalogRules.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">—</div>
          <div className="empty-title">Sin reglas para esta área</div>
          <div className="empty-sub">Crea una regla o cambia de área de trabajo</div>
        </div>
      ) : (
        <div className="rules-catalog">
        {catalogRules.map(r => {
          const isExpanded = expandedRules.has(r.id);

          // CABLE DESNUDO 4/0 AWG in Area Humeda
          if (r.id === 'r1' && activeArea === 'AREA HUMEDA') {
            return (
              <Cable40RuleCard
                key={r.id}
                rule={r}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRule}
              />
            );
          }

          // CABLE DESNUDO 2/0 AWG
          if (r.id === 'r2') {
            return (
              <Cable20RuleCard
                key={r.id}
                rule={r}
                activeArea={activeArea}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRule}
                onEditDetalle={(code, items) => handleOpenDetalleEdit(code, items, 'CABLE_2_0')}
              />
            );
          }

          // BARRA POT in Area Humeda
          if (r.id === 'r8' && activeArea === 'AREA HUMEDA') {
            return (
              <BarraRuleCard
                key={r.id}
                rule={r}
                category="BARRA_POT"
                activeArea={activeArea}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRule}
                onEditDetalle={handleOpenDetalleEdit}
              />
            );
          }

          // BARRA INST in Area Humeda
          if (r.id === 'r9' && activeArea === 'AREA HUMEDA') {
            return (
              <BarraRuleCard
                key={r.id}
                rule={r}
                category="BARRA_INST"
                activeArea={activeArea}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleRuleExpand(r.id)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRule}
                onEditDetalle={handleOpenDetalleEdit}
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
                onEdit={handleOpenCableTrayEdit}
                onDelete={handleDeleteRule}
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
              onEdit={handleOpenEdit}
              onDelete={handleDeleteRule}
            />
          );
        })}
        </div>
      )}

      <RuleEditorModal
        isOpen={modalOpen}
        initialRule={editingRule}
        isNew={isNew}
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
              category: editingDetalle.category,
              items: itemsForCode
            });
          }}
          onClose={() => setDetalleModalOpen(false)}
          onSave={saveDetalleVariant}
          onDelete={deleteDetalleVariant}
        />
      )}
    </div>
  );
};
