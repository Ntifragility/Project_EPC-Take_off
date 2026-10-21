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
import { useAuthStore } from '../../auth/model/useAuthStore';
import { getRoleLevel } from '../../auth/model/authTypes';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
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
  const currentUser = useAuthStore(state => state.currentUser);
  const canEdit = getRoleLevel(currentUser?.role) >= 2;

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
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden editar pérdidas por embone', 'warn');
      return;
    }
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
    if (!editor || !canEdit) return;
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
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden eliminar pérdidas por embone', 'warn');
      return;
    }
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
    if (!canEdit) {
      showToast('Solo usuarios con nivel Level 2 o Level 3 pueden agregar medidas', 'warn');
      return;
    }
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
    if (!canEdit) {
      showToast('Permiso denegado: Solo Level 2 y Level 3 pueden guardar cambios en Supabase', 'warn');
      return;
    }
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
      {canEdit && (
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
      )}
    </>
  );

  return (
    <div className="bducto-page catalog-pane">
      {actionSlot && createPortal(lossActions, actionSlot)}

      <div className="catalog-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <p className="catalog-note" style={{ margin: 0 }}>
          {canEdit
            ? 'Cada fila se guarda al confirmar. Al pasar el cursor sobre cualquier fila puedes editar o quitar una medida.'
            : 'Catálogo de pérdidas por embone en modo de consulta. La edición está reservada para usuarios Level 2 y Level 3.'}
        </p>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: canEdit ? 'rgba(16, 124, 65, 0.12)' : 'rgba(100, 116, 139, 0.12)',
            color: canEdit ? '#107c41' : '#64748b',
            border: canEdit ? '1px solid rgba(16, 124, 65, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)'
          }}
        >
          {canEdit ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {canEdit ? 'Edición habilitada (Level 2 / Level 3)' : 'Solo Lectura (Requiere Level 2 o Level 3)'}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="bducto-mini curve-catalog joint-loss-catalog">
          <thead>
            <tr>
              <th>Diámetro</th>
              <th>Pérdida por embone (m)</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const editing = editor?.id === row.id;
              return (
                <tr key={row.id} className={editing ? 'is-editing' : ''}>
                  {ROW_FIELDS.map(field => {
                    const isLastField = field === 'descripcion';
                    return (
                      <td
                        key={field}
                        className={isLastField ? 'catalog-row-anchor' : undefined}
                      >
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

                        {/* Floating Action Overlay on Hover (Image 2 style) */}
                        {isLastField && canEdit && (
                          <div className="row-hover-actions">
                            {editing ? (
                              <>
                                <IconActionButton kind="save" title="Confirmar fila" onClick={() => void commit()} disabled={committing} />
                                <IconActionButton kind="cancel" title="Cancelar" onClick={() => setEditor(null)} disabled={committing} />
                              </>
                            ) : (
                              <>
                                <IconActionButton kind="edit" title="Editar fila" onClick={() => beginEdit(row)} disabled={committing} />
                                <IconActionButton kind="delete" title="Quitar medida" onClick={() => void remove(row)} disabled={committing} />
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
