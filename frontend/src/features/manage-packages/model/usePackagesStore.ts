import { createStore } from '../../../shared/lib/store';
import { PackageGroup } from '../../../entities/takeoff-item/model/types';
import { SectionType } from '../../../shared/types/common';
import { loadStoredPackages, saveStoredPackages } from '../../../shared/lib/storage';
import { uid } from '../../../shared/lib/uid';

export interface PackagesState {
  packages: PackageGroup[];
  selPkg: string | null;
  collapsedPkgs: Set<string>;
}

export interface PackagesActions {
  loadPackages: (section: SectionType) => void;
  setSelPkg: (pkgId: string | null) => void;
  togglePkgCollapse: (pkgId: string) => void;
  addPackage: (name: string, section: SectionType) => PackageGroup;
  updatePackage: (id: string, name: string, section: SectionType) => void;
  deletePackage: (id: string, section: SectionType) => void;
  setPackages: (packages: PackageGroup[], section: SectionType) => void;
}

export type PackagesStore = PackagesState & PackagesActions;

const initialSection = (localStorage.getItem('epc-active-section') as SectionType) || 'pat';
const initialPackages = loadStoredPackages(initialSection);

export const usePackagesStore = createStore<PackagesStore>((set, get) => ({
  packages: initialPackages,
  selPkg: initialPackages[0]?.id || null,
  collapsedPkgs: new Set<string>(),

  loadPackages: (section: SectionType) => {
    const pkgs = loadStoredPackages(section);
    set({
      packages: pkgs,
      selPkg: pkgs[0]?.id || null
    });
  },

  setSelPkg: (selPkg: string | null) => set({ selPkg }),

  togglePkgCollapse: (pkgId: string) => {
    const current = new Set(get().collapsedPkgs);
    if (current.has(pkgId)) {
      current.delete(pkgId);
    } else {
      current.add(pkgId);
    }
    set({ collapsedPkgs: current });
  },

  addPackage: (name: string, section: SectionType) => {
    const trimmed = name.trim();
    const newPkg: PackageGroup = {
      id: uid(),
      name: trimmed || `PARTIDA ${get().packages.length + 1}`
    };
    const updated = [...get().packages, newPkg];
    saveStoredPackages(section, updated);
    set({
      packages: updated,
      selPkg: get().selPkg || newPkg.id
    });
    return newPkg;
  },

  updatePackage: (id: string, name: string, section: SectionType) => {
    const updated = get().packages.map(p => (p.id === id ? { ...p, name: name.trim() } : p));
    saveStoredPackages(section, updated);
    set({ packages: updated });
  },

  deletePackage: (id: string, section: SectionType) => {
    const updated = get().packages.filter(p => p.id !== id);
    saveStoredPackages(section, updated);
    set({
      packages: updated,
      selPkg: get().selPkg === id ? updated[0]?.id || null : get().selPkg
    });
  },

  setPackages: (packages: PackageGroup[], section: SectionType) => {
    saveStoredPackages(section, packages);
    set({
      packages,
      selPkg: packages[0]?.id || null
    });
  }
}));
