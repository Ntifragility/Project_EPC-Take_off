import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CurveCatalogItem,
  catalogDiameters,
  compareCurves,
  curveDescription,
  curveDiametro,
  getCurveCatalog,
  setCurveCatalog,
  subscribeCurveCatalog
} from '../../../entities/bducto/model/catalog';
import { deleteCurveCatalogFromSupabase, syncCurveCatalogToSupabase } from '../../../shared/api/supabase';
import { IconActionButton } from '../../../shared/ui/IconActionButton';
import { siteConfirm } from '../../../shared/ui/askSite';
import { useCurveCatalogHistory } from '../model/curveCatalogHistory';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import './bductos.css';

type CurveDraft = CurveCatalogItem & { lengthText: string; stored: boolean };
type FieldKey = 'descripcion' | 'angle' | 'radius' | 'diameter' | 'length';
type RowDraft = Record<FieldKey, string>;

const ROW_FIELDS: FieldKey[] = ['descripcion', 'angle', 'radius', 'diameter', 'length'];

const FIELD_LABELS: Record<FieldKey, string> = {
  descripcion: 'Descripción',
  angle: 'Ángulo',
  radius: 'Radio',
  diameter: 'Pulgadas',
  length: 'Longitud (m)'
};

function toDraft(item: CurveCatalogItem, stored = true): CurveDraft {
  return { ...item, lengthText: String(item.lengthM), stored };
}

function blankCurve(): CurveDraft {
  return {
    id: `c-new-${Date.now()}`,
    angle: '30°',
    radius: '30"',
    diameter: '6"',
    lengthM: 0,
    lengthText: '0',
    descripcion: '',
    stored: false
  };
}

function fieldValue(row: CurveDraft, field: FieldKey): string {
  if (field === 'descripcion') return row.descripcion || curveDescription(row);
  if (field === 'length') return row.lengthText;
  return row[field];
}

function applyField(row: CurveDraft, field: FieldKey, text: string): CurveDraft {
  if (field === 'length') {
    const lengthM = Number(text.replace(',', '.'));
    return { ...row, lengthM, lengthText: text };
  }
  if (field === 'descripcion') return { ...row, descripcion: text };

  const previousDesc = curveDescription({ ...row, descripcion: '' });
  const previousDiam = curveDiametro({ ...row, diametro: '' });
  const next: CurveDraft = { ...row, [field]: text };
  const descripcion =
    !row.descripcion?.trim() || row.descripcion.trim() === previousDesc
      ? curveDescription({ ...next, descripcion: '' })
      : row.descripcion;
  const diametro =
    !row.diametro?.trim() || row.diametro.trim() === previousDiam
      ? curveDiametro({ ...next, diametro: '' })
      : row.diametro;
  return { ...next, descripcion, diametro };
}

function toCatalogItem(row: CurveDraft): CurveCatalogItem {
  const lengthM = Number(row.lengthText.replace(',', '.'));
  const next = {
    id: row.id,
    angle: row.angle.trim(),
    radius: row.radius.trim(),
    diameter: row.diameter.trim(),
    lengthM: Number.isFinite(lengthM) ? lengthM : 0,
    descripcion: row.descripcion?.trim() || '',
    diametro: row.diametro?.trim() || ''
  };
  return {
    ...next,
    descripcion: next.descripcion || curveDescription({ ...next, descripcion: '' }),
    diametro: next.diametro || curveDiametro({ ...next, diametro: '' })
  };
}

function storedMatches(sent: CurveCatalogItem, saved: CurveCatalogItem | undefined): boolean {
  if (!saved) return false;
  return (
    saved.angle === sent.angle &&
    saved.radius === sent.radius &&
    saved.diameter === sent.diameter &&
    Number(saved.lengthM) === Number(sent.lengthM) &&
    (saved.descripcion || '') === (sent.descripcion || '')
  );
}

function replaceCatalogItem(item: CurveCatalogItem): void {
  const current = getCurveCatalog();
  const next = current.some(row => row.id === item.id)
    ? current.map(row => (row.id === item.id ? item : row))
    : [...current, item];
  setCurveCatalog(next);
}

