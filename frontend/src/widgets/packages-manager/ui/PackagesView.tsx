import React, { useState } from 'react';
import { usePartidasStore } from '../../../features/manage-partidas/model/usePartidasStore';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { PartidasGuideModal } from '../../../features/manage-partidas/ui/PartidasGuideModal';
import { PartidaRecord } from '../../../entities/partida/model/types';
import { IconActionButton, IconActionGroup } from '../../../shared/ui/IconActionButton';

export const PackagesView: React.FC = () => {
  const partidas = usePartidasStore(state => state.partidas);
  const updatePartida = usePartidasStore(state => state.updatePartida);
  const deletePartida = usePartidasStore(state => state.deletePartida);
  const correlateAll = useItemsStore(state => state.correlateAll);
  const activeArea = useAppStore(state => state.activeArea);
  const activeSection = useAppStore(state => state.section);
  const showToast = useUIStore(state => state.showToast);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [editingPartidaId, setEditingPartidaId] = useState<string | null>(null);
  const [partidaDraft, setPartidaDraft] = useState<PartidaRecord | null>(null);

  const handleCorrelate = (list = partidas) => {
    correlateAll(list, activeArea, activeSection);
    showToast('Metrado re-correlacionado exitosamente con la matriz de partidas', 'success');
  };

  const handleStartPartidaEdit = (p: PartidaRecord) => {
    if (!p.id) return;
    setEditingPartidaId(p.id);
    setPartidaDraft({ ...p });
  };

  const handleCancelPartidaEdit = () => {
    setEditingPartidaId(null);
    setPartidaDraft(null);
  };

  const patchDraft = (field: keyof PartidaRecord, value: string) => {
    setPartidaDraft(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSavePartidaEdit = async () => {
    if (!editingPartidaId || !partidaDraft) return;
    try {
      await updatePartida(editingPartidaId, partidaDraft);
      handleCancelPartidaEdit();
      showToast('Partida actualizada', 'success');
      correlateAll(usePartidasStore.getState().partidas, activeArea, activeSection);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la partida';
      showToast(msg, 'warn');
    }
  };

  const handleDeletePartida = async (p: PartidaRecord) => {
    if (!p.id) return;
    const label = p.partidaSicme || p.item || p.forecastDesc || 'esta partida';
    if (!window.confirm(`¿Eliminar la partida "${label}" de la matriz master? Esta acción también la quita de Supabase.`)) {
      return;
    }
    try {
      await deletePartida(p.id);
      if (editingPartidaId === p.id) handleCancelPartidaEdit();
      showToast(`Partida "${label}" eliminada`, 'success');
      correlateAll(usePartidasStore.getState().partidas, activeArea, activeSection);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la partida';
      showToast(msg, 'warn');
    }
  };

  const filteredPartidas = partidas.filter(p => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (p.partidaSicme || p.item || '').toLowerCase().includes(q) ||
      (p.partidaBalance || '').toLowerCase().includes(q) ||
      (p.wbs || p.area || '').toLowerCase().includes(q) ||
      p.actividad.toLowerCase().includes(q) ||
      (p.descripcionBm || p.descripcion || '').toLowerCase().includes(q) ||
      p.forecastDesc.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="view-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div className="view-title">GESTIÓN DE PARTIDAS</div>
          <div className="view-sub">
            Carga la matriz oficial de partidas (Forecast Master) para correlacionar automáticamente las columnas <strong>PARTIDA SICME</strong> y <strong>PARTIDA BALANCE</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {partidas.length > 0 && (
            <button
              className="btn-ghost btn-sm"
              onClick={() => handleCorrelate()}
              title="Volver a correlacionar todas las filas del metrado con la lista de partidas"
              style={{ fontSize: '11px', height: '32px' }}
            >
              Re-correlacionar metrado
            </button>
          )}

          <button
            className="btn-primary btn-success"
            onClick={() => setIsGuideOpen(true)}
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              height: '34px',
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>+ AGREGAR (SUBIR EXCEL)</span>
          </button>
        </div>
      </div>

      {/* Partidas Master Table Section */}
      <div style={{ marginBottom: '24px', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '8px', padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--tx)', letterSpacing: '0.5px' }}>
              MATRIZ DE PARTIDAS MASTER ({partidas.length} REGISTRADAS)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Buscar por SICME, BALANCE, WBS o DESCRIPCIÓN..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ width: '260px', height: '28px', fontSize: '11px' }}
            />
            {searchFilter && (
              <button
                className="btn-ghost btn-sm"
                onClick={() => setSearchFilter('')}
                style={{ height: '28px', fontSize: '11px' }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {partidas.length === 0 ? (
          <div style={{ color: 'var(--mu)', fontSize: '12px', textAlign: 'center', padding: '30px 0', border: '1px dashed var(--b1)', borderRadius: '6px' }}>
            <div>No hay partidas cargadas en Supabase o memoria local.</div>
            <button
              className="btn-green"
              onClick={() => setIsGuideOpen(true)}
              style={{ marginTop: '10px', fontSize: '11px', padding: '6px 14px' }}
            >
              + SUBIR ARCHIVO EXCEL DE PARTIDAS
            </button>
          </div>
        ) : (
          <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--b1)', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: 'var(--s2)', position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--b1)' }}>
                  <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>ACT</th>
                  <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>WBS</th>
                  <th style={{ padding: '6px 8px', width: '100px', textAlign: 'center' }}>PARTIDA SICME</th>
                  <th style={{ padding: '6px 8px', width: '110px', textAlign: 'center' }}>PARTIDA BALANCE</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>FORECAST DESCRIPTION</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>DESCRIPCIÓN BM</th>
                  <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>UND</th>
                  <th style={{ padding: '6px 8px', width: '72px', textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartidas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: 'var(--mu)' }}>
                      Sin coincidencias para la búsqueda
                    </td>
                  </tr>
                ) : (
                  filteredPartidas.map((p, idx) => {
                    const rowId = p.id || `row-${idx}`;
                    const isEditing = editingPartidaId === p.id && partidaDraft;
                    const draft = isEditing ? partidaDraft : p;
                    return (
                      <tr key={rowId} style={{ borderBottom: '1px solid var(--b1)', background: isEditing ? 'var(--s2)' : undefined }}>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>
                          {isEditing ? (
                            <input
                              value={draft.actividad}
                              onChange={e => patchDraft('actividad', e.target.value.toUpperCase())}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void handleSavePartidaEdit();
                                if (e.key === 'Escape') handleCancelPartidaEdit();
                              }}
                              style={{ width: '100%', fontSize: '11px', textAlign: 'center', textTransform: 'uppercase' }}
                            />
                          ) : (
                            p.actividad
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'var(--mo)' }}>
                          {isEditing ? (
                            <input
                              value={draft.wbs || draft.area}
                              onChange={e => patchDraft('wbs', e.target.value.toUpperCase())}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void handleSavePartidaEdit();
                                if (e.key === 'Escape') handleCancelPartidaEdit();
                              }}
                              style={{ width: '100%', fontSize: '11px', textAlign: 'center', textTransform: 'uppercase' }}
                            />
                          ) : (
                            p.wbs || p.area
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 700 }}>
                          {isEditing ? (
                            <input
                              value={draft.partidaSicme || draft.item}
                              onChange={e => patchDraft('partidaSicme', e.target.value.toUpperCase())}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void handleSavePartidaEdit();
                                if (e.key === 'Escape') handleCancelPartidaEdit();
                              }}
                              autoFocus
                              style={{ width: '100%', fontSize: '11px', textAlign: 'center', textTransform: 'uppercase', fontWeight: 700 }}
                            />
                          ) : (
                            p.partidaSicme || p.item
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 700 }}>
                          {isEditing ? (
                            <input
                              value={draft.partidaBalance || 'NA'}
                              onChange={e => patchDraft('partidaBalance', e.target.value.toUpperCase())}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void handleSavePartidaEdit();
                                if (e.key === 'Escape') handleCancelPartidaEdit();
                              }}
                              style={{ width: '100%', fontSize: '11px', textAlign: 'center', textTransform: 'uppercase', fontWeight: 700 }}
                            />
                          ) : (
                            p.partidaBalance || 'NA'
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          {isEditing ? (
                            <input
                              value={draft.forecastDesc}
                              onChange={e => patchDraft('forecastDesc', e.target.value.toUpperCase())}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void handleSavePartidaEdit();
                                if (e.key === 'Escape') handleCancelPartidaEdit();
                              }}
                              style={{ width: '100%', fontSize: '11px', textTransform: 'uppercase' }}
                            />
                          ) : (
                            p.forecastDesc
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          {isEditing ? (
                            <input
                              value={draft.descripcionBm || draft.descripcion}
                              onChange={e => patchDraft('descripcionBm', e.target.value.toUpperCase())}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void handleSavePartidaEdit();
                                if (e.key === 'Escape') handleCancelPartidaEdit();
                              }}
                              style={{ width: '100%', fontSize: '11px', textTransform: 'uppercase' }}
                            />
                          ) : (
                            p.descripcionBm || p.descripcion
                          )}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'var(--mo)' }}>
                          {isEditing ? (
                            <input
                              value={draft.und}
                              onChange={e => patchDraft('und', e.target.value.toUpperCase())}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void handleSavePartidaEdit();
                                if (e.key === 'Escape') handleCancelPartidaEdit();
                              }}
                              style={{ width: '100%', fontSize: '11px', textAlign: 'center', textTransform: 'uppercase' }}
                            />
                          ) : (
                            p.und
                          )}
                        </td>
                        <td style={{ padding: '2px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <IconActionGroup>
                              <IconActionButton kind="save" title="Guardar (Enter)" onClick={() => void handleSavePartidaEdit()} />
                              <IconActionButton kind="cancel" title="Cancelar (Esc)" onClick={handleCancelPartidaEdit} />
                            </IconActionGroup>
                          ) : (
                            <IconActionGroup>
                              <IconActionButton kind="edit" title="Editar partida" onClick={() => handleStartPartidaEdit(p)} />
                              <IconActionButton kind="delete" title="Eliminar partida" onClick={() => void handleDeletePartida(p)} />
                            </IconActionGroup>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Partidas Guide & Upload Modal */}
      <PartidasGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
