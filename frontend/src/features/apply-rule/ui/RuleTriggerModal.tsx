import React, { useState, useEffect } from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { AreaType } from '../../../shared/types/common';
import { CABLE_TRAY_WIDTHS } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { resolveRuleRequirements } from '../model/ruleParameterResolver';
import { executeApplyRule } from '../model/useApplyRule';
import { getSequentialTagsExample } from '../../../entities/takeoff-item/model/tagGenerator';
import { hasSoporteItems, hasJumperItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { getRuleInsertPreview } from '../../../entities/takeoff-rule/model/ruleInsertPreview';
import { ModalShell } from '../../../shared/ui/ModalShell';

export interface RuleTriggerModalProps {
  isOpen: boolean;
  rule: TakeoffRule | null;
  activeArea: AreaType;
  onClose: () => void;
}

export const RuleTriggerModal: React.FC<RuleTriggerModalProps> = ({
  isOpen,
  rule,
  activeArea,
  onClose
}) => {
  const storeRule = useRulesStore(state => state.rules.find(r => r.id === rule?.id));
  const activeRule = storeRule || rule;

  const [count, setCount] = useState<number>(1);
  const [baseTag, setBaseTag] = useState<string>('01');
  const [detalleCode, setDetalleCode] = useState<string>('');
  const [numSoportes, setNumSoportes] = useState<number>(1);
  const [numJumpers, setNumJumpers] = useState<number>(1);
  const [cableTrayWidth, setCableTrayWidth] = useState<string>('900 mm');
  const [incluirTuberia, setIncluirTuberia] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && activeRule) {
      const req = resolveRuleRequirements(activeRule, activeArea);
      setCount(1);
      setBaseTag(`${req.defaultTagPrefix}01`);
      setDetalleCode(req.defaultDetalle);
      setNumSoportes(1);
      setNumJumpers(1);
      setIncluirTuberia(false);
      setCableTrayWidth(prev => (prev && ['900 mm', '600 mm', '450 mm', '300 mm'].includes(prev)) ? prev : '900 mm');
    }
  }, [isOpen, activeRule?.id, activeArea]);

  if (!isOpen || !activeRule) return null;

  const req = resolveRuleRequirements(activeRule, activeArea);
  const effCount = Math.max(1, count);
  const effSoportes = Math.max(1, numSoportes);
  const effJumpers = Math.max(1, numJumpers);

  const showSoportes =
    req.requiresSoportes ||
    (req.isCable20 && hasSoporteItems(detalleCode, activeArea)) ||
    ((req.isBarraPot || req.isBarraInst) && activeArea === 'AREA HUMEDA');

  const showJumpers =
    req.requiresJumpers ||
    (req.isCable20 && hasJumperItems(detalleCode, activeArea)) ||
    detalleCode.toUpperCase().includes('JUMPER');

  const isDirty =
    count !== 1 ||
    baseTag !== `${req.defaultTagPrefix}01` ||
    detalleCode !== req.defaultDetalle ||
    numSoportes !== 1 ||
    numJumpers !== 1 ||
    incluirTuberia ||
    cableTrayWidth !== '900 mm';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRule) return;

    const applied = executeApplyRule(activeRule, {
      count: effCount,
      baseTag: baseTag.trim().toUpperCase(),
      detalleCode: detalleCode.trim().toUpperCase(),
      numSoportes: showSoportes ? effSoportes : 1,
      numJumpers: showJumpers ? effJumpers : 1,
      incluirTuberia: incluirTuberia && detalleCode.trim().toUpperCase() === '008/3A',
      cableTrayWidth
    });

    if (applied) onClose();
  };

  return (
    <ModalShell title="Aplicar regla" subtitle={activeRule.trigger} onClose={onClose} maxWidth="600px" dismiss="dirty-confirm" isDirty={isDirty}>
        <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div
            style={{
              marginBottom: '1.2rem',
              padding: '0.55rem 0.75rem',
              border: '1px solid var(--b1)',
              borderRadius: '6px',
              background: 'var(--s2)',
              fontSize: '0.8rem',
              color: 'var(--mu)',
              lineHeight: 1.4
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--tx-hd)', marginBottom: '2px' }}>Se insertará</div>
            {getRuleInsertPreview(activeRule, activeArea)}
          </div>

          {/* CABLE TRAY WIDTH SELECTION */}
          {req.isCableTray && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                ANCHO DE BANDEJA / ESCALERILLA (CABLE TRAY WIDTH):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {CABLE_TRAY_WIDTHS.map(w => {
                  const strutItem = activeRule.cableTrayMatrix?.[0];
                  const strutVal = strutItem
                    ? (w === '900 mm' ? strutItem.w900 : w === '600 mm' ? strutItem.w600 : w === '450 mm' ? strutItem.w450 : strutItem.w300)
                    : (w === '900 mm' ? '1.20' : w === '600 mm' ? '0.76' : w === '450 mm' ? '0.61' : '0.46');

                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setCableTrayWidth(w)}
                      className={`modal-choice${cableTrayWidth === w ? ' is-active' : ''}`}
                      style={{
                        padding: '0.5rem 0.2rem',
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span>{w}</span>
                      <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 'normal' }}>
                        {strutVal} m
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETALLE CONSTRUCTIVO SELECTION */}
          {req.isSoldadura40_20 && req.availableDetalles.length > 0 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {req.availableDetalles.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDetalleCode(d)}
                    className={`modal-choice${detalleCode === d ? ' is-active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {req.isSoldadura40 && req.availableDetalles.length > 0 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {req.availableDetalles.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDetalleCode(d)}
                    className={`modal-choice${detalleCode === d ? ' is-active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {req.isCable40 && req.availableDetalles.length > 0 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {req.availableDetalles.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDetalleCode(d);
                      if (d !== '008/3A') setIncluirTuberia(false);
                    }}
                    className={`modal-choice${detalleCode === d ? ' is-active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    {d} {d === '008/3B' ? '(Con Cemento)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {req.isCable40 && detalleCode === '008/3A' && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1.35rem',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--b1)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={incluirTuberia}
                onChange={e => setIncluirTuberia(e.target.checked)}
              />
              Incluir TUBERÍA PVC SCH 80 Ø3/4" (opcional, tramos horizontales)
            </label>
          )}

          {req.isCable20 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO ({activeArea}):
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={detalleCode}
                onChange={e => setDetalleCode(e.target.value)}
              >
                {req.availableDetalles.map(d => (
                  <option key={d} value={d}>
                    DETALLE {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(req.isBarraPot || req.isBarraInst) && req.availableDetalles.length > 0 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {req.availableDetalles.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDetalleCode(d)}
                    className={`modal-choice${detalleCode === d ? ' is-active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INSTANCES COUNT & BASE TAG */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginBottom: '1.35rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                CANTIDAD (INSTANCIAS):
              </label>
              <input
                type="number"
                min={0}
                max={500}
                className="input"
                style={{ width: '100%' }}
                value={count}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setCount(isNaN(v) ? 0 : Math.max(0, v));
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                TAG EN PLANO (BASE):
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={baseTag}
                onFocus={e => e.target.select()}
                onChange={e => setBaseTag(e.target.value)}
                placeholder="ej: M01, C01, SE01"
                required
              />
            </div>
          </div>

          {effCount > 1 && (
            <div
              style={{
                marginBottom: '1.35rem',
                fontSize: '0.8rem',
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-dim)',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px'
              }}
            >
              <strong>Generará {effCount} TAGs:</strong> {getSequentialTagsExample(baseTag, effCount)}
            </div>
          )}

          {/* DYNAMIC MULTIPLIERS */}
          {(showSoportes || showJumpers) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.35rem' }}>
              {showSoportes && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    SOPORTES POR ÍTEM:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    className="input"
                    style={{ width: '100%' }}
                    value={numSoportes}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      setNumSoportes(isNaN(v) ? 0 : Math.max(0, v));
                    }}
                  />
                </div>
              )}
              {showJumpers && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    JUMPERS POR ÍTEM:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    className="input"
                    style={{ width: '100%' }}
                    value={numJumpers}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      setNumJumpers(isNaN(v) ? 0 : Math.max(0, v));
                    }}
                  />
                </div>
              )}
            </div>
          )}

        </div>
          <div className="modal-ft">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Insertar {effCount > 1 ? `${effCount} ítems` : 'ítem'}
            </button>
          </div>
        </form>
    </ModalShell>
  );
};
