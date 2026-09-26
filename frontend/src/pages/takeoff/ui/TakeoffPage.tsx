import React, { useState } from 'react';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { usePackagesStore } from '../../../features/manage-packages/model/usePackagesStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { AddPanel } from '../../../widgets/add-panel/ui/AddPanel';
import { PackageGroupView } from '../../../widgets/takeoff-table/ui/PackageGroupView';
import { consolidateAccessories } from '../../../entities/takeoff-item/model/itemAggregation';

export const TakeoffPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('epc-sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('epc-sidebar-collapsed', String(next));
      return next;
    });
  };

  const items = useItemsStore(state => state.items);
  const packages = usePackagesStore(state => state.packages);
  const accessoryViewMode = useAppStore(state => state.accessoryViewMode);
  const setAccessoryViewMode = useAppStore(state => state.setAccessoryViewMode);

  const searchQuery = useUIStore(state => state.searchQuery);
  const filterPlano = useUIStore(state => state.filterPlano);
  const filterDetalle = useUIStore(state => state.filterDetalle);

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
    <div className="takeoff-layout">
      {/* Collapsible Sidebar Drawer */}
      <aside className={`takeoff-sidebar-drawer ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        <AddPanel onCollapseSidebar={toggleSidebar} />
      </aside>

      {/* Main Table Content */}
      <section className={`takeoff-content ${isSidebarCollapsed ? 'takeoff-content-expanded' : ''}`}>
        {isSidebarCollapsed && (
          <button
            type="button"
            className="floating-sidebar-toggle"
            onClick={toggleSidebar}
            title="Mostrar panel de Metadatos y Reglas"
          >
            ▶ METADATOS & INGRESO
          </button>
        )}

        {items.length > 0 && (
          <div className="consumables-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="consumables-label">
                CONSUMIBLES:
              </span>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${accessoryViewMode === 'separated' ? 'active' : ''}`}
                  onClick={() => setAccessoryViewMode('separated')}
                  title="Mostrar consumibles base y jumpers en filas separadas independientes"
                >
                  SEPARADOS
                </button>
                <button
                  type="button"
                  className={`mode-btn ${accessoryViewMode === 'join' ? 'active' : ''}`}
                  onClick={() => setAccessoryViewMode('join')}
                  title="Consolidar y sumar totales de consumibles idénticos por TAG (Base + Jumpers)"
                >
                  UNIDOS (TOTALES)
                </button>
              </div>
            </div>

            <div className="consumables-hint">
              {accessoryViewMode === 'join' ? (
                <span className="hint-join">
                  ● Modo Unido: Accesorios y jumpers consolidados en totales por TAG
                </span>
              ) : (
                <span className="hint-sep">● Modo Separado: Accesorios desglosados en líneas independientes</span>
              )}
            </div>
          </div>
        )}

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
