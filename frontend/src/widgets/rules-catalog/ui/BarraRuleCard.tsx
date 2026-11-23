import React, { useMemo } from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { useRulesStore } from '../../../features/manage-rules/model/useRulesStore';
import {
  getBarraVariants,
  DetalleVariantItem
} from '../../../entities/takeoff-rule/model/detalleVariants';
import { SubAreaHumeda } from '../../../shared/types/common';
import { detalleBelongsToArea } from '../../../entities/takeoff-rule/model/areaCatalog';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { MatCell, MatHeader } from './MatCell';
import { RuleCardShell } from './RuleCardShell';

interface BarraRuleCardProps {
  rule: TakeoffRule;
  customRules?: TakeoffRule[];
  category: 'BARRA_POT' | 'BARRA_INST';
  activeArea: 'AREA SECA' | 'AREA HUMEDA';
  subArea?: SubAreaHumeda;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDuplicate?: (rule: TakeoffRule) => void;
  onDelete?: (id: string) => void;
  onEditDetalle?: (code: string, items: DetalleVariantItem[], category: 'BARRA_POT' | 'BARRA_INST') => void;
  onDuplicateDetalle?: (code: string, items: DetalleVariantItem[], category: 'BARRA_POT' | 'BARRA_INST') => void;
  onEditCustomRule?: (rule: TakeoffRule) => void;
  onDeleteCustomRule?: (ruleId: string) => void;
}

export const BarraRuleCard: React.FC<BarraRuleCardProps> = ({
  rule,
  customRules = [],
  category,
  activeArea,
  subArea = 'NO_CORROSIVO',
  isExpanded,
  onToggleExpand,
  onDuplicate,
  onDelete,
  onEditDetalle,
  onDuplicateDetalle,
  onEditCustomRule,
  onDeleteCustomRule
}) => {
  const variantsVersion = useRulesStore(state => state.detalleVariantsVersion);
  const variantMap = getBarraVariants(category, activeArea === 'AREA HUMEDA' ? subArea : 'NO_CORROSIVO');
  const entries: [string, DetalleVariantItem[], TakeoffRule?][] = useMemo(() => {
    const list: [string, DetalleVariantItem[], TakeoffRule?][] = Object.entries(variantMap)
      .filter(([code]) => detalleBelongsToArea(code, activeArea))
      .map(([code, items]) => [code, items as any, undefined]);

    if (customRules && customRules.length > 0) {
      for (const cr of customRules) {
        const detCode = cr.detalle || cr.defaultDetalle;
        if (!detCode) continue;
        if (!detalleBelongsToArea(detCode, activeArea)) continue;
        const existingIdx = list.findIndex(([, , owner]) => owner?.id === cr.id);
        const crItems: DetalleVariantItem[] = cr.subitems.map(s => {
          const rawOt = s.formula ? s.formula : (s.qty !== undefined && s.qty !== '') ? s.qty : 1;
          return {
            desc: s.desc,
            qty: s.qty,
            unit: s.unit,
            formula: s.formula,
            material: s.material,
            ot: rawOt
          };
        });
        if (existingIdx >= 0) {
          list[existingIdx] = [detCode, crItems, cr];
        } else {
          const codeIdx = list.findIndex(([c]) => c === detCode);
          if (codeIdx >= 0 && !list[codeIdx][2]) {
            // Rule overlay wins the display (fresher explicit save).
            list[codeIdx] = [detCode, crItems, cr];
          } else if (codeIdx < 0) {
            list.push([detCode, crItems, cr]);
          } else {
            list.push([detCode, crItems, cr]);
          }
        }
      }
    }

    return list.sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [variantMap, activeArea, variantsVersion, customRules]);

  return (
    <RuleCardShell
      trigger={rule.trigger}
      preview={entries.map(([code]) => code)}
      badge={`${entries.length} ${entries.length === 1 ? 'detalle' : 'detalles'}`}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onDuplicate={onDuplicate ? () => onDuplicate(rule) : undefined}
      onDelete={onDelete ? () => onDelete(rule.id) : undefined}
    >
          <div
            style={{
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              border: '1px solid var(--b1)',
              borderRadius: '4px',
              background: 'var(--s2)'
            }}
          >
            <table
              style={{
                width: '100%',
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
                {entries.map(([detCode, vItems, customRule], detIdx) =>
                  vItems.map((item, i) => {
                    const isLast = i === vItems.length - 1;
                    const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                    const bg = detIdx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                    return (
                      <tr key={`${detCode}-${customRule?.id || 'variant'}-${i}`} style={{ borderBottom: bb, background: bg }}>
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
                            {(onEditDetalle || onDuplicateDetalle || (customRule && onDeleteCustomRule)) && (
                              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px', gap: '4px' }}>
                                <IconActionButton
                                  kind="edit"
                                  title={`Editar materiales de ${detCode}`}
                                  onClick={() => {
                                    if (customRule && onEditCustomRule) {
                                      onEditCustomRule(customRule);
                                    } else if (onEditDetalle) {
                                      onEditDetalle(detCode, vItems as any, category);
                                    }
                                  }}
                                />
                                {onDuplicateDetalle && (
                                  <IconActionButton
                                    kind="copy"
                                    title={`Crear nueva regla basada en el detalle ${detCode}`}
                                    onClick={() => onDuplicateDetalle(detCode, vItems as any, category)}
                                  />
                                )}
                                {customRule && onDeleteCustomRule && (
                                  <IconActionButton
                                    kind="delete"
                                    title={`Eliminar detalle ${detCode}`}
                                    onClick={() => onDeleteCustomRule(customRule.id)}
                                  />
                                )}
                              </div>
                            )}
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
                          {(item as any).metradoOt || (item as any).ot || item.qty}
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
