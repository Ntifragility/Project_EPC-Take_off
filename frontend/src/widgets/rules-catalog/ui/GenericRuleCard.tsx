import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';

interface GenericRuleCardProps {
  rule: TakeoffRule;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (rule: TakeoffRule) => void;
  onDelete: (id: string) => void;
}

export const GenericRuleCard: React.FC<GenericRuleCardProps> = ({
  rule,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}) => {
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
              {rule.subitems.length} {rule.subitems.length === 1 ? 'insumo' : 'insumos'}
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
                  minWidth: '500px',
                  borderCollapse: 'collapse',
                  fontFamily: 'var(--mo)',
                  fontSize: '11px'
                }}
              >
                <colgroup>
                  <col style={{ width: '45px' }} />
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
                      #
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
                      METRADO OT / CANT.
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
                        <td
                          style={{
                            borderRight: '1px solid var(--b1)',
                            padding: '8px 10px',
                            textAlign: 'center',
                            color: 'var(--di)',
                            fontWeight: 'bold'
                          }}
                        >
                          {i + 1}
                        </td>
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
                          {s.desc}
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
                          {s.qty}
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
                          {s.unit}
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
