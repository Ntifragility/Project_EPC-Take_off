import React, { useEffect, useState } from 'react';
import { useItemsStore } from '../model/useItemsStore';
import { useAppStore } from '../../app-config/model/useAppStore';
import { type BomLine } from '../../../entities/takeoff-rule/model/instanceRebuild';
import { ModalShell } from '../../../shared/ui/ModalShell';

export const DetalleChangeModal: React.FC = () => {
  const pending = useItemsStore(state => state.pendingDetalleEdit);
  const confirmDetalleChange = useItemsStore(state => state.confirmDetalleChange);
  const cancelDetalleChange = useItemsStore(state => state.cancelDetalleChange);
  const section = useAppStore(state => state.section);

  const [tagPlano, setTagPlano] = useState('');
  const [lines, setLines] = useState<BomLine[]>([]);

  useEffect(() => {
    if (!pending) return;
    setTagPlano(pending.currentTag);
    setLines(pending.previewLines.map(line => ({ ...line })));
  }, [pending]);

  if (!pending) return null;

  const extraCount = Math.max(0, pending.applyToItemIds.length - 1);

  const updateLine = (index: number, field: keyof BomLine, value: string) => {
    setLines(prev =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (field === 'qty') {
          const asNum = Number(String(value).replace(',', '.'));
          return { ...line, qty: value === '' || Number.isNaN(asNum) ? value : asNum };
        }
        return { ...line, [field]: value };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmDetalleChange(tagPlano.trim().toUpperCase(), lines, section);
  };

  return (
    <ModalShell title="Actualizar implementación" onClose={cancelDetalleChange} maxWidth="760px">
        <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mu)', marginBottom: '1rem' }}>
              DETALLE {pending.currentDetalle || '—'} → <strong>{pending.newDetalle}</strong>
              {extraCount > 0 ? ` · ${extraCount + 1} implementaciones` : ''}
            </div>

            <div
              style={{
                marginBottom: '1.15rem',
                padding: '0.85rem 1rem',
                border: '1px solid var(--b1)',
                background: 'var(--s2)'
              }}
            >
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
                ¿Actualizar TAG EN PLANO?
              </label>
              <div style={{ fontSize: '0.78rem', color: 'var(--mu)', marginBottom: '0.55rem' }}>
                El TAG actual es <strong>{pending.currentTag || '(vacío)'}</strong>. Puedes dejarlo o escribir
                uno nuevo. Se permite repetir.
                {extraCount > 0
                  ? ' En un arrastre, este TAG se aplica solo al ítem de origen; las otras implementaciones conservan el suyo.'
                  : ''}
              </div>
              <input
                type="text"
                className="input"
                style={{ width: '100%', textTransform: 'uppercase' }}
                value={tagPlano}
                onChange={e => setTagPlano(e.target.value.toUpperCase())}
                placeholder="TT07"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '0.45rem', fontWeight: 700 }}>Valores de las filas</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--mu)', marginBottom: '0.55rem' }}>
              La primera fila actualiza el ítem principal. Las demás se insertan justo debajo.
              Completa cantidad, unidad y metrado si vienen vacíos.
            </div>
          </div>

          <div className="detalle-change-table-wrap">
            <table className="detalle-change-table">
              <thead>
                <tr>
                  <th></th>
                  <th>DESCRIPCIÓN</th>
                  <th>CANT.</th>
                  <th>UND</th>
                  <th>METRADO OT</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const emptyOt = !String(line.metradoOt || '').trim();
                  return (
                    <tr key={`${line.desc}-${index}`}>
                      <td className="detalle-change-role">{index === 0 ? 'Principal' : 'Nueva'}</td>
                      <td>
                        <div className="detalle-change-desc" title={line.desc}>
                          {line.desc}
                        </div>
                      </td>
                      <td>
                        <input
                          className="input"
                          value={line.qty ?? ''}
                          onChange={e => updateLine(index, 'qty', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={line.unit ?? ''}
                          onChange={e => updateLine(index, 'unit', e.target.value.toUpperCase())}
                        />
                      </td>
                      <td>
                        <input
                          className={`input${emptyOt ? ' is-empty-ot' : ''}`}
                          value={line.metradoOt ?? ''}
                          onChange={e => updateLine(index, 'metradoOt', e.target.value)}
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
          <div className="modal-ft">
            <button type="button" className="btn-ghost" onClick={cancelDetalleChange}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Confirmar
            </button>
          </div>
        </form>
    </ModalShell>
  );
};
