import React, { useState, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
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
import { RULE_RESTORE_BUTTON_ID } from '../../../shared/ui/windowMotion';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';

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
  const minimized = useUIStore(state => state.rulePromptMinimized);
  const setRulePromptMinimized = useUIStore(state => state.setRulePromptMinimized);
  const setRuleRestoreArmed = useUIStore(state => state.setRuleRestoreArmed);

  const [count, setCount] = useState<number>(1);
  const [baseTag, setBaseTag] = useState<string>('01');
  const [detalleCode, setDetalleCode] = useState<string>('');
  const [numSoportes, setNumSoportes] = useState<number>(1);
  const [numJumpers, setNumJumpers] = useState<number>(1);
  const [cableTrayWidth, setCableTrayWidth] = useState<string>('900 mm');
  const [incluirTuberia, setIncluirTuberia] = useState<boolean>(false);
  const [cableLength, setCableLength] = useState('');
  const [isCustomDetalle, setIsCustomDetalle] = useState(false);
  const [customDetalleValue, setCustomDetalleValue] = useState('');

  useEffect(() => {
    if (isOpen && activeRule) {
      const req = resolveRuleRequirements(activeRule, activeArea);
      setCount(1);
      setBaseTag(`${req.defaultTagPrefix}01`);
      setDetalleCode(req.defaultDetalle);
      setNumSoportes(1);
      setNumJumpers(1);
      setIncluirTuberia(false);
      setCableLength('');
      setCableTrayWidth(prev => (prev && ['900 mm', '600 mm', '450 mm', '300 mm'].includes(prev)) ? prev : '900 mm');
      setIsCustomDetalle(false);
      setCustomDetalleValue('');
    }
  }, [isOpen, activeRule?.id, activeArea]);

  if (!isOpen || !activeRule || minimized) return null;

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

  const availableOptions = useMemo(() => {
    const list =
      req.availableDetalles && req.availableDetalles.length > 0
        ? [...req.availableDetalles]
        : [
            req.defaultDetalle,
            ...(activeArea === 'AREA HUMEDA'
              ? [
                  '008/3A',
                  '008/3B',
                  '008/05',
                  '009/07',
                  '009/08A',
                  '009/09',
                  '009/10',
                  '009/11',
                  '009/12A',
                  '009/12B',
                  '010/13',
                  '010/14',
                  '010/15',
                  '010/16',
                  '010/17A',
                  '010/17B',
                  '010/17C',
                  '010/17D',
                  '010/18',
                  '008/4T1',
                  '008/4T2',
                  'ND'
                ]
              : [
                  '151',
                  '020',
                  '022',
                  '166A',
                  '166B',
                  '166C',
                  '167/G1',
                  '167/X1',
                  '167/X2',
                  '001/2B-X1',
                  'ND'
                ])
          ];
    const unique = Array.from(new Set(list.filter(Boolean)));
    if (detalleCode && !unique.includes(detalleCode) && detalleCode !== '__CUSTOM__') {
      unique.unshift(detalleCode);
    }
    return unique;
  }, [req.availableDetalles, req.defaultDetalle, activeArea, detalleCode]);

  const isDirty =
    count !== 1 ||
    baseTag !== `${req.defaultTagPrefix}01` ||
    detalleCode !== req.defaultDetalle ||
    numSoportes !== 1 ||
    numJumpers !== 1 ||
    incluirTuberia ||
    cableLength.trim() !== '' ||
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
      incluirTuberia:
        incluirTuberia &&
        (detalleCode.trim().toUpperCase() === '008/3A' || detalleCode.trim().toUpperCase() === '008/3B'),
      cableTrayWidth,
      cableLength: cableLength.trim()
    });

    if (applied) onClose();
  };

  return (
    <ModalShell
      title="Aplicar regla"
      subtitle={activeRule.trigger}
      onClose={onClose}
      maxWidth="880px"
      dismiss="dirty-confirm"
      isDirty={isDirty}
      dismissOnOverlay={false}
      onMinimize={() => setRulePromptMinimized(true)}
      onPrepareMinimize={() => flushSync(() => setRuleRestoreArmed(true))}
      minimizeTargetId={RULE_RESTORE_BUTTON_ID}
    >
        <form onSubmit={handleSubmit}>
        <div className="modal-body prompt">
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
            {getRuleInsertPreview(activeRule, activeArea, {
              detalleCode,
              numSoportes: effSoportes,
              numJumpers: effJumpers,
              incluirTuberia
            })}
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

          {/* UNIVERSAL DETALLE CONSTRUCTIVO SELECTION (Selected from a clean dropdown menu) */}
          <div style={{ marginBottom: '1.35rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              DETALLE CONSTRUCTIVO ({activeArea}):
            </label>

            <select
              id="trigger-modal-detalle-select"
              className="input"
              value={isCustomDetalle ? '__CUSTOM__' : detalleCode}
              onChange={e => {
                const val = e.target.value;
                if (val === '__CUSTOM__') {
                  setIsCustomDetalle(true);
                  setCustomDetalleValue('');
                } else {
                  setIsCustomDetalle(false);
                  setDetalleCode(val);
                  if (val !== '008/3A' && val !== '008/3B') setIncluirTuberia(false);
                }
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '6px 12px',
                fontSize: '13px',
                fontFamily: 'var(--mo)',
                fontWeight: 600,
                background: 'var(--s1)',
                color: 'var(--tx)',
                border: '1px solid var(--b1)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {availableOptions.map(d => (
                <option key={d} value={d}>
                  {d} {d === '008/3B' ? '(Con Cemento)' : d === 'ND' ? '(ND - Sin Detalle)' : ''}
                </option>
              ))}
              <option value="__CUSTOM__">+ Otro detalle personalizado...</option>
            </select>

            {isCustomDetalle && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: 1, height: '36px', fontFamily: 'var(--mo)', fontSize: '12px' }}
                  placeholder="Escribe el código de DETALLE personalizado (ej. 151, 167/G1)"
                  value={customDetalleValue}
                  autoFocus
                  onChange={e => {
                    const up = e.target.value.toUpperCase();
                    setCustomDetalleValue(up);
                    setDetalleCode(up);
                    if (up !== '008/3A' && up !== '008/3B') setIncluirTuberia(false);
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ height: '36px', fontSize: '11px' }}
                  onClick={() => {
                    setIsCustomDetalle(false);
                    const fallback = req.defaultDetalle || availableOptions[0] || 'ND';
                    setDetalleCode(fallback);
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Optional Tuberia PVC (if applicable for cable or explicitly defined) */}
          {(req.isCable40 || req.isCable20 || detalleCode === '008/3A' || detalleCode === '008/3B') && (
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
              Incluir TUBERÍA PVC SCH 80 Ø3/4" (opcional)
            </label>
          )}

          <div className="prompt-grid" style={{ marginBottom: '12px' }}>
            <label>
              Cantidad
              <input
                type="number"
                min={0}
                max={500}
                value={count}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setCount(isNaN(v) ? 0 : Math.max(0, v));
                }}
              />
            </label>
            <label>
              Tag en plano
              <input
                type="text"
                value={baseTag}
                onFocus={e => e.target.select()}
                onChange={e => setBaseTag(e.target.value)}
                placeholder="M01"
                required
              />
            </label>
            {(req.isCable20 || req.isCable40) && (
              <label>
                Longitud de cable (m)
                <input
                  inputMode="decimal"
                  value={cableLength}
                  aria-label="Longitud de cable"
                  placeholder="12.5"
                  onChange={e => setCableLength(e.target.value.replace(/[^\d.,]/g, ''))}
                />
              </label>
            )}
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