export const CurveCatalogPage: React.FC = () => {
  const showToast = useUIStore(state => state.showToast);
  const [rows, setRows] = useState<CurveDraft[]>(() => getCurveCatalog().map(item => toDraft(item)));
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('TODAS');
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<{ id: string; draft: RowDraft } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionSlot(document.getElementById('catalog-subnav-actions'));
  }, []);

  useEffect(() => {
    const history = useCurveCatalogHistory.getState();
    history.bind(
      () => ({ rows, removedIds }),
      snap => {
        setRows(snap.rows);
        setRemovedIds(snap.removedIds);
        setEditor(null);
      }
    );
    return () => history.unbind();
  }, [rows, removedIds]);

  useEffect(() => {
    return subscribeCurveCatalog(() => {
      setRows(current => (current.length > 0 ? current : getCurveCatalog().map(item => toDraft(item))));
    });
  }, []);

  const sizes = useMemo(() => {
    const extra = rows.map(row => row.diameter).filter(size => size && !catalogDiameters().includes(size));
    return [...catalogDiameters(), ...extra];
  }, [rows]);
  const visible = useMemo(() => {
    const list = filter === 'TODAS' ? rows : rows.filter(row => row.diameter === filter);
    return [...list].sort(compareCurves);
  }, [rows, filter]);

  const remove = (row: CurveDraft) => {
    const label = (row.descripcion || curveDescription(row)).trim() || row.id;
    void (async () => {
    if (!(await siteConfirm(`¿Quitar "${label}" del catálogo?`))) return;
    useCurveCatalogHistory.getState().remember({ rows, removedIds });
    setRows(current => current.filter(item => item.id !== row.id));
    if (row.stored) {
      setRemovedIds(current => (current.includes(row.id) ? current : [...current, row.id]));
    }
    if (editor?.id === row.id) setEditor(null);
    })();
  };

  const beginEdit = (row: CurveDraft) => {
    const draft = ROW_FIELDS.reduce((values, field) => {
      values[field] = fieldValue(row, field);
      return values;
    }, {} as RowDraft);
    setEditor({ id: row.id, draft });
  };

  const commit = async () => {
    if (!editor || committing) return;
    const row = rows.find(item => item.id === editor.id);
    if (!row) return;
    const draft = editor.draft;
    for (const field of ROW_FIELDS) {
      if (!draft[field].trim()) {
        showToast(`${FIELD_LABELS[field]} no puede quedar vacío`, 'warn');
        return;
      }
    }
    if (!Number.isFinite(Number(draft.length.trim().replace(',', '.')))) {
      showToast('La longitud tiene que ser un número', 'warn');
      return;
    }

    const changes = ROW_FIELDS.filter(field => draft[field].trim() !== fieldValue(row, field).trim());
    if (changes.length === 0) {
      setEditor(null);
      return;
    }
    const label = (row.descripcion || curveDescription(row)).trim();
    const lines = changes.map(field => `${FIELD_LABELS[field]}: "${fieldValue(row, field)}" → "${draft[field].trim()}"`);
    const accepted = await siteConfirm(`¿Guardar los cambios de esta curva?\n\n${label}\n${lines.join('\n')}`);
    if (!accepted) return;

    let updated = row;
    for (const field of ['angle', 'radius', 'diameter', 'length'] as FieldKey[]) {
      if (draft[field].trim() !== fieldValue(row, field).trim()) {
        updated = applyField(updated, field, draft[field].trim());
      }
    }
    if (draft.descripcion.trim() !== fieldValue(row, 'descripcion').trim()) {
      updated = applyField(updated, 'descripcion', draft.descripcion.trim());
    }

    if (!row.stored) {
      setRows(current => current.map(item => (item.id === row.id ? updated : item)));
      setEditor(null);
      return;
    }

    setCommitting(true);
    try {
      const sent = toCatalogItem(updated);
      const stored = await syncCurveCatalogToSupabase([sent]);
      const saved = stored.data?.[0];
      if (!stored.success || !storedMatches(sent, saved) || !saved) {
        showToast(stored.error || 'Supabase no guardó el cambio', 'warn');
        return;
      }
      setRows(current => current.map(item => (item.id === row.id ? toDraft(saved) : item)));
      replaceCatalogItem(saved);
      setEditor(null);
      showToast('Curva guardada.', 'success');
    } finally {
      setCommitting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = rows.map(toCatalogItem);
      const deleted = await deleteCurveCatalogFromSupabase(removedIds);
      const stored = cleaned.length === 0
        ? { success: true, count: 0, data: [] as CurveCatalogItem[] }
        : await syncCurveCatalogToSupabase(cleaned);
      if (!deleted.success || !stored.success || !stored.data) {
        showToast(deleted.error || stored.error || 'No pude guardar el catálogo', 'warn');
        return;
      }
      const byId = new Map(stored.data.map(item => [item.id, item]));
      const rejected = cleaned.filter(item => !storedMatches(item, byId.get(item.id)));
      if (rejected.length > 0) {
        showToast('Supabase no guardó todos los cambios. Los valores de la tabla se mantienen.', 'warn');
        return;
      }
      const next = cleaned.map(item => byId.get(item.id) ?? item);
      setCurveCatalog(next.filter(item => !removedIds.includes(item.id)));
      setRows(next.map(item => toDraft(item)));
      setRemovedIds([]);
      setEditor(null);
      useCurveCatalogHistory.getState().clear();
      showToast(`${stored.count} curvas guardadas en Supabase.`, 'success');
    } finally {
      setSaving(false);
    }
  };

  const curveActions = (
    <>
      <select aria-label="Filtrar pulgadas" value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="TODAS">Todas</option>
        {sizes.map(size => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <button type="button" className="btn-ghost" onClick={() => setRows(current => [...current, blankCurve()])}>
        Agregar curva
      </button>
      <button type="button" className="btn-primary" onClick={save} disabled={saving || (rows.length === 0 && removedIds.length === 0)}>
        {saving ? 'Guardando…' : 'Guardar catálogo'}
      </button>
    </>
  );

  return (
    <div className="bducto-page catalog-pane">
      {actionSlot && createPortal(curveActions, actionSlot)}
      <div className="catalog-hd">
        <p className="catalog-note">
          Cada fila se guarda al confirmar. Guardar catálogo envía las curvas nuevas y las que quitaste.
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="bducto-preview">El catálogo de curvas se carga desde Supabase.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="bducto-mini curve-catalog">
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ width: '80px' }}>Ángulo</th>
                <th style={{ width: '80px' }}>Radio</th>
                <th style={{ width: '80px' }}>Pulgadas</th>
                <th style={{ width: '105px' }}>Longitud (m)</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const editing = editor?.id === row.id;
                return (
                  <tr key={row.id} className={editing ? 'is-editing' : ''}>
                    {ROW_FIELDS.map(field => {
                      const isLast = field === 'length';
                      return (
                        <td key={field} className={isLast ? 'catalog-row-anchor' : undefined}>
                          {editing && editor ? (
                            <input
                              aria-label={FIELD_LABELS[field]}
                              value={editor.draft[field]}
                              inputMode={field === 'length' ? 'decimal' : undefined}
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
                          ) : (
                            <span className="curve-value-text">{fieldValue(row, field)}</span>
                          )}

                          {isLast && (
                            <div className="row-hover-actions">
                              {editing ? (
                                <>
                                  <IconActionButton kind="save" title="Confirmar fila" onClick={() => void commit()} disabled={committing} />
                                  <IconActionButton kind="cancel" title="Cancelar" onClick={() => setEditor(null)} disabled={committing} />
                                </>
                              ) : (
                                <>
                                  <IconActionButton kind="edit" title="Editar fila" onClick={() => beginEdit(row)} disabled={committing} />
                                  <IconActionButton kind="delete" title="Quitar curva" onClick={() => remove(row)} disabled={committing} />
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
      )}
    </div>
  );
};
