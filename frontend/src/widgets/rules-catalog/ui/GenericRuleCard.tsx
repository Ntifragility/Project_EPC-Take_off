import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { AreaType } from '../../../shared/types/common';
import { getRuleCatalogDetalles, getDefaultDetalleByRule } from '../../../entities/takeoff-rule/model/seedRules';
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

  return (
    <RuleCardShell
      trigger={rule.trigger}
      preview={detalleCodes.length ? detalleCodes : rule.subitems.map(s => s.desc).filter(Boolean)}
      badge={`${rule.subitems.length} ${rule.subitems.length === 1 ? 'insumo' : 'insumos'}`}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onEdit={() => onEdit(rule)}
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
                  width: '100%',
                  minWidth: '560px',
                  borderCollapse: 'collapse',
                  fontFamily: 'var(--mo)',
                  fontSize: '11px'
                }}
              >
                <colgroup>
                  <col style={{ width: '110px' }} />
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '110px' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--s1)' }}>
                    <th style={thStyle}>DETALLE</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>DESCRIPCIÓN</th>
                    <th style={thStyle}>METRADO OT / CANT.</th>
                    <th style={{ ...thStyle, borderRight: 'none' }}>UNIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  {rule.subitems.map((s, i) => {
                    const isLast = i === rule.subitems.length - 1;
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
                            rowSpan={rule.subitems.length}
                            style={{
                              ...tdStyle,
                              textAlign: 'center',
                              borderBottom: 'none',
                              fontWeight: 'bold'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                              {(detalleCodes.length > 0 ? detalleCodes : ['—']).map(code => (
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
                            </div>
                          </td>
                        )}
                        <td
                          style={{
                            ...tdStyle,
                            fontSize: '11.5px',
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
                          {s.qty}
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
