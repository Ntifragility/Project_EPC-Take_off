import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MaterialCatalogItem,
  MaterialCategory,
  getMaterialCatalog,
  setMaterialCatalog,
  subscribeMaterialCatalog
} from '../../../entities/bducto/model/catalog';
import {
  deleteMaterialCatalogFromSupabase,
  syncMaterialCatalogToSupabase
} from '../../../shared/api/supabase';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { siteConfirm } from '../../../shared/ui/askSite';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { useAuthStore } from '../../auth/model/useAuthStore';
import { getRoleLevel } from '../../auth/model/authTypes';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import './bductos.css';

type FieldKey = 'category' | 'diameter' | 'descripcion' | 'unidad';
const ROW_FIELDS: FieldKey[] = ['category', 'diameter', 'descripcion', 'unidad'];

const FIELD_LABELS: Record<FieldKey, string> = {
  category: 'Categoría',
  diameter: 'Diámetro',
  descripcion: 'Descripción en Metrado',
  unidad: 'Unidad'
};

const CATEGORY_NAMES: Record<MaterialCategory, string> = {
  tubo: 'Tubería (Conduit)',
  union: 'Unión',
  adaptador: 'Adaptador',
  campana: 'Campana (End Bell)',
  cinta: 'Cinta de riesgo'
};

type RowDraft = Record<FieldKey, string>;

interface MaterialDraft extends MaterialCatalogItem {
  categoryText: string;
}

function toDraft(item: MaterialCatalogItem): MaterialDraft {
  return {
    ...item,
    categoryText: item.category
  };
}

function fieldValue(row: MaterialDraft, field: FieldKey): string {
  if (field === 'category') return CATEGORY_NAMES[row.category] || row.category;
  if (field === 'diameter') return row.diameter || '—';
  if (field === 'descripcion') return row.descripcion;
  if (field === 'unidad') return row.unidad || 'm';
  return '';
}

