import React from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { AddPanel } from './AddPanel';
import { PackageGroupView } from './PackageGroupView';

export const TakeoffView: React.FC = () => {
  const { items, packages, searchQuery, filterPlano, filterDetalle } = useTakeoff();

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

  // Group filtered items by packages
  const groups: { pkg: { id: string; name: string }; items: typeof items }[] = [];
  packages.forEach(pkg => {
    const pkgItems = filteredItems.filter(it => it.pkgId === pkg.id);
    if (pkgItems.length > 0) {
      groups.push({ pkg, items: pkgItems });
    }
  });

  const unassignedItems = filteredItems.filter(
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

