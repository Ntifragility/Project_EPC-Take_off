import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  JointLossCatalogItem,
  getJointLossCatalog,
  setJointLossCatalog,
  subscribeJointLossCatalog
} from '../../../entities/bducto/model/catalog';
import {
  deleteJointLossCatalogFromSupabase,
  syncJointLossCatalogToSupabase
} from '../../../shared/api/supabase';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { siteConfirm } from '../../../shared/ui/askSite';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import './bductos.css';

type FieldKey = 'diameter' | 'loss' | 'descripcion';
const ROW_FIELDS: FieldKey[] = ['diameter', 'loss', 'descripcion'];

const FIELD_LABELS: Record<FieldKey, string> = {
  diameter: 'Diámetro',
  loss: 'Pérdida por embone (m)',
  descripcion: 'Descripción'
};

type RowDraft = Record<FieldKey, string>;

interface JointLossDraft extends JointLossCatalogItem {
  lossText: string;
}

function toDraft(item: JointLossCatalogItem): JointLossDraft {
  return {
    ...item,
    lossText: String(item.lossM)
  };
}

function fieldValue(row: JointLossDraft, field: FieldKey): string {
  if (field === 'diameter') return row.diameter;
  if (field === 'loss') return row.lossText;
  return row.descripcion || `Pérdida por embone ${row.diameter}`;
}

