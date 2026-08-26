import React, { useState } from 'react';
import { useTakeoff } from '../../context/TakeoffContext';

export const PackagesView: React.FC = () => {
  const { packages, addPackage, updatePackage, deletePackage } = useTakeoff();
  const [newPkgName, setNewPkgName] = useState('');
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editingPkgName, setEditingPkgName] = useState('');

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

  return (
    <div>
      <div className="view-hd">
        <div>
          <div className="view-title">GESTIÓN DE PARTIDAS</div>
          <div className="view-sub">
            Organiza el metrado por frentes, áreas o paquetes de trabajo.
          </div>
        </div>
      </div>

      <div className="pkg-add-row">
        <input
          id="new-pkg-input"
          type="text"
          placeholder="Nombre de la partida..."
          value={newPkgName}
          style={{ flex: 1, textTransform: 'uppercase' }}
          onChange={e => setNewPkgName(e.target.value.toUpperCase())}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button className="btn-primary" onClick={handleAdd}>
          + AGREGAR
        </button>
      </div>

      <div className="pkg-list">
        {packages.length === 0 ? (
          <div style={{ color: 'var(--mu)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
            Sin partidas creadas
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
  );
};

