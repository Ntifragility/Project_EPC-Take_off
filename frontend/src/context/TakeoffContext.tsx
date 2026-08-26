import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  TakeoffItem,
  TakeoffRule,
  PackageGroup,
  SectionType,
  TabType,
  AddModeType,
  MaterialType
} from '../types/takeoff';
import {
  loadStoredItems,
  saveStoredItems,
  loadStoredRules,
  saveStoredRules,
  loadStoredPackages,
  saveStoredPackages
} from '../lib/storage';
import { syncItemsToSupabase } from '../lib/supabase';
import {
  uid,
  isPrimaryMaterial,
  generateTagUnico,
  getSequentialTag,
  applyDetalleVariant,
  applyBarraPotDetalleVariant,
  assignTagUnicoSuffixes
} from '../utils/calculations';
import { getCalculatedVariantItems } from '../data/detalleVariants';
import { parseTakeoffCsv } from '../utils/csvParser';

interface ToastState {
  message: string;
  type?: 'info' | 'warn' | 'success';
}

interface TakeoffContextType {
  section: SectionType;
  tab: TabType;
  theme: 'dark' | 'light';
  activeArea: 'AREA SECA' | 'AREA HUMEDA';
  items: TakeoffItem[];
  packages: PackageGroup[];
  rules: TakeoffRule[];
  selPkg: string | null;
  addMode: AddModeType;
  searchQuery: string;
  filterDetalle: string;
  customPlano: string;
  customRev: string;
  collapsedPkgs: Set<string>;
  collapsedRuleAreas: Set<string>;
  undoSnapshot: string | null;
  isSyncing: boolean;
  editingItemId: string | null;
  toast: ToastState | null;

  // Actions
  setSection: (section: SectionType) => void;
  setTab: (tab: TabType) => void;
  toggleTheme: () => void;
  setActiveArea: (area: 'AREA SECA' | 'AREA HUMEDA') => void;
  setSelPkg: (pkgId: string) => void;
  setAddMode: (mode: AddModeType) => void;
  setSearchQuery: (query: string) => void;
  setFilterDetalle: (detalle: string) => void;
  setCustomPlano: (plano: string) => void;
  setCustomRev: (rev: string) => void;
  togglePkgCollapse: (pkgId: string) => void;
  toggleRuleAreaCollapse: (area: string) => void;
  setEditingItemId: (id: string | null) => void;

  addCustomItem: (desc: string, qty: number, unit: string) => void;
  updateItem: (id: string, updates: Partial<TakeoffItem>) => void;
  deleteItem: (id: string) => void;
  applyTriggerRule: (
    ruleId: string,
    count: number,
    baseTag: string,
    detalle: string,
    numSoportes?: number,
    numJumpers?: number
  ) => void;
  handleCsvUpload: (csvText: string) => void;
  syncGlobalContext: () => void;
  syncToDatabase: () => Promise<void>;
  undoLastAction: () => void;
  clearCache: () => void;

  addPackage: (name: string) => void;
  updatePackage: (id: string, name: string) => void;
  deletePackage: (id: string) => void;

  saveRule: (rule: TakeoffRule, isNew: boolean) => void;
  deleteRule: (id: string) => void;

  showToast: (message: string, type?: 'info' | 'warn' | 'success') => void;
}

const TakeoffContext = createContext<TakeoffContextType | undefined>(undefined);

