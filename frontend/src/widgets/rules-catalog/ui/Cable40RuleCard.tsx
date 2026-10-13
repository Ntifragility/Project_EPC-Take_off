import React from 'react';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';
import { shownFormula } from '../../../entities/takeoff-rule/model/metradoFormula';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { MatCell, MatHeader } from './MatCell';
import { RuleCardShell } from './RuleCardShell';

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
  const lineFor = (desc: string) => {
    const up = desc.toUpperCase();
    return rule.subitems.find(item => {
      const text = item.desc.toUpperCase();
      if (up.includes('CINTA')) return text.includes('CINTA');
      if (up.includes('TIERRA')) return text.includes('TIERRA');
      if (up.includes('CEMENTO')) return text.includes('CEMENTO');
      if (up.includes('TUBERIA') || up.includes('TUBERÍA')) return text.includes('TUBERIA') || text.includes('TUBERÍA');
      if (up.includes('CABLE')) return text.includes('CABLE DESNUDO 4/0');
      return false;
    });
  };

  const metradoFor = (desc: string, fallback: string) => {
    const line = lineFor(desc);
    if (!line) return fallback;
    return shownFormula(line, rule.trigger) || fallback;
  };

  const materialFor = (desc: string) => lineFor(desc)?.material;

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
        { desc: 'TUBERIA PVC SCH 80 Ø3/4" (OPCIONAL)', metrado: 'Var.', formula: 'Tramo horizontal, se incluye a pedido al aplicar la regla', unit: 'm' },
        { desc: 'CEMENTO GEM (11.3 Kg x bls)', metrado: 'length x 11.3 / 2', formula: 'CABLE DESNUDO × 11.3 / 2', unit: 'kg' }
      ]
    }
  ];

  return (
    <RuleCardShell
      trigger={rule.trigger}
      preview={cable40Detalles.map(d => d.code)}
      badge="2 detalles"
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onDelete={() => onDelete(rule.id)}
    >
            <div style={{ overflowX: 'auto', border: '1px solid var(--b1)', borderRadius: '4px', background: 'var(--s2)' }}>
              <table style={{ width: 'max-content', borderCollapse: 'collapse', fontFamily: 'var(--mo)', fontSize: '12px' }}>
                <colgroup>
                  <col className="rule-col-det" />
                  <col className="rule-col-mat" />
                  <col className="rule-col-desc" />
                  <col className="rule-col-ot" />
                  <col className="rule-col-und" />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--s1)' }}>
                    <th style={{ borderRight: '1px solid var(--b1)', borderBottom: '1px solid var(--b1)', padding: '8px', textAlign: 'center', color: 'var(--tx)', fontWeight: 'bold' }}>DETALLE</th>
                    <MatHeader />
                    {['DESCRIPCIÓN', 'METRADO OT', 'UNIDAD'].map(label => (
                      <th key={label} className={label === 'DESCRIPCIÓN' ? 'rule-desc' : undefined} style={{ borderRight: '1px solid var(--b1)', borderBottom: '1px solid var(--b1)', padding: '8px', textAlign: 'center', color: 'var(--tx)', fontWeight: 'bold' }}>
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
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                              <IconActionButton
                                kind="edit"
                                title={`Editar la lista de ${detalle.code}`}
                                onClick={() => onEdit(rule)}
                              />
                            </div>
                          </td>
                        )}
                        <MatCell desc={item.desc} material={materialFor(item.desc)} />
                        <td className="rule-desc" style={{ borderRight: '1px solid var(--b1)', padding: '8px 10px', color: 'var(--tx)' }}>{item.desc}</td>
                        <td title={item.formula} style={{ borderRight: '1px solid var(--b1)', padding: '8px 10px', color: 'var(--tx)', fontWeight: 'bold', textAlign: 'center' }}>{metradoFor(item.desc, item.metrado)}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--tx)', fontWeight: 600, textAlign: 'center' }}>{item.unit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
    </RuleCardShell>
  );
};
