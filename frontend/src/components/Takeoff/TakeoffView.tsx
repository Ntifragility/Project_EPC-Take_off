import React from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { AddPanel } from './AddPanel';
import { PackageGroupView } from './PackageGroupView';
import { consolidateAccessories } from '../../utils/calculations';

export const TakeoffView: React.FC = () => {
  const {
    items,
    packages,
    searchQuery,
    filterPlano,
    filterDetalle,
    accessoryViewMode,
    setAccessoryViewMode
  } = useTakeoff();

  // Filter items by search, plano, and detalle
  const filteredItems = items.filter(it => {
    if (filterPlano && it.plano !== filterPlano) {
      return false;
    }
    if (filterDetalle && it.detalle !== filterDetalle) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const tag = (it.tagPlano || '').toLowerCase();
      const desc = (it.desc || '').toLowerCase();
      const tagU = (it.tagUnico || '').toLowerCase();
      const plano = (it.plano || '').toLowerCase();
      return tag.includes(q) || desc.includes(q) || tagU.includes(q) || plano.includes(q);
    }
    return true;
  });

  // Consolidate accessories dynamically if in JOIN mode (non-destructive)
  const displayItems = accessoryViewMode === 'join'
    ? consolidateAccessories(filteredItems)
    : filteredItems;

  // Group filtered display items by packages
  const groups: { pkg: { id: string; name: string }; items: typeof items }[] = [];
  packages.forEach(pkg => {
    const pkgItems = displayItems.filter(it => it.pkgId === pkg.id);
    if (pkgItems.length > 0) {
      groups.push({ pkg, items: pkgItems });
    }
  });

  const unassignedItems = displayItems.filter(
    it => !packages.some(p => p.id === it.pkgId)
  );
  if (unassignedItems.length > 0) {
    groups.push({
      pkg: { id: '__none', name: 'SIN PARTIDA' },
      items: unassignedItems
    });
  }

  return (
    <div>
      <AddPanel />

      {items.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '7px 14px',
            background: 'var(--s2)',
            border: '1px solid var(--b1)',
            borderRadius: '6px',
            fontFamily: 'var(--mo, monospace)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx)', letterSpacing: '0.5px' }}>
              CONSUMIBLES:
            </span>
            <div className="mode-toggle" style={{ display: 'inline-flex' }}>
              <button
                type="button"
                className={`mode-btn ${accessoryViewMode === 'separated' ? 'active' : ''}`}
                onClick={() => setAccessoryViewMode('separated')}
                style={{ fontSize: '11px', padding: '4px 12px', fontWeight: 600 }}
                title="Mostrar consumibles base y jumpers en filas separadas independientes"
              >
                SEPARADOS
              </button>
              <button
                type="button"
                className={`mode-btn ${accessoryViewMode === 'join' ? 'active' : ''}`}
                onClick={() => setAccessoryViewMode('join')}
                style={{ fontSize: '11px', padding: '4px 12px', fontWeight: 600 }}
                title="Consolidar y sumar totales de consumibles idénticos por TAG (Base + Jumpers)"
              >
                UNIDOS (TOTALES)
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--mu)' }}>
            {accessoryViewMode === 'join' ? (
              <span style={{ color: 'var(--am, #eab308)', fontWeight: 600 }}>
                ● Modo Unido: Accesorios y jumpers consolidados en totales por TAG
              </span>
            ) : (
              <span>● Modo Separado: Accesorios desglosados en líneas independientes</span>
            )}
          </div>
        </div>
      )}

      <div id="table-container">
        {items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">—</div>
            <div className="empty-title">Sin ítems aún</div>
            <div className="empty-sub">Usa una regla o agrega ítems manualmente</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">—</div>
            <div className="empty-title">Sin resultados</div>
            <div className="empty-sub">Prueba con otra búsqueda o limpia los filtros</div>
          </div>
        ) : (
          groups.map(({ pkg, items: groupItems }) => (
            <PackageGroupView key={pkg.id} pkg={pkg} items={groupItems} />
          ))
        )}
      </div>
    </div>
  );
};

