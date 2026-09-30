import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { IconActionButton, IconActionGroup } from '../../../shared/ui/IconActionButton';

interface Cable40RuleCardProps {
  rule: TakeoffRule;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (rule: TakeoffRule) => void;
  onDelete: (id: string) => void;
}

export const Cable40RuleCard: React.FC<Cable40RuleCardProps> = ({
  rule,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}) => {
  const cable40Detalles = [
    {
      code: '008/3A',
      items: [
        { desc: 'CABLE DESNUDO 4/0 AWG', metrado: 'Var.', formula: 'Valor ingresado por el usuario', unit: 'm' },
        { desc: 'CINTA AMARILLA', metrado: 'Var.', formula: 'Igual al valor de CABLE DESNUDO 4/0 AWG', unit: 'm' },
        { desc: 'TIERRA DE CULTIVO', metrado: 'length x 0.375 x 0.5', formula: 'CABLE DESNUDO × 0.375 × 0.5', unit: 'm3' },
        { desc: 'TUBERIA PVC SCH 80 Ø3/4" (OPCIONAL)', metrado: 'Var.', formula: 'Tramo horizontal, se incluye a pedido al aplicar la regla', unit: 'm' }
      ]
    },
    {
      code: '008/3B',
      items: [
        { desc: 'CABLE DESNUDO 4/0 AWG', metrado: 'Var.', formula: 'Valor ingresado por el usuario', unit: 'm' },
        { desc: 'CINTA AMARILLA', metrado: 'Var.', formula: 'Igual al valor de CABLE DESNUDO 4/0 AWG', unit: 'm' },
        { desc: 'TIERRA DE CULTIVO', metrado: 'length x 0.375 x 0.5', formula: 'CABLE DESNUDO × 0.375 × 0.5', unit: 'm3' },
        { desc: 'CEMENTO GEM (11.3 Kg x bls)', metrado: 'length x 11.3 / 2', formula: 'CABLE DESNUDO × 11.3 / 2', unit: 'kg' }
      ]
    }
  ];

  return (
    <div className="rule-card" key={rule.id}>
      <div className="rule-card-row">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div className="rule-trigger">{rule.trigger}</div>
            <span style={{ background: 'var(--s2)', border: '1px solid var(--b1)', color: 'var(--tx)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'var(--mo)', marginRight: '90px' }}>
              2 detalles
            </span>
          </div>

          <div
            onClick={onToggleExpand}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '4px', cursor: 'pointer', userSelect: 'none', fontSize: '11px', fontFamily: 'var(--mo)', color: 'var(--tx)', margin: '8px 14px', transition: 'all 0.15s ease' }}
            title="Haga clic para mostrar u ocultar"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <span>{isExpanded ? '▼' : '▶'}</span>
              <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
            </span>
          </div>

          {isExpanded && (
            <div style={{ margin: '12px 14px', overflowX: 'auto', border: '1px solid var(--b1)', borderRadius: '6px', background: 'var(--s2)' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontFamily: 'var(--mo)', fontSize: '11px' }}>
                <colgroup>
                  <col style={{ width: '90px' }} />
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '190px' }} />
                  <col style={{ width: '110px' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--s1)' }}>
                    {['DETALLE', 'DESCRIPCIÓN', 'METRADO OT', 'UNIDAD'].map(label => (
                      <th key={label} style={{ borderRight: '1px solid var(--b1)', borderBottom: '1px solid var(--b1)', padding: '8px', textAlign: 'center', color: 'var(--tx)', fontWeight: 'bold' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cable40Detalles.flatMap((detalle, detalleIndex) =>
                    detalle.items.map((item, itemIndex) => (
                      <tr key={`${detalle.code}-${item.desc}`} style={{ borderBottom: itemIndex === detalle.items.length - 1 ? '2px solid var(--b1)' : '1px solid var(--b2)', background: detalleIndex % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                        {itemIndex === 0 && (
                          <td rowSpan={detalle.items.length} style={{ borderRight: '1px solid var(--b1)', borderBottom: '2px solid var(--b1)', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <span style={{ background: 'var(--ad)', border: '1px solid var(--b1)', borderRadius: '4px', padding: '4px 8px', fontWeight: 'bold' }}>
                              {detalle.code}
                            </span>
                          </td>
                        )}
                        <td style={{ borderRight: '1px solid var(--b1)', padding: '8px 10px', color: 'var(--tx)' }}>{item.desc}</td>
                        <td title={item.formula} style={{ borderRight: '1px solid var(--b1)', padding: '8px 10px', color: 'var(--tx)', fontWeight: 'bold', textAlign: 'center' }}>{item.metrado}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--tx)', fontWeight: 600, textAlign: 'center' }}>{item.unit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rule-card-acts">
          <IconActionGroup>
            <IconActionButton kind="edit" title="Editar regla" onClick={() => onEdit(rule)} />
            <IconActionButton kind="delete" title="Eliminar regla" onClick={() => onDelete(rule.id)} />
          </IconActionGroup>
        </div>
      </div>
    </div>
  );
};