export const TakeoffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [section, setSectionState] = useState<SectionType>(() => {
    return (localStorage.getItem('epc-active-section') as SectionType) || 'pat';
  });
  const [tab, setTab] = useState<TabType>('takeoff');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('epc-theme') as 'dark' | 'light') || 'dark';
  });
  const [activeArea, setActiveAreaState] = useState<'AREA SECA' | 'AREA HUMEDA'>(() => {
    return (localStorage.getItem('epc-active-area') as 'AREA SECA' | 'AREA HUMEDA') || 'AREA SECA';
  });

  const setActiveArea = (area: 'AREA SECA' | 'AREA HUMEDA') => {
    setActiveAreaState(area);
    localStorage.setItem('epc-active-area', area);
  };

  const [items, setItems] = useState<TakeoffItem[]>(() => loadStoredItems(section));
  const [packages, setPackages] = useState<PackageGroup[]>(() => loadStoredPackages(section));
  const [rules, setRules] = useState<TakeoffRule[]>(() => loadStoredRules(section));

  const [selPkg, setSelPkg] = useState<string | null>(() => packages[0]?.id || null);
  const [addMode, setAddMode] = useState<AddModeType>('rule');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDetalle, setFilterDetalle] = useState('');
  const [customPlano, setCustomPlano] = useState<string>(() => localStorage.getItem('epc-plano') || '');
  const [customRev, setCustomRev] = useState<string>(() => localStorage.getItem('epc-rev') || '');

  const [collapsedPkgs, setCollapsedPkgs] = useState<Set<string>>(new Set());
  const [collapsedRuleAreas, setCollapsedRuleAreas] = useState<Set<string>>(
    new Set(['AREA SECA', 'AREA HUEMDA'])
  );

  const [undoSnapshot, setUndoSnapshot] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sync theme to document body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('epc-theme', theme);
  }, [theme]);

  // Persist items
  useEffect(() => {
    saveStoredItems(section, items);
  }, [items, section]);

  // Persist packages
  useEffect(() => {
    saveStoredPackages(section, packages);
    if (packages.length > 0 && (!selPkg || !packages.some(p => p.id === selPkg))) {
      setSelPkg(packages[0].id);
    }
  }, [packages, section, selPkg]);

  // Persist rules
  useEffect(() => {
    saveStoredRules(section, rules);
  }, [rules, section]);

  // Persist global plano and rev
  useEffect(() => {
    localStorage.setItem('epc-plano', customPlano);
    localStorage.setItem('epc-rev', customRev);
  }, [customPlano, customRev]);

  const showToast = (message: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setToast({ message, type });
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setSection = (newSection: SectionType) => {
    if (newSection === section) return;
    saveStoredItems(section, items);
    saveStoredRules(section, rules);
    saveStoredPackages(section, packages);

    setSectionState(newSection);
    localStorage.setItem('epc-active-section', newSection);
    setTab('takeoff');
    setEditingItemId(null);
    setSearchQuery('');
    setFilterDetalle('');
    setUndoSnapshot(null);

    const loadedItems = loadStoredItems(newSection);
    const loadedRules = loadStoredRules(newSection);
    const loadedPackages = loadStoredPackages(newSection);

    setItems(loadedItems);
    setRules(loadedRules);
    setPackages(loadedPackages);
    setSelPkg(loadedPackages[0]?.id || null);

    showToast(newSection === 'canalizado' ? 'Sección Canalizado activa' : 'Sección PAT activa');
  };

  const togglePkgCollapse = (pkgId: string) => {
    setCollapsedPkgs(prev => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId);
      else next.add(pkgId);
      return next;
    });
  };

  const toggleRuleAreaCollapse = (area: string) => {
    setCollapsedRuleAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const addCustomItem = (desc: string, qty: number, unit: string) => {
    if (!desc.trim()) {
      showToast('Ingresa una descripción', 'warn');
      return;
    }
    const pkgId = selPkg || packages[0]?.id || 'p1';
    const newItem: TakeoffItem = {
      id: uid(),
      pkgId,
      desc: desc.trim(),
      qty,
      unit: unit.toUpperCase() || 'UND',
      notes: '',
      material: 'P',
      plano: (customPlano || '').toUpperCase(),
      rev: (customRev || '').toUpperCase(),
      tagUnico: '',
      tagPlano: '',
      detalle: '',
      metradoOt: ''
    };

    setItems(prev => [...prev, newItem]);
    showToast('Ítem agregado', 'success');
  };

  const updateItem = (id: string, updates: Partial<TakeoffItem>) => {
    setItems(prev => {
      const oldItem = prev.find(i => i.id === id);
      if (!oldItem) return prev;

      const oldTagPlano = (oldItem.tagPlano || '').trim();
      const newTagPlano = updates.tagPlano !== undefined ? updates.tagPlano.trim() : oldTagPlano;
      const tagChanged = updates.tagPlano !== undefined && newTagPlano !== oldTagPlano;

      const oldPlano = oldItem.plano || '';
      const newPlano = updates.plano !== undefined ? updates.plano.toUpperCase() : oldPlano;
      const planoChanged = updates.plano !== undefined && newPlano !== oldPlano;

      const oldRev = oldItem.rev || '';
      const newRev = updates.rev !== undefined ? updates.rev.toUpperCase() : oldRev;

      const oldDetalle = oldItem.detalle || '';
      const newDetalle = updates.detalle !== undefined ? updates.detalle.toUpperCase() : oldDetalle;
      const detalleChanged = updates.detalle !== undefined && newDetalle !== oldDetalle;

      // Identify whether this item belongs to a multi-item rule group
      const isGroupedRule = Boolean(oldItem.ruleId && oldTagPlano);

      let updated = prev.map(it => {
        // Direct target item being edited
        if (it.id === id) {
          const appliedTagPlano = newTagPlano;
          const appliedPlano = newPlano;
          const appliedRev = newRev;
          const appliedDetalle = newDetalle;
          const appliedMaterial = (updates.material || it.material) as MaterialType;
          // Universal: TAG UNICO is automatically updated whenever tagPlano, plano or material changes!
          const appliedTagUnico =
            appliedMaterial === 'P'
              ? generateTagUnico(appliedPlano, appliedTagPlano, 'P')
              : '';

          return {
            ...it,
            ...updates,
            material: appliedMaterial,
            tagPlano: appliedTagPlano,
            plano: appliedPlano,
            rev: appliedRev,
            detalle: appliedDetalle,
            tagUnico: appliedTagUnico
          };
        }

        // Synchronize companion items in the same rule group in-place!
        if (
          isGroupedRule &&
          it.ruleId === oldItem.ruleId &&
          it.pkgId === oldItem.pkgId &&
          (it.tagPlano || '').trim() === oldTagPlano
        ) {
          const companionTagPlano = tagChanged ? newTagPlano : it.tagPlano;
          const companionPlano = planoChanged ? newPlano : it.plano;
          const companionRev = newRev;
          const companionDetalle = detalleChanged ? newDetalle : it.detalle;
          const companionTagUnico =
            it.material === 'P'
              ? generateTagUnico(companionPlano, companionTagPlano, 'P')
              : '';

          return {
            ...it,
            tagPlano: companionTagPlano,
            plano: companionPlano,
            rev: companionRev,
            detalle: companionDetalle,
            tagUnico: companionTagUnico
          };
        }

        return it;
      });

      const target = updated.find(i => i.id === id);
      if (!target) return updated;

      // Check DETALLE modification on r2
      if (updates.detalle !== undefined && target.ruleId === 'r2') {
        const nSop = (updates as any).numSoportes || 1;
        const nJmp = (updates as any).numJumpers || 1;
        updated = applyDetalleVariant(updated, target.tagPlano, target.pkgId, target.detalle, nSop, nJmp);
      }

      // Check CABLE DESNUDO 4/0 AWG changes (update CINTA AMARILLA and TIERRA DE CULTIVO)
      if (
        target.ruleId === 'r1' &&
        target.desc.toUpperCase().includes('CABLE DESNUDO 4/0 AWG') &&
        updates.metradoOt !== undefined
      ) {
        const cableVal = parseFloat(updates.metradoOt) || 0;
        const tierraVal = (0.375 * 0.5 * cableVal).toFixed(2);

        updated = updated.map(sib => {
          if (
            sib.tagPlano === target.tagPlano &&
            sib.pkgId === target.pkgId
          ) {
            if (sib.desc.toUpperCase().includes('CINTA AMARILLA')) {
              return { ...sib, metradoOt: updates.metradoOt! };
            }
            if (sib.desc.toUpperCase().includes('TIERRA DE CULTIVO')) {
              return { ...sib, metradoOt: tierraVal };
            }
          }
          return sib;
        });
      }

      // Check CABLE DESNUDO 2/0 AWG changes with DETALLE 153 (update PRENSA PARALELA 1c/3m)
      if (
        target.ruleId === 'r2' &&
        target.desc.toUpperCase().includes('CABLE DESNUDO 2/0 AWG') &&
        target.detalle === '153' &&
        updates.metradoOt !== undefined
      ) {
        const cableVal = parseFloat(updates.metradoOt) || 0;
        const prensaVal = Math.ceil(cableVal / 3).toString();

        updated = updated.map(sib => {
          if (
            sib.ruleId === target.ruleId &&
            sib.tagPlano === target.tagPlano &&
            sib.pkgId === target.pkgId &&
            sib.desc.toUpperCase().includes('PRENSA PARALELA 1 CONDUCTOR')
          ) {
            return { ...sib, metradoOt: prensaVal };
          }
          return sib;
        });
      }

      return assignTagUnicoSuffixes(updated);
    });
    setEditingItemId(null);
    showToast('Ítem actualizado', 'info');
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    showToast('Ítem eliminado', 'warn');
  };

  const applyTriggerRule = (
    ruleId: string,
    count: number,
    baseTag: string,
    detalleCode: string,
    numSoportes = 1,
    numJumpers = 1
  ) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const preSnapshot = JSON.stringify(items);
    const planoVal = (customPlano || '').toUpperCase();
    const revVal = (customRev || '').toUpperCase();
    const pkgId = selPkg || packages[0]?.id || 'p1';
    const upTrigger = rule.trigger.toUpperCase();
    const isSoldaduraPozo = upTrigger.includes('SOLDADURA') || upTrigger.includes('POZO');
    const isPozoTrigger = upTrigger.includes('POZO');

    const newItems: TakeoffItem[] = [];

    for (let i = 0; i < count; i++) {
      const currentTagPlano = count > 1 && baseTag ? getSequentialTag(baseTag, i) : baseTag;

      if (rule.id === 'r2' && activeArea === 'AREA HUMEDA') {
        const variantItems = getCalculatedVariantItems(
          detalleCode,
          'AREA HUMEDA',
          numSoportes,
          numJumpers
        );
        variantItems.forEach(v => {
          const isVar = v.qty === 'Var.' || String(v.ot).toUpperCase() === 'VAR.';
          const mat = v.material || (isPrimaryMaterial(v.desc) ? 'P' : 'C');
          const finalQty = typeof v.qty === 'number' ? v.qty : 1;
          const finalOt = isVar ? '' : (v.ot !== undefined ? String(v.ot) : '');

          newItems.push({
            id: uid(),
            pkgId,
            desc: v.desc,
            qty: finalQty,
            unit: v.unit,
            notes: '',
            ruleId: rule.id,
            material: mat,
            plano: planoVal,
            rev: revVal,
            tagUnico: generateTagUnico(planoVal, currentTagPlano, mat),
            tagPlano: currentTagPlano,
            detalle: detalleCode,
            metradoOt: finalOt
          });
        });
      } else {
        rule.subitems.forEach(s => {
          const mat = isPrimaryMaterial(s.desc) ? 'P' : 'C';
          let metradoOt = '';
          const descUp = s.desc.toUpperCase();

          if (isPozoTrigger && descUp.includes('TIERRA DE CULTIVO')) {
            metradoOt = '4.71';
          } else if (isPozoTrigger && descUp.includes('CEMENTO GEM')) {
            metradoOt = '22.6';
          } else if (isSoldaduraPozo) {
            metradoOt = '1';
          } else if (upTrigger.includes('CABLE DESNUDO 2/0 AWG')) {
            if (
              descUp.includes('TERMINAL') ||
              descUp.includes('PERNO') ||
              descUp.includes('SOLDADURA') ||
              descUp.includes('CARGA') ||
              descUp.includes('TUBERIA')
            ) {
              metradoOt = '1';
            }
          }

          if (descUp.includes('MOLDE')) {
            metradoOt = '0.0167';
          }

          newItems.push({
            id: uid(),
            pkgId,
            desc: s.desc,
            qty: s.qty,
            unit: s.unit,
            notes: '',
            ruleId: rule.id,
            material: mat,
            plano: planoVal,
            rev: revVal,
            tagUnico: generateTagUnico(planoVal, currentTagPlano, mat),
            tagPlano: currentTagPlano,
            detalle: detalleCode,
            metradoOt
          });
        });
      }
    }

    let combined = [...items, ...newItems];

    if (rule.id === 'r2' && activeArea !== 'AREA HUMEDA') {
      const uniqueTags = [...new Set(newItems.map(it => it.tagPlano))];
      uniqueTags.forEach(tag => {
        combined = applyDetalleVariant(combined, tag, pkgId, detalleCode);
      });
    }

    if ((rule.id === 'r8' || rule.id === 'r9') && (activeArea === 'AREA HUMEDA' || detalleCode.startsWith('010/17'))) {
      const uniqueTags = [...new Set(newItems.map(it => it.tagPlano))];
      uniqueTags.forEach(tag => {
        combined = applyBarraPotDetalleVariant(combined, tag, pkgId, detalleCode, numSoportes);
      });
    }

    combined = assignTagUnicoSuffixes(combined);

    setUndoSnapshot(preSnapshot);
    setItems(combined);
    showToast(`${newItems.length} ítems agregados`, 'success');
  };

  const handleCsvUpload = (csvText: string) => {
    const pkgId = selPkg || packages[0]?.id || 'p1';
    const preSnapshot = JSON.stringify(items);
    const { newItems, addedCount } = parseTakeoffCsv(
      csvText,
      rules,
      pkgId,
      customPlano,
      customRev,
      items,
      activeArea
    );
    if (addedCount > 0) {
      setUndoSnapshot(preSnapshot);
      setItems(newItems);
      showToast(`${addedCount} ítems agregados desde CSV`, 'success');
    } else {
      showToast('No se encontraron reglas aplicables en el CSV', 'warn');
    }
  };

  const syncGlobalContext = () => {
    if (items.length === 0) {
      showToast('No hay ítems para actualizar', 'warn');
      return;
    }
    if (!customPlano || customPlano.split('-').length < 6) {
      showToast('Ingresa un PLANO válido con formato de 6 partes (ej: P22-DA-2151-07-GL-001)', 'warn');
      return;
    }

    if (
      !window.confirm(
        `¿Actualizar los ${items.length} ítems del metrado con el nuevo PLANO (${customPlano}) y REV (${customRev || '-'})?`
      )
    ) {
      return;
    }

    const updated = items.map(it => {
      const mat = it.material || (isPrimaryMaterial(it.desc) ? 'P' : 'C');
      return {
        ...it,
        plano: customPlano,
        rev: (customRev || '').toUpperCase(),
        material: mat
      };
    });

    const finalized = assignTagUnicoSuffixes(updated);
    setItems(finalized);
    showToast('Metrado actualizado con el nuevo PLANO', 'success');
  };

  const syncToDatabase = async () => {
    if (section === 'canalizado') {
      showToast('Define la tabla de Canalizado antes de guardar en BD. Puedes exportar CSV.', 'warn');
      return;
    }
    if (items.length === 0) {
      showToast('No hay ítems en la pantalla para guardar', 'warn');
      return;
    }
    if (!window.confirm(`¿Deseas enviar (añadir) los ${items.length} ítems a la base de datos Supabase?`)) {
      return;
    }

    setIsSyncing(true);

    const result = await syncItemsToSupabase(items, packages);
    setIsSyncing(false);

    if (result.success) {
      showToast(`¡${result.count} ítems guardados en Supabase con éxito!`, 'success');
    } else {
      showToast(result.error || 'Error al guardar en el servidor', 'warn');
    }
  };

  const undoLastAction = () => {
    if (!undoSnapshot) return;
    if (!window.confirm('¿Seguro que deseas deshacer la última inserción? Se eliminarán los ítems creados.')) {
      return;
    }
    setItems(JSON.parse(undoSnapshot));
    setUndoSnapshot(null);
    showToast('Acción deshecha', 'warn');
  };

  const clearCache = () => {
    if (
      window.confirm(
        '¿Limpiar todos los ítems de la pantalla para iniciar un nuevo metrado? (Esto no modificará la base de datos)'
      )
    ) {
      setItems([]);
      showToast('Pantalla restablecida', 'info');
    }
  };

  const addPackage = (name: string) => {
    const cleanName = name.trim().toUpperCase();
    if (!cleanName) {
      showToast('Ingresa un nombre para la partida', 'warn');
      return;
    }
    const newPkg: PackageGroup = { id: uid(), name: cleanName };
    setPackages(prev => [...prev, newPkg]);
    if (!selPkg) setSelPkg(newPkg.id);
    showToast('Partida creada', 'success');
  };

  const updatePackage = (id: string, name: string) => {
    const cleanName = name.trim().toUpperCase();
    if (!cleanName) return;
    setPackages(prev => prev.map(p => (p.id === id ? { ...p, name: cleanName } : p)));
    showToast('Partida actualizada', 'info');
  };

  const deletePackage = (id: string) => {
    const pkg = packages.find(p => p.id === id);
    const count = items.filter(it => it.pkgId === id).length;
    const msg = `¿Eliminar la partida "${pkg?.name || ''}"?` +
      (count > 0 ? `\n\nEsto también eliminará ${count} ítem${count !== 1 ? 's' : ''} del metrado.` : '');

    if (!window.confirm(msg)) return;

    setPackages(prev => prev.filter(p => p.id !== id));
    setItems(prev => prev.filter(it => it.pkgId !== id));
    if (selPkg === id) {
      setSelPkg(packages.find(p => p.id !== id)?.id || null);
    }
    showToast('Partida eliminada', 'warn');
  };

  const saveRule = (rule: TakeoffRule, isNew: boolean) => {
    if (!rule.trigger.trim()) {
      showToast('El disparador no puede estar vacío', 'warn');
      return;
    }
    if (rule.subitems.length === 0) {
      showToast('Agrega al menos un ítem asociado', 'warn');
      return;
    }

    setRules(prev => {
      if (isNew) return [...prev, rule];
      return prev.map(r => (r.id === rule.id ? rule : r));
    });
    showToast(isNew ? 'Regla creada' : 'Regla actualizada', 'success');
  };

  const deleteRule = (id: string) => {
    if (!window.confirm('¿Eliminar esta regla?')) return;
    setRules(prev => prev.filter(r => r.id !== id));
    showToast('Regla eliminada', 'warn');
  };

  return (
    <TakeoffContext.Provider
      value={{
        section,
        tab,
        theme,
        activeArea,
        items,
        packages,
        rules,
        selPkg,
        addMode,
        searchQuery,
        filterDetalle,
        customPlano,
        customRev,
        collapsedPkgs,
        collapsedRuleAreas,
        undoSnapshot,
        isSyncing,
        editingItemId,
        toast,

        setSection,
        setTab,
        toggleTheme,
        setActiveArea,
        setSelPkg,
        setAddMode,
        setSearchQuery,
        setFilterDetalle,
        setCustomPlano,
        setCustomRev,
        togglePkgCollapse,
        toggleRuleAreaCollapse,
        setEditingItemId,

        addCustomItem,
        updateItem,
        deleteItem,
        applyTriggerRule,
        handleCsvUpload,
        syncGlobalContext,
        syncToDatabase,
        undoLastAction,
        clearCache,

        addPackage,
        updatePackage,
        deletePackage,

        saveRule,
        deleteRule,

        showToast
      }}
    >
      {children}
    </TakeoffContext.Provider>
  );
};

export const useTakeoff = (): TakeoffContextType => {
  const ctx = useContext(TakeoffContext);
  if (!ctx) throw new Error('useTakeoff must be used within TakeoffProvider');
  return ctx;
};

