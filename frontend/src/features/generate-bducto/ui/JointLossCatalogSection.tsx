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

interface DraftLossItem {
  id: string;
  diameter: string;
  lossMText: string;
  descripcion: string;
  orderIndex: number;
}

function toDraft(item: JointLossCatalogItem): DraftLossItem {
  return {
    id: item.id,
    diameter: item.diameter,
    lossMText: String(item.lossM),
    descripcion: item.descripcion || `Pérdida por embone D=${item.diameter}`,
    orderIndex: item.orderIndex
  };
}

export const JointLossCatalogSection: React.FC = () => {
  const { showToast } = useUIStore();
  const [rows, setRows] = useState<DraftLossItem[]>(() =>
    getJointLossCatalog().map(toDraft)
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ diameter: string; lossMText: string; descripcion: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionSlot(document.getElementById('catalog-subnav-actions'));
    return subscribeJointLossCatalog(() => {
      setRows(getJointLossCatalog().map(toDraft));
    });
  }, []);

  const addRow = () => {
    const newId = `loss-new-${Date.now()}`;
    const newItem: DraftLossItem = {
      id: newId,
      diameter: '1"',
      lossMText: '0.04',
      descripcion: 'Pérdida por embone D=1"',
      orderIndex: rows.length + 1
    };
    setRows(prev => [...prev, newItem]);
    setEditingId(newId);
    setEditDraft({ diameter: newItem.diameter, lossMText: newItem.lossMText, descripcion: newItem.descripcion });
  };

  const removeRow = async (row: DraftLossItem) => {
    const ok = await siteConfirm(`¿Quitar la medida para D=${row.diameter}?`);
    if (!ok) return;
    setRows(prev => prev.filter(r => r.id !== row.id));
    if (!row.id.startsWith('loss-new-')) {
      setRemovedIds(prev => [...prev, row.id]);
    }
    if (editingId === row.id) {
      setEditingId(null);
      setEditDraft(null);
    }
  };

  const startEdit = (row: DraftLossItem) => {
    setEditingId(row.id);
    setEditDraft({
      diameter: row.diameter,
      lossMText: row.lossMText,
      descripcion: row.descripcion
    });
  };

  const saveEdit = () => {
    if (!editingId || !editDraft) return;
    const lossNum = parseFloat(editDraft.lossMText.replace(',', '.'));
    if (isNaN(lossNum) || lossNum < 0) {
      showToast('Ingresa una longitud de pérdida válida en metros.', 'warn');
      return;
    }
    setRows(prev =>
      prev.map(r =>
        r.id === editingId
          ? {
              ...r,
              diameter: editDraft.diameter.trim(),
              lossMText: String(lossNum),
              descripcion: editDraft.descripcion.trim() || `Pérdida por embone D=${editDraft.diameter.trim()}`
            }
          : r
      )
    );
    setEditingId(null);
    setEditDraft(null);
  };

  const saveToSupabase = async () => {
    setSaving(true);
    try {
      const itemsToSync: JointLossCatalogItem[] = rows.map((r, idx) => ({
        id: r.id,
        diameter: r.diameter,
        lossM: parseFloat(r.lossMText.replace(',', '.')) || 0,
        descripcion: r.descripcion,
        orderIndex: idx + 1
      }));

      const deleted = await deleteJointLossCatalogFromSupabase(removedIds);
      const stored = await syncJointLossCatalogToSupabase(itemsToSync);

      if (!deleted.success || !stored.success || !stored.data) {
        showToast(deleted.error || stored.error || 'Error al guardar en Supabase', 'warn');
        return;
      }

      setJointLossCatalog(stored.data);
      setRows(stored.data.map(toDraft));
      setRemovedIds([]);
      setEditingId(null);
      setEditDraft(null);
      showToast(`${stored.count} medidas de pérdida por embone guardadas en Supabase.`, 'success');
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button type="button" className="btn-ghost" onClick={addRow} disabled={saving}>
        + Agregar medida
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={saveToSupabase}
        disabled={saving || (rows.length === 0 && removedIds.length === 0)}
      >
        {saving ? 'Guardando...' : 'Guardar en Supabase'}
      </button>
    </div>
  );

  return (
    <div className="bducto-page catalog-pane" style={{ padding: '16px 20px' }}>
      {actionSlot && createPortal(actions, actionSlot)}

      <div className="catalog-hd" style={{ marginBottom: '16px' }}>
        <p className="catalog-note" style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
          Pérdida unitaria en metros por cada unión/embone de tubería según diámetro. Estos valores calibran automáticamente la fila generada en BDUCTOS.
        </p>
      </div>

      <div style={{ overflowX: 'auto', backgroundColor: '#111215', borderRadius: '8px', border: '1px solid #23252f' }}>
        <table className="bducto-mini" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #282a36', backgroundColor: '#17181f' }}>
              <th style={{ padding: '12px 14px', color: '#e4e4e7', fontSize: '12px', fontWeight: 600, width: '130px' }}>
                Diámetro
              </th>
              <th style={{ padding: '12px 14px', color: '#e4e4e7', fontSize: '12px', fontWeight: 600, width: '160px' }}>
                Pérdida por Unión (m)
              </th>
              <th style={{ padding: '12px 14px', color: '#e4e4e7', fontSize: '12px', fontWeight: 600 }}>
                Descripción
              </th>
              <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isEditing = editingId === row.id;
              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid #1c1d25',
                    backgroundColor: isEditing ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    transition: 'background-color 0.15s'
                  }}
                >
                  <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                    {isEditing && editDraft ? (
                      <input
                        type="text"
                        value={editDraft.diameter}
                        onChange={e => setEditDraft({ ...editDraft, diameter: e.target.value })}
                        style={{
                          backgroundColor: '#1b1c24',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          color: '#ffffff',
                          padding: '4px 8px',
                          fontSize: '13px',
                          width: '80px'
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#1c1d26',
                          color: '#60a5fa',
                          border: '1px solid #2b2e3e',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}
                      >
                        {row.diameter}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                    {isEditing && editDraft ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editDraft.lossMText}
                        onChange={e => setEditDraft({ ...editDraft, lossMText: e.target.value })}
                        style={{
                          backgroundColor: '#1b1c24',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          color: '#ffffff',
                          padding: '4px 8px',
                          fontSize: '13px',
                          width: '100px',
                          fontFamily: 'monospace'
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '13.5px',
                          color: '#34d399',
                          fontWeight: 600
                        }}
                      >
                        {Number(row.lossMText).toFixed(2)} m
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '10px 14px', verticalAlign: 'middle', color: '#d1d5db', fontSize: '13px' }}>
                    {isEditing && editDraft ? (
                      <input
                        type="text"
                        value={editDraft.descripcion}
                        onChange={e => setEditDraft({ ...editDraft, descripcion: e.target.value })}
                        style={{
                          backgroundColor: '#1b1c24',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          color: '#ffffff',
                          padding: '4px 8px',
                          fontSize: '13px',
                          width: '100%',
                          maxWidth: '350px'
                        }}
                      />
                    ) : (
                      <span>{row.descripcion}</span>
                    )}
                  </td>

                  <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {isEditing ? (
                        <>
                          <IconActionButton kind="save" title="Guardar edición" onClick={saveEdit} />
                          <IconActionButton
                            kind="cancel"
                            title="Cancelar"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft(null);
                            }}
                          />
                        </>
                      ) : (
                        <IconActionButton kind="edit" title="Editar medida" onClick={() => startEdit(row)} />
                      )}
                      <IconActionButton kind="delete" title="Quitar medida" onClick={() => void removeRow(row)} />
                    </div>
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