export const MaterialCatalogSection: React.FC = () => {
  const { showToast } = useUIStore();
  const currentUser = useAuthStore(state => state.currentUser);
  const isAdmin = getRoleLevel(currentUser?.role) === 3;

  const [rows, setRows] = useState<MaterialDraft[]>(() =>
    getMaterialCatalog().map(toDraft)
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  const [editor, setEditor] = useState<{ id: string; draft: RowDraft } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionSlot(document.getElementById('catalog-subnav-actions'));
  }, []);

  useEffect(() => {
    return subscribeMaterialCatalog(() => {
      setRows(current => (current.length > 0 ? current : getMaterialCatalog().map(toDraft)));
    });
  }, []);

  const visibleRows = useMemo(() => {
    if (categoryFilter === 'TODAS') return rows;
    return rows.filter(r => r.category === categoryFilter);
  }, [rows, categoryFilter]);

  const beginEdit = (row: MaterialDraft) => {
    if (!isAdmin) {
      showToast('Solo usuarios con nivel ADMIN (Level 3) pueden editar materiales', 'warn');
      return;
    }
    setEditor({
      id: row.id,
      draft: {
        category: row.category,
        diameter: row.diameter || '',
        descripcion: row.descripcion,
        unidad: row.unidad || 'm'
      }
    });
  };

  const commit = async () => {
    if (!editor || !isAdmin) return;
    setCommitting(true);
    try {
      const cat = editor.draft.category.trim() as MaterialCategory;
      const diam = editor.draft.diameter.trim() || null;
      const desc = editor.draft.descripcion.trim() || `Material ${diam || ''}`.trim();
      const und = editor.draft.unidad.trim() || 'm';

      const updated = rows.map(r => {
        if (r.id === editor.id) {
          return {
            ...r,
            category: cat,
            diameter: diam,
            descripcion: desc,
            unidad: und
          };
        }
        return r;
      });

      setRows(updated);
      setMaterialCatalog(
        updated.map(r => ({
          id: r.id,
          category: r.category,
          diameter: r.diameter,
          descripcion: r.descripcion,
          unidad: r.unidad,
          sortOrder: r.sortOrder
        }))
      );
      setEditor(null);
    } finally {
      setCommitting(false);
    }
  };

  const remove = async (row: MaterialDraft) => {
    if (!isAdmin) {
      showToast('Solo usuarios con nivel ADMIN (Level 3) pueden eliminar materiales', 'warn');
      return;
    }
    const ok = await siteConfirm(`¿Quitar "${row.descripcion}" del catálogo maestro?`);
    if (!ok) return;

    setRows(current => current.filter(r => r.id !== row.id));
    setRemovedIds(prev => [...prev, row.id]);

    const updated = rows.filter(r => r.id !== row.id);
    setMaterialCatalog(
      updated.map(r => ({
        id: r.id,
        category: r.category,
        diameter: r.diameter,
        descripcion: r.descripcion,
        unidad: r.unidad,
        sortOrder: r.sortOrder
      }))
    );
  };

  const addRow = () => {
    if (!isAdmin) {
      showToast('Solo usuarios con nivel ADMIN (Level 3) pueden agregar materiales', 'warn');
      return;
    }
    const newId = `mat-new-${Date.now()}`;
    const newRow: MaterialDraft = {
      id: newId,
      category: 'tubo',
      diameter: '1"',
      descripcion: 'CONDUIT PVC SCH 40 D=1" - CERTIFICACIÓN UL',
      unidad: 'm',
      sortOrder: (rows.length + 1) * 10,
      categoryText: 'tubo'
    };

    const nextRows = [...rows, newRow];
    setRows(nextRows);
    setMaterialCatalog(
      nextRows.map(r => ({
        id: r.id,
        category: r.category,
        diameter: r.diameter,
        descripcion: r.descripcion,
        unidad: r.unidad,
        sortOrder: r.sortOrder
      }))
    );

    setEditor({
      id: newId,
      draft: {
        category: 'tubo',
        diameter: '1"',
        descripcion: 'CONDUIT PVC SCH 40 D=1" - CERTIFICACIÓN UL',
        unidad: 'm'
      }
    });
  };

  const handleSaveToSupabase = async () => {
    if (!isAdmin) {
      showToast('Permiso denegado: Solo Level 3 puede guardar cambios en Supabase', 'warn');
      return;
    }
    setSaving(true);
    try {
      if (removedIds.length > 0) {
        await deleteMaterialCatalogFromSupabase(removedIds);
        setRemovedIds([]);
      }

      const itemsToSync: MaterialCatalogItem[] = rows.map(r => ({
        id: r.id,
        category: r.category,
        diameter: r.diameter,
        descripcion: r.descripcion,
        unidad: r.unidad,
        sortOrder: r.sortOrder
      }));

      const ok = await syncMaterialCatalogToSupabase(itemsToSync);
      if (ok && ok.success) {
        setMaterialCatalog(itemsToSync);
        showToast('Catálogo de materiales guardado en Supabase', 'success');
      } else {
        showToast(ok?.error || 'Guardado localmente (sin conexión a Supabase)', 'info');
      }
    } catch (err) {
      console.error('Error guardando catálogo de materiales:', err);
      showToast('Error al guardar en Supabase', 'warn');
    } finally {
      setSaving(false);
    }
  };

  const materialActions = (
    <>
      <select
        aria-label="Filtrar categoría"
        value={categoryFilter}
        onChange={e => setCategoryFilter(e.target.value)}
        style={{ height: '28px', padding: '0 8px', fontSize: '12px' }}
      >
        <option value="TODAS">Todas las categorías</option>
        <option value="tubo">Tuberías (Conduit)</option>
        <option value="union">Uniones</option>
        <option value="adaptador">Adaptadores</option>
        <option value="campana">Campanas (End Bell)</option>
        <option value="cinta">Cintas de riesgo</option>
      </select>

      {isAdmin && (
        <>
          <button
            type="button"
            className="btn-ghost"
            onClick={addRow}
            disabled={committing}
          >
            Agregar material
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
      {actionSlot && createPortal(materialActions, actionSlot)}

      <div className="catalog-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <p className="catalog-note" style={{ margin: 0 }}>
          {isAdmin
            ? 'Catálogo maestro de materiales. Al pasar el cursor sobre cualquier fila puedes editar o eliminar. Los cambios confirmados se envían a Supabase.'
            : 'Catálogo maestro de materiales en modo de consulta. La edición está reservada exclusivamente para usuarios Level 3 (ADMIN).'}
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
            backgroundColor: isAdmin ? 'rgba(16, 124, 65, 0.12)' : 'rgba(100, 116, 139, 0.12)',
            color: isAdmin ? '#107c41' : '#64748b',
            border: isAdmin ? '1px solid rgba(16, 124, 65, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)'
          }}
        >
          {isAdmin ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {isAdmin ? 'Acceso ADMIN (Edición habilitada)' : 'Solo Lectura (Requiere Level 3)'}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="bducto-mini curve-catalog material-catalog">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Diámetro</th>
              <th>Descripción en Metrado</th>
              <th>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => {
              const editing = editor?.id === row.id;
              return (
                <tr key={row.id} className={editing ? 'is-editing' : ''}>
                  {ROW_FIELDS.map(field => {
                    const isLastField = field === 'unidad';
                    return (
                      <td
                        key={field}
                        className={isLastField ? 'catalog-row-anchor' : undefined}
                      >
                        {editing && editor ? (
                          field === 'category' ? (
                            <select
                              aria-label="Categoría"
                              value={editor.draft.category}
                              disabled={committing}
                              onChange={e =>
                                setEditor({
                                  id: row.id,
                                  draft: { ...editor.draft, category: e.target.value }
                                })
                              }
                              style={{ width: '100%', height: '24px', fontSize: '12px' }}
                            >
                              <option value="tubo">Tubo</option>
                              <option value="union">Unión</option>
                              <option value="adaptador">Adaptador</option>
                              <option value="campana">Campana</option>
                              <option value="cinta">Cinta</option>
                            </select>
                          ) : (
                            <input
                              aria-label={FIELD_LABELS[field]}
                              value={editor.draft[field]}
                              autoFocus={field === 'descripcion'}
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
                          )
                        ) : (
                          <span className="curve-value-text">{fieldValue(row, field)}</span>
                        )}

                        {/* Floating Action Overlay on Hover (Image 2 style) */}
                        {isLastField && isAdmin && (
                          <div className="row-hover-actions">
                            {editing ? (
                              <>
                                <IconActionButton kind="save" title="Confirmar fila" onClick={() => void commit()} disabled={committing} />
                                <IconActionButton kind="cancel" title="Cancelar" onClick={() => setEditor(null)} disabled={committing} />
                              </>
                            ) : (
                              <>
                                <IconActionButton kind="edit" title="Editar material" onClick={() => beginEdit(row)} disabled={committing} />
                                <IconActionButton kind="delete" title="Quitar material" onClick={() => void remove(row)} disabled={committing} />
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
