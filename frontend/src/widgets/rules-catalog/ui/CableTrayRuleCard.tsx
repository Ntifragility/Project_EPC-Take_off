import React from 'react';
import { TakeoffRule, CableTrayMatrixItem } from '../../../entities/takeoff-rule/model/types';
import { DEFAULT_CABLE_TRAY_MATRIX } from '../../../entities/takeoff-rule/model/cableTrayRules';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { RuleCardShell } from './RuleCardShell';

interface CableTrayRuleCardProps {
  rule: TakeoffRule;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (rule: TakeoffRule) => void;
  onDelete: (id: string) => void;
}

export const CableTrayRuleCard: React.FC<CableTrayRuleCardProps> = ({
  rule,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}) => {
  const cableTrayRows: CableTrayMatrixItem[] =
    rule.cableTrayMatrix && rule.cableTrayMatrix.length > 0
      ? rule.cableTrayMatrix
      : DEFAULT_CABLE_TRAY_MATRIX;

  const detalleCode = rule.detalle || '001/2B-X1';

  return (
    <RuleCardShell
      trigger={rule.trigger}
      preview={cableTrayRows.map(row => row.desc).filter(Boolean)}
      badge={`${cableTrayRows.length} ${cableTrayRows.length === 1 ? 'material' : 'materiales'} · 4 anchos`}
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
                  minWidth: '700px',
                  borderCollapse: 'collapse',
                  fontFamily: 'var(--mo)',
                  fontSize: '11px'
                }}
              >
                <colgroup>
                  <col style={{ width: '110px' }} />
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '85px' }} />
                  <col style={{ width: '85px' }} />
                  <col style={{ width: '85px' }} />
                  <col style={{ width: '85px' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--s1)' }}>
                    <th
                      rowSpan={2}
                      style={{
                        borderRight: '1px solid var(--b1)',
                        borderBottom: '1px solid var(--b1)',
                        padding: '8px',
                        textAlign: 'center',
                        color: 'var(--tx)',
                        fontWeight: 'bold',
                        verticalAlign: 'middle'
                      }}
                    >
                      DETALLE
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        borderRight: '1px solid var(--b1)',
                        borderBottom: '1px solid var(--b1)',
                        padding: '8px',
                        textAlign: 'left',
                        color: 'var(--tx)',
                        fontWeight: 'bold',
                        verticalAlign: 'middle'
                      }}
                    >
                      DESCRIPCIÓN
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        borderRight: '1px solid var(--b1)',
                        borderBottom: '1px solid var(--b1)',
                        padding: '8px',
                        textAlign: 'center',
                        color: 'var(--tx)',
                        fontWeight: 'bold',
                        verticalAlign: 'middle'
                      }}
                    >
                      UNIDAD
                    </th>
                    <th
                      colSpan={4}
                      style={{
                        borderBottom: '1px solid var(--b1)',
                        padding: '6px 8px',
                        textAlign: 'center',
                        color: 'var(--tx)',
                        fontWeight: 'bold',
                        background: 'var(--ad)',
                        letterSpacing: '0.5px'
                      }}
                    >
                      CABLE TRAY WIDTH (ANCHO DE BANDEJA)
                    </th>
                  </tr>
                  <tr style={{ background: 'var(--s1)' }}>
                    {['900 mm', '600 mm', '450 mm', '300 mm'].map(w => (
                      <th
                        key={w}
                        style={{
                          borderRight: '1px solid var(--b1)',
                          borderBottom: '1px solid var(--b1)',
                          padding: '6px 8px',
                          textAlign: 'center',
                          color: 'var(--tx)',
                          fontWeight: 'bold',
                          fontSize: '10.5px'
                        }}
                      >
                        {w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cableTrayRows.map((item, idx) => {
                    const isLast = idx === cableTrayRows.length - 1;
                    const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                    const bg = idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                    return (
                      <tr key={item.id || `${item.desc}-${idx}`} style={{ borderBottom: bb, background: bg }}>
                        {idx === 0 && (
                          <td
                            rowSpan={cableTrayRows.length}
                            style={{
                              borderBottom: '2px solid var(--b1)',
                              borderRight: '1px solid var(--b1)',
                              padding: '8px 10px',
                              verticalAlign: 'middle',
                              textAlign: 'center'
                            }}
                          >
                            <span
                              style={{
                                background: 'var(--ad)',
                                border: '1px solid var(--b1)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                display: 'inline-block',
                                fontFamily: 'var(--mo)',
                                fontSize: '11px',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              {detalleCode}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                              <IconActionButton
                                kind="edit"
                                title="Editar matriz de anchos"
                                onClick={() => onEdit(rule)}
                              />
                            </div>
                          </td>
                        )}
                        <td
                          style={{
                            borderRight: '1px solid var(--b1)',
                            padding: '8px 10px',
                            fontFamily: 'var(--mo)',
                            fontSize: '11.5px',
                            color: 'var(--tx)',
                            verticalAlign: 'middle',
                            lineHeight: 1.4
                          }}
                        >
                          {item.desc}
                        </td>
                        <td
                          style={{
                            borderRight: '1px solid var(--b1)',
                            padding: '8px 10px',
                            fontFamily: 'var(--mo)',
                            fontSize: '11px',
                            color: 'var(--tx)',
                            fontWeight: 600,
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.unit}
                        </td>
                        <td
                          style={{
                            borderRight: '1px solid var(--b1)',
                            padding: '8px 10px',
                            fontFamily: 'var(--mo)',
                            fontSize: '11px',
                            color: idx === 0 ? 'var(--tx)' : 'var(--mu)',
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                          }}
                        >
                          {item.w900}
                        </td>
                        <td
                          style={{
                            borderRight: '1px solid var(--b1)',
                            padding: '8px 10px',
                            fontFamily: 'var(--mo)',
                            fontSize: '11px',
                            color: idx === 0 ? 'var(--tx)' : 'var(--mu)',
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            background: idx === 0 ? 'rgba(245, 158, 11, 0.08)' : undefined
                          }}
                          title={idx === 0 ? 'Estándar 600 mm: 0.76 m' : undefined}
                        >
                          {item.w600}
                        </td>
                        <td
                          style={{
                            borderRight: '1px solid var(--b1)',
                            padding: '8px 10px',
                            fontFamily: 'var(--mo)',
                            fontSize: '11px',
                            color: idx === 0 ? 'var(--tx)' : 'var(--mu)',
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                          }}
                        >
                          {item.w450}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            fontFamily: 'var(--mo)',
                            fontSize: '11px',
                            color: idx === 0 ? 'var(--tx)' : 'var(--mu)',
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                          }}
                        >
                          {item.w300}
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
