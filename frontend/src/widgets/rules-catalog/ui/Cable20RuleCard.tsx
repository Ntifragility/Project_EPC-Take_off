import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import {
  getDetallesForArea,
  shouldAutoManageTuberia,
  DetalleVariantItem
} from '../../../entities/takeoff-rule/model/detalleVariants';
import { isMetradoExpression, shownVariantFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { MatCell, MatHeader } from './MatCell';
import { RuleCardShell } from './RuleCardShell';

interface Cable20RuleCardProps {
  rule: TakeoffRule;
  activeArea: 'AREA SECA' | 'AREA HUMEDA';
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: (id: string) => void;
  onEditDetalle: (code: string, items: DetalleVariantItem[]) => void;
}

export const Cable20RuleCard: React.FC<Cable20RuleCardProps> = ({
  rule,
  activeArea,
  isExpanded,
  onToggleExpand,
  onDelete,
  onEditDetalle
}) => {
  const areaDetalles = getDetallesForArea(activeArea);

  return (
    <RuleCardShell
      trigger={rule.trigger}
      preview={areaDetalles.map(([code]) => code)}
      badge={`${areaDetalles.length} detalles`}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onDelete={() => onDelete(rule.id)}
    >
            <>
            <div
              style={{
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                border: '1px solid var(--b1)',
                borderRadius: '6px',
                background: 'var(--s2)'
              }}
            >
              <table
                style={{
                  width: '100%',
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
                  {areaDetalles.map(([detalleCode, itemsList], detIdx) => {
                    const tuberiaDesc = detalleCode.startsWith('020')
                      ? 'TUBERIA RIGIDA DE ACERO GALVANIZADO EN CALIENTE DE WHEATLAND"'
                      : 'TUBERIA PVC SCH 80 Ø3/4"';

                    const itemsWithTuberia =
                      activeArea === 'AREA SECA' &&
                      shouldAutoManageTuberia(detalleCode) &&
                      detalleCode !== '153' &&
                      detalleCode !== 'NA'
                        ? [...itemsList, { desc: tuberiaDesc, qty: 1, unit: 'm', ot: 'Var.' }]
                        : [...itemsList];

                    const sortedItems = [...itemsWithTuberia].sort((a, b) => {
                      const descA = (a.desc || '').toUpperCase();
                      const descB = (b.desc || '').toUpperCase();
                      const getScore = (desc: string) => {
                        if (desc.startsWith('CABLE DESNUDO 2/0 AWG')) return 0;
                        if (desc.startsWith('TUBERIA') || desc.startsWith('TUBERÍA')) return 1;
                        return 2;
                      };
                      const scoreA = getScore(descA);
                      const scoreB = getScore(descB);
                      if (scoreA !== scoreB) {
                        return scoreA - scoreB;
                      }
                      return descA.localeCompare(descB);
                    });

                    return sortedItems.map((item, i) => {
                      const isLast = i === sortedItems.length - 1;
                      const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                      const bg = detIdx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                      return (
                        <tr
                          key={`${detalleCode}-${i}`}
                          style={{ borderBottom: bb, background: bg }}
                        >
                          {i === 0 && (
                            <td
                              rowSpan={sortedItems.length}
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
                                  title={`Editar la lista de ${detalleCode}`}
                                  onClick={() => onEditDetalle(detalleCode, itemsList)}
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
                              color: 'var(--mu)',
                              fontWeight: 'bold',
                              verticalAlign: 'middle',
                              textAlign: 'center'
                            }}
                          >
                            {isMetradoExpression(shownVariantFormula(item)) ? (
                              <span style={{ color: 'var(--tx)' }}>{shownVariantFormula(item)}</span>
                            ) : item.otDynamic === '1c/3m' ? (
                              <span style={{ color: 'var(--tx)' }} title="Fórmula: Cable / 3">1c / 3m</span>
                            ) : item.qty === 'Var.' || item.ot === 'Var.' ? (
                              <span style={{ color: 'var(--tx)' }}>Var.</span>
                            ) : item.otDynamic === 'empty' ? (
                              <span style={{ color: 'var(--mu)', fontStyle: 'italic' }}>—</span>
                            ) : (
                              item.ot
                            )}
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
                    });
                  })}
                </tbody>
              </table>
            </div>

          {activeArea === 'AREA SECA' && (
            <>
              <div
                style={{
                  color: 'var(--mu)',
                  fontSize: '11px',
                  margin: '12px 0',
                  fontFamily: 'var(--mo)',
                  paddingLeft: '14px'
                }}
              >
                <strong>Base de la regla (ítems 1 y 2 siempre iguales):</strong>
              </div>

              <div className="rule-subitems">
                {rule.subitems.slice(0, 2).map((s, i) => (
                  <div className="rule-sub" key={s.id}>
                    <span className="rule-sub-n">{i + 1}.</span>
                    <span className="rule-sub-d">{s.desc}</span>
                    <span className="rule-sub-q">{s.qty}</span>
                    <span style={{ color: 'var(--mu)' }}>{s.unit}</span>
                  </div>
                ))}
                <div className="rule-sub" style={{ color: 'var(--di)', fontStyle: 'italic' }}>
                  <span className="rule-sub-n">3-4.</span>
                  <span className="rule-sub-d">
                    Varían según DETALLE seleccionado (ver tabla arriba)
                  </span>
                  <span className="rule-sub-q">1</span>
                  <span style={{ color: 'var(--mu)' }}>und</span>
                </div>
              </div>
            </>
          )}
            </>
    </RuleCardShell>
  );
};
