import React from 'react';
import { TakeoffRule, CableTrayMatrixItem } from '../../../entities/takeoff-rule/model/types';
import { DEFAULT_CABLE_TRAY_MATRIX } from '../../../entities/takeoff-rule/model/cableTrayRules';

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
    <div className="rule-card" key={rule.id}>
      <div className="rule-card-row">
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px'
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
              {cableTrayRows.length} {cableTrayRows.length === 1 ? 'material' : 'materiales'} &bull; 4 anchos
            </span>
          </div>

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
              margin: '8px 14px',
              transition: 'all 0.15s ease'
            }}
            title="Haga clic para mostrar u ocultar"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <span>{isExpanded ? '▼' : '▶'}</span>
              <span>{isExpanded ? 'Ocultar matriz de anchos' : 'Mostrar matriz de anchos (900/600/450/300 mm)'}</span>
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
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => onEdit(rule)}
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
                              title="Editar matriz de anchos"
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
    </div>
  );
};
