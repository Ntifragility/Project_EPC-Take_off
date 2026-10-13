import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import {
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS,
  DetalleVariantItem
} from '../../../entities/takeoff-rule/model/detalleVariants';
import { detalleBelongsToArea } from '../../../entities/takeoff-rule/model/areaCatalog';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { MatCell, MatHeader } from './MatCell';
import { RuleCardShell } from './RuleCardShell';

interface BarraRuleCardProps {
  rule: TakeoffRule;
  category: 'BARRA_POT' | 'BARRA_INST';
  activeArea: 'AREA SECA' | 'AREA HUMEDA';
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: (id: string) => void;
  onEditDetalle: (code: string, items: DetalleVariantItem[], category: 'BARRA_POT' | 'BARRA_INST') => void;
}

export const BarraRuleCard: React.FC<BarraRuleCardProps> = ({
  rule,
  category,
  activeArea,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onEditDetalle
}) => {
  const variantMap = category === 'BARRA_POT' ? DYNAMIC_BARRA_POT_VARIANTS : DYNAMIC_BARRA_INST_VARIANTS;
  const entries = Object.entries(variantMap).filter(([code]) => detalleBelongsToArea(code, activeArea));

  return (
    <RuleCardShell
      trigger={rule.trigger}
      preview={entries.map(([code]) => code)}
      badge={`${entries.length} ${entries.length === 1 ? 'detalle' : 'detalles'}`}
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
                width: 'max-content',
                borderCollapse: 'collapse',
                fontFamily: 'var(--mo)',
                fontSize: '11px',
                textAlign: 'left'
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
                  <th
                    style={{
                      borderRight: '1px solid var(--b1)',
                      borderBottom: '1px solid var(--b1)',
                      padding: '8px',
                      textAlign: 'center',
                      color: 'var(--tx)',
                      fontWeight: 'bold'
                    }}
                  >
                    DETALLE
                  </th>
                  <MatHeader />
                  <th
                    className="rule-desc"
                    style={{
                      borderRight: '1px solid var(--b1)',
                      borderBottom: '1px solid var(--b1)',
                      padding: '8px',
                      textAlign: 'left',
                      color: 'var(--tx)',
                      fontWeight: 'bold'
                    }}
                  >
                    DESCRIPCIÓN
                  </th>
                  <th
                    style={{
                      borderRight: '1px solid var(--b1)',
                      borderBottom: '1px solid var(--b1)',
                      padding: '8px',
                      textAlign: 'center',
                      color: 'var(--tx)',
                      fontWeight: 'bold'
                    }}
                  >
                    METRADO OT
                  </th>
                  <th
                    style={{
                      borderBottom: '1px solid var(--b1)',
                      padding: '8px',
                      textAlign: 'center',
                      color: 'var(--tx)',
                      fontWeight: 'bold'
                    }}
                  >
                    UNIDAD
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([detCode, vItems], detIdx) =>
                  vItems.map((item, i) => {
                    const isLast = i === vItems.length - 1;
                    const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                    const bg = detIdx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                    return (
                      <tr key={`${detCode}-${i}`} style={{ borderBottom: bb, background: bg }}>
                        {i === 0 && (
                          <td
                            rowSpan={vItems.length}
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
                              {detCode}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                              <IconActionButton
                                kind="edit"
                                title={`Editar materiales de ${detCode}`}
                                onClick={() => onEditDetalle(detCode, vItems as any, category)}
                              />
                            </div>
                          </td>
                        )}
                        <MatCell desc={item.desc} material={'material' in item ? item.material : undefined} />
                        <td
                          className="rule-desc"
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
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                          }}
                        >
                          {item.metradoOt || item.qty}
                        </td>
                        <td
                          style={{
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
    </RuleCardShell>
  );
};
