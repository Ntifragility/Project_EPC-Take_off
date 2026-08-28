import React, { useState } from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { PartidasGuideModal } from '../Modals/PartidasGuideModal';

export const PackagesView: React.FC = () => {
  const {
    packages,
    addPackage,
    updatePackage,
    deletePackage,
    partidas,
    correlateAllItems
  } = useTakeoff();

  const [newPkgName, setNewPkgName] = useState('');
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editingPkgName, setEditingPkgName] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const handleAdd = () => {
    if (!newPkgName.trim()) return;
    addPackage(newPkgName);
    setNewPkgName('');
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingPkgId(id);
    setEditingPkgName(name);
  };

  const handleSaveEdit = (id: string) => {
    updatePackage(id, editingPkgName);
    setEditingPkgId(null);
  };

  const filteredPartidas = partidas.filter(p => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      p.item.toLowerCase().includes(q) ||
      p.area.toLowerCase().includes(q) ||
      p.actividad.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
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
            Carga la matriz oficial de partidas (Forecast Master) para correlacionar automáticamente la columna <strong>PARTIDA</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {partidas.length > 0 && (
            <button
              className="btn-ghost btn-sm"
              onClick={correlateAllItems}
              title="Volver a correlacionar todas las filas del metrado con la lista de partidas"
              style={{ fontSize: '11px', height: '32px' }}
            >
              🔄 RE-CORRELACIONAR METRADO
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
              placeholder="Buscar por ITEM, AREA o DESCRIPCIÓN..."
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
                ✕
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
                  <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>AREA</th>
                  <th style={{ padding: '6px 8px', width: '90px', textAlign: 'center' }}>ITEM</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>FORECAST DESCRIPTION</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>DESCRIPCIÓN OFICIAL</th>
                  <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>UND</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartidas.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--mu)' }}>
                      Sin coincidencias para la búsqueda
                    </td>
                  </tr>
                ) : (
                  filteredPartidas.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--b1)' }}>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>{p.actividad}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>{p.area}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 700 }}>{p.item}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.forecastDesc}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.descripcion}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'var(--mo)' }}>{p.und}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paquetes / Frentes Manuales */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--mu)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Agrupaciones y Frentes Locales
        </div>
        <div className="pkg-add-row">
          <input
            id="new-pkg-input"
            type="text"
            placeholder="Nombre de la agrupación / frente..."
            value={newPkgName}
            style={{ flex: 1, textTransform: 'uppercase' }}
            onChange={e => setNewPkgName(e.target.value.toUpperCase())}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <button className="btn-primary" onClick={handleAdd}>
            + CREAR FRENTE
          </button>
        </div>

        <div className="pkg-list">
          {packages.length === 0 ? (
            <div style={{ color: 'var(--mu)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              Sin frentes creados
            </div>
          ) : (
            packages.map(p => (
              <div className="pkg-item" key={p.id}>
                <span className="pkg-item-icon" style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 600 }}>P</span>
                {editingPkgId === p.id ? (
                  <div className="pkg-edit-row">
                    <input
                      id="edit-pkg-input"
                      type="text"
                      value={editingPkgName}
                      style={{ flex: 1, textTransform: 'uppercase' }}
                      onChange={e => setEditingPkgName(e.target.value.toUpperCase())}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(p.id);
                        if (e.key === 'Escape') setEditingPkgId(null);
                      }}
                      autoFocus
                    />
                    <button className="btn-green" onClick={() => handleSaveEdit(p.id)}>
                      ✓
                    </button>
                    <button className="btn-icon" onClick={() => setEditingPkgId(null)}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="pkg-item-name">{p.name}</span>
                    <div className="pkg-item-acts">
                      <button className="btn-ghost btn-sm" onClick={() => handleStartEdit(p.id, p.name)}>
                        EDITAR
                      </button>
                      <button
                        className="btn-ghost btn-sm btn-danger"
                        onClick={() => deletePackage(p.id)}
                      >
                        ELIMINAR
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Partidas Guide & Upload Modal */}
      <PartidasGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};