export const JointLossCatalogSection: React.FC = () => {
  const { showToast } = useUIStore();
  const [rows, setRows] = useState<JointLossDraft[]>(() =>
    getJointLossCatalog().map(toDraft)
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ id: string; draft: RowDraft } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionSlot(document.getElementById('catalog-subnav-actions'));
  }, []);

  useEffect(() => {
    return subscribeJointLossCatalog(() => {
      setRows(current => (current.length > 0 ? current : getJointLossCatalog().map(toDraft)));
    });
  }, []);

  const beginEdit = (row: JointLossDraft) => {
    setEditor({
      id: row.id,
      draft: {
        diameter: row.diameter,
        loss: row.lossText,
        descripcion: row.descripcion || `Pérdida por embone ${row.diameter}`
      }
    });
  };

  const commit = async () => {
    if (!editor) return;
    setCommitting(true);
    try {
      const parsedLoss = parseFloat(editor.draft.loss.replace(',', '.'));
      const lossM = isNaN(parsedLoss) ? 0 : parsedLoss;
      const normalizedDiameter = editor.draft.diameter.trim() || '1"';
      const desc = editor.draft.descripcion.trim() || `Pérdida por embone ${normalizedDiameter}`;

      const updated = rows.map(r => {
        if (r.id === editor.id) {
          return {
            ...r,
            diameter: normalizedDiameter,
            lossM,
            lossText: String(lossM),
            descripcion: desc
          };
        }
        return r;
      });

      setRows(updated);
      setJointLossCatalog(
        updated.map(r => ({
          id: r.id,
          diameter: r.diameter,
          lossM: r.lossM,
          descripcion: r.descripcion,
          orderIndex: r.orderIndex
        }))
      );
      setEditor(null);
    } finally {
      setCommitting(false);
    }
  };

  const remove = async (row: JointLossDraft) => {
    const ok = await siteConfirm(`¿Quitar la medida para D=${row.diameter}?`);
    if (!ok) return;

    setRows(current => current.filter(r => r.id !== row.id));
    setRemovedIds(prev => [...prev, row.id]);

    const updated = rows.filter(r => r.id !== row.id);
    setJointLossCatalog(
      updated.map(r => ({
        id: r.id,
        diameter: r.diameter,
        lossM: r.lossM,
        descripcion: r.descripcion,
        orderIndex: r.orderIndex
      }))
    );
  };

  const addRow = () => {
    const newId = `loss-new-${Date.now()}`;
    const newRow: JointLossDraft = {
      id: newId,
      diameter: '1"',
      lossM: 0.04,
      lossText: '0.04',
      descripcion: 'Pérdida por embone 1"',
      orderIndex: rows.length + 1
    };

    const nextRows = [...rows, newRow];
    setRows(nextRows);
    setJointLossCatalog(
      nextRows.map(r => ({
        id: r.id,
        diameter: r.diameter,
        lossM: r.lossM,
        descripcion: r.descripcion,
        orderIndex: r.orderIndex
      }))
    );

    setEditor({
      id: newId,
      draft: {
        diameter: '1"',
        loss: '0.04',
        descripcion: 'Pérdida por embone 1"'
      }
    });
  };

  const handleSaveToSupabase = async () => {
    setSaving(true);
    try {
      if (removedIds.length > 0) {
        await deleteJointLossCatalogFromSupabase(removedIds);
        setRemovedIds([]);
      }

      const itemsToSync: JointLossCatalogItem[] = rows.map(r => ({
        id: r.id,
        diameter: r.diameter,
        lossM: r.lossM,
        descripcion: r.descripcion,
        orderIndex: r.orderIndex
      }));

      const ok = await syncJointLossCatalogToSupabase(itemsToSync);
      if (ok) {
        setJointLossCatalog(itemsToSync);
        showToast('Catálogo de pérdidas guardado en Supabase', 'success');
      } else {
        showToast('Guardado local (Supabase no disponible o sin conexión)', 'info');
      }
    } catch (err) {
      console.error('Error guardando catálogo de pérdidas:', err);
      showToast('Error al guardar en Supabase', 'warn');
    } finally {
      setSaving(false);
    }
  };

  const lossActions = (
    <>
      <button
        type="button"
        className="btn-ghost"
        onClick={addRow}
        disabled={committing}
      >
        Agregar medida
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={() => void handleSaveToSupabase()}
        disabled={saving || committing}
      >
        {saving ? 'Guardando…' : 'Guardar catálogo'}
      </button>
    </>
  );

  return (
    <div className="bducto-page catalog-pane">
      {actionSlot && createPortal(lossActions, actionSlot)}

      <div className="catalog-hd">
        <p className="catalog-note">
          Cada fila se guarda al confirmar. Guardar catálogo envía las medidas nuevas y actualizadas a Supabase.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="bducto-mini curve-catalog joint-loss-catalog">
          <thead>
            <tr>
              <th>Diámetro</th>
              <th>Pérdida por embone (m)</th>
              <th>Descripción</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const editing = editor?.id === row.id;
              return (
                <tr key={row.id}>
                  {ROW_FIELDS.map(field => (
                    <td key={field}>
                      {editing && editor ? (
                        <input
                          aria-label={FIELD_LABELS[field]}
                          value={editor.draft[field]}
                          inputMode={field === 'loss' ? 'decimal' : undefined}
                          autoFocus={field === 'diameter'}
                          disabled={committing}
                          onChange={event =>
                            setEditor({
                              id: row.id,
                              draft: { ...editor.draft, [field]: event.target.value }
                            })
                          }
                          onKeyDown={event => {
                            if (event.key === 'Enter') void commit();
                            if (event.key === 'Escape') setEditor(null);
                          }}
                        />
                      ) : (
                        <span className="curve-value-text">{fieldValue(row, field)}</span>
                      )}
                    </td>
                  ))}
                  <td className="curve-row-actions">
                    {editing ? (
                      <>
                        <IconActionButton kind="save" title="Confirmar fila" onClick={() => void commit()} disabled={committing} />
                        <IconActionButton kind="cancel" title="Cancelar" onClick={() => setEditor(null)} disabled={committing} />
                      </>
                    ) : (
                      <IconActionButton kind="edit" title="Editar fila" onClick={() => beginEdit(row)} disabled={committing} />
                    )}
                    <IconActionButton kind="delete" title="Quitar medida" onClick={() => void remove(row)} disabled={committing} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
