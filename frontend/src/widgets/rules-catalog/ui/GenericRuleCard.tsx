import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { AreaType } from '../../../shared/types/common';
import { getRuleCatalogDetalles, getDefaultDetalleByRule } from '../../../entities/takeoff-rule/model/seedRules';
import { shownFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { MatCell, MatHeader } from './MatCell';
import { RuleCardShell } from './RuleCardShell';

interface GenericRuleCardProps {
  rule: TakeoffRule;
  activeArea: AreaType;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (rule: TakeoffRule) => void;
  onDelete: (id: string) => void;
}

const thStyle: React.CSSProperties = {
  borderRight: '1px solid var(--b1)',
  borderBottom: '1px solid var(--b1)',
  padding: '8px',
  textAlign: 'center',
  color: 'var(--tx)',
  fontWeight: 'bold'
};

const tdStyle: React.CSSProperties = {
  borderRight: '1px solid var(--b1)',
  padding: '8px 10px',
  fontFamily: 'var(--mo)',
  fontSize: '11px',
  color: 'var(--tx)',
  verticalAlign: 'middle'
};

export const GenericRuleCard: React.FC<GenericRuleCardProps> = ({
  rule,
  activeArea,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}) => {
  const detalleCodes = getRuleCatalogDetalles(rule.trigger, activeArea, rule.detalle);
  const currentDetalle = getDefaultDetalleByRule(rule.trigger, activeArea) || detalleCodes[0] || '';
  const shownCodes = detalleCodes.length > 0 ? detalleCodes : [currentDetalle || '—'];
  const rows = rule.subitems.length > 0 ? rule.subitems : [{ id: 'empty', desc: '', qty: '', unit: '' }];

  return (
    <RuleCardShell
      trigger={rule.trigger}
      preview={detalleCodes.length ? detalleCodes : rule.subitems.map(s => s.desc).filter(Boolean)}
      badge={`${rule.subitems.length} ${rule.subitems.length === 1 ? 'insumo' : 'insumos'}`}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onDelete={() => onDelete(rule.id)}
    >
            <div
              style={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                border: '1px solid var(--b1)',
                borderRadius: '4px',
                background: 'var(--s2)'
              }}
            >
              <table
                style={{
                  width: 'max-content',
                  borderCollapse: 'collapse',
                  fontFamily: 'var(--mo)',
                  fontSize: '11px'
                }}
              >
                <colgroup>
                  <col className="rule-col-det" />
                  <col className="rule-col-mat" />
                  <col className="rule-col-desc" />
                  <col className="rule-col-ot" />
                  <col className="rule-col-und" />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--s1)' }}>
                    <th style={thStyle}>DETALLE</th>
                    <MatHeader />
                    <th className="rule-desc" style={{ ...thStyle, textAlign: 'left' }}>DESCRIPCIÓN</th>
                    <th style={thStyle}>METRADO OT / CANT.</th>
                    <th style={{ ...thStyle, borderRight: 'none' }}>UNIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, i) => {
                    const isLast = i === rows.length - 1;
                    return (
                      <tr
                        key={s.id || i}
                        style={{
                          borderBottom: isLast ? 'none' : '1px solid var(--b2)',
                          background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent'
                        }}
                      >
                        {i === 0 && (
                          <td
                            rowSpan={rows.length}
                            style={{
                              ...tdStyle,
                              textAlign: 'center',
                              borderBottom: 'none',
                              fontWeight: 'bold'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                              {shownCodes.map(code => (
                                <span
                                  key={code}
                                  style={{
                                    background: code === currentDetalle ? 'var(--ad)' : 'var(--s1)',
                                    border: '1px solid var(--b1)',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    opacity: code === currentDetalle || code === '—' ? 1 : 0.85
                                  }}
                                >
                                  {code}
                                </span>
                              ))}
                              <IconActionButton
                                kind="edit"
                                title="Editar la lista de este detalle"
                                onClick={() => onEdit(rule)}
                              />
                            </div>
                          </td>
                        )}
                        <MatCell desc={s.desc} material={s.material} />
                        <td
                          className="rule-desc"
                          style={{
                            ...tdStyle,
                            fontSize: '12px',
                            lineHeight: 1.4
                          }}
                        >
                          {s.desc}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 'bold',
                            textAlign: 'center'
                          }}
                        >
                          {shownFormula(s, rule.trigger) || s.qty}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            borderRight: 'none',
                            fontWeight: 600,
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {s.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
    </RuleCardShell>
  );
};
