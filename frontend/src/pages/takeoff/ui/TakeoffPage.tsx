import React from 'react';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { usePackagesStore } from '../../../features/manage-packages/model/usePackagesStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { PackageGroupView } from '../../../widgets/takeoff-table/ui/PackageGroupView';
import { TakeoffTable } from '../../../widgets/takeoff-table/ui/TakeoffTable';
import { consolidateAccessories } from '../../../entities/takeoff-item/model/itemAggregation';
import { itemMatchesColumnFilters } from '../../../widgets/takeoff-table/model/columnValue';

export const TakeoffPage: React.FC = () => {
  const items = useItemsStore(state => state.items);
  const packages = usePackagesStore(state => state.packages);
  const accessoryViewMode = useAppStore(state => state.accessoryViewMode);

  const searchQuery = useUIStore(state => state.searchQuery);
  const columnFilters = useUIStore(state => state.columnFilters);

  const section = useAppStore(state => state.section);

  const filteredItems = items.filter(it => {
    if (!itemMatchesColumnFilters(it, columnFilters)) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return [it.partida, it.partidaBalance, it.tagPlano, it.tagUnico, it.desc, it.detalle, it.plano, it.rev]
        .some(value => (value || '').toLowerCase().includes(q));
    }
    return true;
  });

  const displayItems = section !== 'pat' && accessoryViewMode === 'join'
    ? consolidateAccessories(filteredItems)
    : filteredItems;

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
    <div className="takeoff-layout">
      <section className="takeoff-content">
        <div id="table-container">
          {items.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📊</div>
              <div className="empty-title">Sin ítems aún</div>
              <div className="empty-sub">Selecciona una regla en el panel lateral o importa un Excel</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">Sin resultados</div>
              <div className="empty-sub">Prueba con otra búsqueda o limpia los filtros en el panel lateral</div>
            </div>
          ) : section === 'pat' ? (
            <div className="pkg-group">
              <div className="pkg-body">
                <TakeoffTable items={displayItems} />
              </div>
            </div>
          ) : (
            groups.map(({ pkg, items: groupItems }) => (
              <PackageGroupView key={pkg.id} pkg={pkg} items={groupItems} />
            ))
          )}
        </div>
      </section>
    </div>
  );
};
