import React from 'react';
import { PackageGroup, TakeoffItem } from '../../../entities/takeoff-item/model/types';
import { TakeoffTable } from './TakeoffTable';
import { usePackagesStore } from '../../../features/manage-packages/model/usePackagesStore';

interface PackageGroupViewProps {
  pkg: PackageGroup;
  items: TakeoffItem[];
}

export const PackageGroupView: React.FC<PackageGroupViewProps> = ({ pkg, items }) => {
  const { collapsedPkgs, togglePkgCollapse } = usePackagesStore();
  const collapsed = collapsedPkgs.has(pkg.id);

  return (
    <div className="pkg-group">
      <div
        className={`pkg-header ${collapsed ? 'collapsed' : ''}`}
        onClick={() => togglePkgCollapse(pkg.id)}
      >
        <div className="pkg-header-left">
          <span className="pkg-chevron">{collapsed ? '▶' : '▼'}</span>
          <span className="pkg-name-lbl">{pkg.name}</span>
        </div>
        <span className="pkg-count-lbl">
          {items.length} {items.length !== 1 ? 'ítems' : 'ítem'}
        </span>
      </div>

      {!collapsed && (
        <div className="pkg-body">
          <TakeoffTable items={items} />
        </div>
      )}
    </div>
  );
};
