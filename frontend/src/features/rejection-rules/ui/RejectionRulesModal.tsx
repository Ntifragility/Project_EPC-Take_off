import React, { useEffect, useMemo, useState } from 'react';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { useRejectionRulesStore } from '../model/useRejectionRulesStore';
import {
  RejectionRule,
  RejectionRuleScope,
  REJECTION_RULE_SCOPES,
  scopeLabel
} from '../model/rejectionRules';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { siteConfirm } from '../../../shared/ui/askSite';

function ParamEditor({
  rule,
  onChange
}: {
  rule: RejectionRule;
  onChange: (params: Record<string, string | boolean | number>) => void;
}) {
  if (rule.paramDefs.length === 0) {
    return (
      <div style={{ fontSize: '11px', color: 'var(--mu)', fontStyle: 'italic' }}>
        Sin parámetros configurables.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rule.paramDefs.map(def => {
        const value = rule.params[def.key];
        return (
          <label key={def.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx-hd)' }}>
              {def.label}
              {def.hint && (
                <span style={{ fontWeight: 400, color: 'var(--mu)' }}> — {def.hint}</span>
              )}
            </span>
            {def.type === 'boolean' ? (
              <button
                type="button"
                onClick={() => onChange({ ...rule.params, [def.key]: !(value === true) })}
                className={`modal-choice${value === true ? ' is-active' : ''}`}
                style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}
              >
                {value === true ? 'SÍ' : 'NO'}
              </button>
            ) : def.type === 'number' ? (
              <input
                type="number"
                step="any"
                className="input"
                value={typeof value === 'number' ? value : Number(value) || 0}
                onChange={e => onChange({ ...rule.params, [def.key]: parseFloat(e.target.value) || 0 })}
                style={{ fontFamily: 'var(--mo)', fontSize: '12px', maxWidth: '220px' }}
              />
            ) : (
              <input
                type="text"
                className="input"
                value={typeof value === 'string' ? value : String(value ?? '')}
                onChange={e => onChange({ ...rule.params, [def.key]: e.target.value })}
                style={{ fontFamily: 'var(--mo)', fontSize: '12px' }}
                spellCheck={false}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

export const RejectionRulesModal: React.FC = () => {
  const showModal = useRejectionRulesStore(state => state.showModal);
  const setShowModal = useRejectionRulesStore(state => state.setShowModal);
  const rules = useRejectionRulesStore(state => state.rules);
  const loaded = useRejectionRulesStore(state => state.loaded);
  const syncing = useRejectionRulesStore(state => state.syncing);
  const loadRules = useRejectionRulesStore(state => state.loadRules);
  const saveRule = useRejectionRulesStore(state => state.saveRule);
  const resetRule = useRejectionRulesStore(state => state.resetRule);
  const resetAll = useRejectionRulesStore(state => state.resetAll);
  const showToast = useUIStore(state => state.showToast);

  const [scopeFilter, setScopeFilter] = useState<'TODAS' | RejectionRuleScope>('TODAS');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, RejectionRule>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (showModal && !loaded) void loadRules();
  }, [showModal, loaded, loadRules]);

  useEffect(() => {
    if (!showModal) setDrafts({});
  }, [showModal]);

  if (!showModal) return null;

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return rules.filter(r => {
      if (scopeFilter !== 'TODAS' && r.scope !== scopeFilter) return false;
      if (!q) return true;
      return (
        r.name.toUpperCase().includes(q) ||
        r.id.toUpperCase().includes(q) ||
        r.message.toUpperCase().includes(q) ||
        (r.description || '').toUpperCase().includes(q)
      );
    });
  }, [rules, scopeFilter, search]);

  const effective = (rule: RejectionRule): RejectionRule => drafts[rule.id] || rule;
  const isDirty = (rule: RejectionRule): boolean => Boolean(drafts[rule.id]);

  const patchDraft = (rule: RejectionRule, patch: Partial<RejectionRule>) => {
    setDrafts(prev => ({ ...prev, [rule.id]: { ...effective(rule), ...patch } }));
  };

  const handleSave = async (rule: RejectionRule) => {
    const draft = effective(rule);
    setSavingId(rule.id);
    try {
      const ok = await saveRule(draft);
      setDrafts(prev => {
        const next = { ...prev };
        delete next[rule.id];
        return next;
      });
      showToast(
        ok ? `Regla "${draft.name}" guardada` : `Regla "${draft.name}" guardada localmente (sin BD)`,
        ok ? 'success' : 'warn'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleDiscard = (rule: RejectionRule) => {
    setDrafts(prev => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });
  };

  const handleResetOne = async (rule: RejectionRule) => {
    if (!(await siteConfirm(`¿Restaurar "${rule.name}" a sus valores de fábrica?`))) return;
    const ok = await resetRule(rule.id);
    setDrafts(prev => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });
    showToast(ok ? 'Regla restaurada' : 'Regla restaurada localmente (sin BD)', ok ? 'success' : 'warn');
  };

  const handleResetAll = async () => {
    if (!(await siteConfirm('¿Restaurar TODAS las reglas de rechazo a sus valores de fábrica?'))) return;
    const ok = await resetAll();
    setDrafts({});
    showToast(ok ? 'Todas las reglas restauradas' : 'Restauradas localmente (sin BD)', ok ? 'success' : 'warn');
  };

  return (
    <ModalShell
      title="Reglas de Rechazo de Excel"
      subtitle="Qué filas se rechazan al importar, con qué mensaje, y con qué parámetros"
      onClose={() => setShowModal(false)}
      maxWidth="920px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            color: '#93c5fd',
            fontSize: '12px',
            lineHeight: 1.5
          }}
        >
          💡 Apaga una regla para que esa validación deje de rechazar filas. Edita el <strong>mensaje</strong> que aparece en la columna MOTIVO_RECHAZO y ajusta sus <strong>parámetros</strong> (p. ej. prefijos de TAG permitidos o el patrón del plano). Los cambios se guardan en Supabase y aplican al próximo archivo que importes.
          {syncing && ' Sincronizando…'}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value as 'TODAS' | RejectionRuleScope)}
            style={{ fontSize: '12px', maxWidth: '220px' }}
            aria-label="Filtrar por importación"
          >
            <option value="TODAS">Todas las importaciones</option>
            {REJECTION_RULE_SCOPES.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar regla o mensaje…"
            style={{ fontSize: '12px', flex: 1, minWidth: '200px' }}
          />
          <button type="button" className="btn-ghost" onClick={() => void handleResetAll()} title="Restaurar todas las reglas a fábrica">
            Restaurar todo
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '56vh', overflowY: 'auto', paddingRight: '2px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--mu)', fontSize: '12px' }}>
              Sin reglas para este filtro.
            </div>
          )}
          {filtered.map(rule => {
            const eff = effective(rule);
            const dirty = isDirty(rule);
            return (
              <div
                key={rule.id}
                style={{
                  border: dirty ? '1px solid var(--accent)' : '1px solid var(--b1)',
                  borderRadius: '8px',
                  background: 'var(--s1)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => patchDraft(rule, { enabled: !eff.enabled })}
                    className={`modal-choice${eff.enabled ? ' is-active' : ''}`}
                    style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    title={eff.enabled ? 'Clic para desactivar esta validación' : 'Clic para activar esta validación'}
                  >
                    {eff.enabled ? '● ACTIVA' : '○ APAGADA'}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tx-hd)' }}>{eff.name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8'
                        }}
                      >
                        {scopeLabel(eff.scope)}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--mu)', fontFamily: 'var(--mo)' }}>{eff.id}</span>
                      {dirty && (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--accent)' }}>● sin guardar</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--tx2)', marginTop: '2px' }}>{eff.description}</div>
                  </div>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx-hd)' }}>
                    Mensaje de rechazo (MOTIVO_RECHAZO)
                  </span>
                  <textarea
                    className="input"
                    value={eff.message}
                    onChange={e => patchDraft(rule, { message: e.target.value })}
                    rows={2}
                    style={{ fontSize: '12px', fontFamily: 'var(--mo)', resize: 'vertical' }}
                    spellCheck={false}
                  />
                  {/{\w+}/.test(eff.message) && (
                    <span style={{ fontSize: '10.5px', color: 'var(--mu)' }}>
                      Acepta variables entre llaves: {'{tag}'}, {'{plano}'}, {'{rule}'}, {'{detalle}'}, {'{origen}'}, {'{prefixes}'}.
                    </span>
                  )}
                </label>

                <ParamEditor rule={eff} onChange={params => patchDraft(rule, { params })} />

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {dirty && (
                    <button type="button" className="btn-ghost" onClick={() => handleDiscard(rule)}>
                      Descartar
                    </button>
                  )}
                  <button type="button" className="btn-ghost" onClick={() => void handleResetOne(rule)} title="Volver a valores de fábrica">
                    Restaurar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!dirty || savingId === rule.id}
                    onClick={() => void handleSave(rule)}
                    style={{ opacity: !dirty ? 0.5 : 1 }}
                  >
                    {savingId === rule.id ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
};
