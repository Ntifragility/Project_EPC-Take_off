import React, { useState, useEffect } from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { AreaType } from '../../../shared/types/common';
import { CABLE_TRAY_WIDTHS } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { resolveRuleRequirements } from '../model/ruleParameterResolver';
import { executeApplyRule } from '../model/useApplyRule';
import { getSequentialTagsExample } from '../../../entities/takeoff-item/model/tagGenerator';
import { hasSoporteItems, hasJumperItems } from '../../../entities/takeoff-rule/model/detalleVariants';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRule) return;

    executeApplyRule(activeRule, {
      count: effCount,
      baseTag: baseTag.trim().toUpperCase(),
      detalleCode: detalleCode.trim().toUpperCase(),
      numSoportes: showSoportes ? effSoportes : 1,
      numJumpers: showJumpers ? effJumpers : 1,
      incluirTuberia: incluirTuberia && detalleCode.trim().toUpperCase() === '008/3A',
      cableTrayWidth
    });

    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: '600px', width: '94vw' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.35rem' }}>⚡</span>
            <div>
              <h3 style={{ margin: 0 }}>Aplicar Regla</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeRule.trigger}</div>
            </div>
          </div>
          <button className="btn btn-icon modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
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
                      className="btn"
                      style={{
                        padding: '0.5rem 0.2rem',
                        fontSize: '0.82rem',
                        fontWeight: cableTrayWidth === w ? 'bold' : 'normal',
                        borderColor: cableTrayWidth === w ? 'var(--accent)' : 'var(--border)',
                        backgroundColor: cableTrayWidth === w ? 'var(--accent-dim)' : 'transparent',
                        color: cableTrayWidth === w ? 'var(--accent)' : 'var(--text)',
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
          {req.isSoldadura40_20 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {['008/4T2', '167/X2'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDetalleCode(d)}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderColor: detalleCode === d ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: detalleCode === d ? 'var(--accent-dim)' : 'transparent',
                      color: detalleCode === d ? 'var(--accent)' : 'var(--text)'
                    }}
                  >
                    {d} {d === '008/4T2' ? '(Área Húmeda)' : '(Área Seca)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {req.isSoldadura40 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {['008/4T1', '167/X1'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDetalleCode(d)}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderColor: detalleCode === d ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: detalleCode === d ? 'var(--accent-dim)' : 'transparent',
                      color: detalleCode === d ? 'var(--accent)' : 'var(--text)'
                    }}
                  >
                    {d} {d === '008/4T1' ? '(Área Húmeda)' : '(Área Seca)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {req.isCable40 && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {['008/3A', '008/3B', '167/G1'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDetalleCode(d);
                      if (d !== '008/3A') setIncluirTuberia(false);
                    }}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderColor: detalleCode === d ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: detalleCode === d ? 'var(--accent-dim)' : 'transparent',
                      color: detalleCode === d ? 'var(--accent)' : 'var(--text)'
                    }}
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
                border: '1px solid var(--border)',
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

          {(req.isBarraPot || req.isBarraInst) && (
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                DETALLE CONSTRUCTIVO:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {(req.isBarraPot ? ['010/17A', '010/17B', '166A'] : ['010/17C', '010/17D', '166C']).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDetalleCode(d)}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderColor: detalleCode === d ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: detalleCode === d ? 'var(--accent-dim)' : 'transparent',
                      color: detalleCode === d ? 'var(--accent)' : 'var(--text)'
                    }}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
              Insertar {effCount > 1 ? `${effCount} Ítems` : 'Ítem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
