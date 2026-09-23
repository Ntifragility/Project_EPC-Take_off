import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import {
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS,
  DetalleVariantItem
} from '../../../entities/takeoff-rule/model/detalleVariants';

interface BarraRuleCardProps {
  rule: TakeoffRule;
  category: 'BARRA_POT' | 'BARRA_INST';
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (rule: TakeoffRule) => void;
  onDelete: (id: string) => void;
  onEditDetalle: (code: string, items: DetalleVariantItem[], category: 'BARRA_POT' | 'BARRA_INST') => void;
}

export const BarraRuleCard: React.FC<BarraRuleCardProps> = ({
  rule,
  category,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onEditDetalle
}) => {
  const variantMap = category === 'BARRA_POT' ? DYNAMIC_BARRA_POT_VARIANTS : DYNAMIC_BARRA_INST_VARIANTS;
  const entries = Object.entries(variantMap);

  return (
    <div className="rule-card" key={rule.id}>
      <div style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}
        >
          <div className="rule-trigger">{rule.trigger}</div>
          <span
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--b1)',
              color: 'var(--tx)',
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              fontFamily: 'var(--mo)',
              marginRight: '90px'
            }}
          >
            {entries.length} {entries.length === 1 ? 'detalle' : 'detalles'}
          </span>
        </div>

        {/* Foldable Row / Banner */}
        <div
          onClick={onToggleExpand}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--s2)',
            border: '1px solid var(--b1)',
            borderRadius: '4px',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '11px',
            fontFamily: 'var(--mo)',
            color: 'var(--tx)',
            margin: '8px 14px 8px 14px',
            transition: 'all 0.15s ease'
          }}
          title="Haga clic para mostrar u ocultar"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <span>{isExpanded ? '▼' : '▶'}</span>
            <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
          </span>
        </div>

        {isExpanded && (
          <div
            style={{
              margin: '12px 14px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              border: '1px solid var(--b1)',
              borderRadius: '6px',
              background: 'var(--s2)'
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '600px',
                borderCollapse: 'collapse',
                fontFamily: 'var(--mo)',
                fontSize: '11px',
                textAlign: 'left'
              }}
            >
              <colgroup>
                <col style={{ width: '85px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '110px' }} />
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
                  <th
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
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => onEditDetalle(detCode, vItems as any, category)}
                              style={{
                                fontSize: '10px',
                                padding: '3px 8px',
                                marginTop: '6px',
                                display: 'block',
                                margin: '6px auto 0 auto',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                border: '1px solid var(--b1)',
                                background: 'var(--s1)'
                              }}
                              title={`Editar materiales de ${detCode}`}
                            >
                              EDITAR
                            </button>
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
        )}
      </div>

      <div className="rule-card-acts">
        <button className="btn-ghost btn-sm" onClick={() => onEdit(rule)}>
          EDITAR
        </button>
        <button
          className="btn-ghost btn-sm btn-danger"
          onClick={() => onDelete(rule.id)}
        >
          ELIMINAR
        </button>
      </div>
    </div>
  );
};
