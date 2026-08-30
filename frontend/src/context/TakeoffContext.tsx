import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  TakeoffItem,
  TakeoffRule,
  PackageGroup,
  SectionType,
  TabType,
  AddModeType,
  MaterialType,
  PartidaRecord,
  AccessoryViewMode
} from '../types/takeoff';
import {
  loadStoredItems,
  saveStoredItems,
  loadStoredRules,
  saveStoredRules,
  loadStoredPackages,
  saveStoredPackages,
  loadStoredPartidas,
  saveStoredPartidas
} from '../lib/storage';
import {
  syncItemsToSupabase,
  fetchTakeoffRulesFromSupabase,
  saveTakeoffRuleToSupabase,
  deleteTakeoffRuleFromSupabase,
  fetchDetalleVariantsFromSupabase,
  saveDetalleVariantToSupabase,
  syncPartidasToSupabase,
  fetchPartidasFromSupabase
} from '../lib/supabase';
import {
  uid,
  isPrimaryMaterial,
  generateTagUnico,
  getSequentialTag,
  applyDetalleVariant,
  applyBarraPotDetalleVariant,
  assignTagUnicoSuffixes,
  consolidateAccessories
} from '../utils/calculations';
import { getCalculatedVariantItems, updateDynamicVariants } from '../data/detalleVariants';
import { parseTakeoffCsv } from '../utils/csvParser';
import { correlateItemsWithPartidas, findMatchingPartidaItem } from '../utils/partidaMatcher';
import { getDefaultTagPrefixByRule, getDefaultDetalleByRule } from '../data/seedRules';
import * as XLSX from 'xlsx';

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
  partidas: PartidaRecord[];
  selPkg: string | null;
  addMode: AddModeType;
  searchQuery: string;
  filterPlano: string;
  filterDetalle: string;
  customPlano: string;
  customRev: string;
  collapsedPkgs: Set<string>;
  collapsedRuleAreas: Set<string>;
  undoSnapshot: string | null;
  isSyncing: boolean;
  isPartidasModalOpen: boolean;
  editingItemId: string | null;
  accessoryViewMode: AccessoryViewMode;
  highlightedTag: string | null;
  toast: ToastState | null;

  // Actions
  setSection: (section: SectionType) => void;
  setTab: (tab: TabType) => void;
  toggleTheme: () => void;
  setActiveArea: (area: 'AREA SECA' | 'AREA HUMEDA') => void;
  setSelPkg: (pkgId: string) => void;
  setAddMode: (mode: AddModeType) => void;
  setAccessoryViewMode: (mode: AccessoryViewMode) => void;
  toggleAccessoryViewMode: () => void;
  setHighlightedTag: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterPlano: (plano: string) => void;
  setFilterDetalle: (detalle: string) => void;
  clearFilters: () => void;
  setCustomPlano: (plano: string) => void;
  setCustomRev: (rev: string) => void;
  togglePkgCollapse: (pkgId: string) => void;
  toggleRuleAreaCollapse: (area: string) => void;
  setEditingItemId: (id: string | null) => void;
  setIsPartidasModalOpen: (open: boolean) => void;

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

  uploadPartidasList: (newPartidas: PartidaRecord[]) => Promise<void>;
  correlateAllItems: () => void;

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

  const [partidas, setPartidas] = useState<PartidaRecord[]>(() => loadStoredPartidas());
  const [isPartidasModalOpen, setIsPartidasModalOpen] = useState(false);
  const [items, setItems] = useState<TakeoffItem[]>(() => {
    const rawItems = loadStoredItems(section);
    const storedPartidas = loadStoredPartidas();
    return correlateItemsWithPartidas(rawItems, storedPartidas, 'AREA SECA');
  });
  const [packages, setPackages] = useState<PackageGroup[]>(() => loadStoredPackages(section));
  const [rules, setRules] = useState<TakeoffRule[]>(() => loadStoredRules(section));

  const [selPkg, setSelPkg] = useState<string | null>(() => packages[0]?.id || null);
  const [addMode, setAddMode] = useState<AddModeType>('rule');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlano, setFilterPlano] = useState('');
  const [filterDetalle, setFilterDetalle] = useState('');

  const clearFilters = () => {
    setFilterPlano('');
    setFilterDetalle('');
    setSearchQuery('');
  };
  const [customPlano, setCustomPlano] = useState<string>(() => localStorage.getItem('epc-plano') || '');
  const [customRev, setCustomRev] = useState<string>(() => localStorage.getItem('epc-rev') || '');

  const [collapsedPkgs, setCollapsedPkgs] = useState<Set<string>>(new Set());
  const [collapsedRuleAreas, setCollapsedRuleAreas] = useState<Set<string>>(
    new Set(['AREA SECA', 'AREA HUEMDA'])
  );

  const [undoSnapshot, setUndoSnapshot] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [accessoryViewMode, setAccessoryViewModeState] = useState<AccessoryViewMode>(() => {
    return (localStorage.getItem('epc-accessory-view-mode') as AccessoryViewMode) || 'separated';
  });

  const setAccessoryViewMode = (mode: AccessoryViewMode) => {
    setAccessoryViewModeState(mode);
    localStorage.setItem('epc-accessory-view-mode', mode);
  };

  const toggleAccessoryViewMode = () => {
    setAccessoryViewMode(accessoryViewMode === 'separated' ? 'join' : 'separated');
  };

  const [highlightedTag, setHighlightedTagState] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<any>(null);

  const setHighlightedTag = (tag: string | null) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setHighlightedTagState(tag);
    if (tag) {
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedTagState(null);
      }, 1800);
    }
  };

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

  // Load rules and details from Supabase dynamically
  useEffect(() => {
    async function loadCloudConfig() {
      // 1. Fetch Takeoff Rules
      const { data: cloudRules, error: rulesErr } = await fetchTakeoffRulesFromSupabase(section);
      if (!rulesErr && cloudRules) {
        const enrichedRules = cloudRules.map(r => {
          const up = r.trigger.toUpperCase().trim();
          let trigger = r.trigger;
          let subitems = r.subitems;

          if (
            up === 'SOLDADURA T 4/0 - 2/0' ||
            up === 'SOLDADURA T 4/0  - 2/0' ||
            up === 'SOLDADURA T 4/0-2/0' ||
            up === 'SOLDADURA T 4/0 -2/0'
          ) {
            trigger = 'SOLDADURA T 4/0 -2/0';
            subitems = r.subitems.map(s =>
              s.desc.toUpperCase().includes('SOLDADURA T 4/0')
                ? { ...s, desc: 'SOLDADURA T 4/0 -2/0' }
                : s
            );
          }

          return {
            ...r,
            trigger,
            subitems,
            detalle: r.detalle || getDefaultDetalleByRule(trigger, activeArea),
            tagPrefix: r.tagPrefix || getDefaultTagPrefixByRule(trigger)
          };
        });

        setRules(enrichedRules);
        saveStoredRules(section, enrichedRules); // Sync to local storage as fallback
        console.log(`[Supabase] Cargadas ${enrichedRules.length} reglas para ${section}`);
      } else if (rulesErr) {
        console.warn('[Supabase] Error al cargar reglas, usando fallback local:', rulesErr);
      }

      // 2. Fetch Detalle Variants
      const { data: cloudVariants, error: variantsErr } = await fetchDetalleVariantsFromSupabase();
      if (!variantsErr && cloudVariants) {
        updateDynamicVariants(cloudVariants);
        console.log(`[Supabase] Cargadas ${cloudVariants.length} variantes de detalles`);
      } else if (variantsErr) {
        console.warn('[Supabase] Error al cargar variantes de detalles, usando fallback local:', variantsErr);
      }

      // 3. Fetch Master Partidas
      const { data: cloudPartidas, error: partidasErr } = await fetchPartidasFromSupabase();
      if (!partidasErr && cloudPartidas && cloudPartidas.length > 0) {
        setPartidas(cloudPartidas);
        saveStoredPartidas(cloudPartidas);
        setItems(prev => correlateItemsWithPartidas(prev, cloudPartidas, activeArea));
        console.log(`[Supabase] Cargadas ${cloudPartidas.length} partidas master`);
      } else if (partidasErr) {
        console.warn('[Supabase] Error al cargar partidas master:', partidasErr);
      }
    }
    loadCloudConfig();
  }, [section, activeArea]);

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
    setFilterPlano('');
    setFilterDetalle('');
    setUndoSnapshot(null);

    const loadedItems = loadStoredItems(newSection);
    const loadedRules = loadStoredRules(newSection);
    const loadedPackages = loadStoredPackages(newSection);

    const correlatedItems = correlateItemsWithPartidas(loadedItems, partidas, activeArea);
    setItems(correlatedItems);
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
    const tempItem: TakeoffItem = {
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
    tempItem.partida = findMatchingPartidaItem(tempItem, partidas, activeArea);

    setItems(prev => [...prev, tempItem]);
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

      // Check DETALLE modification on r1 or r2
      if (updates.detalle !== undefined && (target.ruleId === 'r1' || target.ruleId === 'r2')) {
        const nSop = (updates as any).numSoportes || 0;
        const nJmp = (updates as any).numJumpers || 0;
        const sibs = updated.filter(i => i.tagPlano === target.tagPlano && i.pkgId === target.pkgId);
        const tItem = sibs.find(i => i.desc.toUpperCase().includes('TUBERIA') || i.desc.toUpperCase().includes('TUBERÍA'));
        const cItem = sibs.find(i => i.desc.toUpperCase().includes('CABLE') && !i.desc.toUpperCase().includes('JUMPER'));
        const tOt = tItem ? tItem.metradoOt : '';
        const cOt = cItem ? cItem.metradoOt : '';
        updated = applyDetalleVariant(updated, target.tagPlano, target.pkgId, target.detalle, nSop, nJmp, tOt, cOt);
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

      const targetTag = newTagPlano || oldTagPlano;
      if (targetTag) {
        setHighlightedTag(targetTag);
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

    if (rule.id === 'r1' || rule.id === 'r2') {
      const uniqueTags = [...new Set(newItems.map(it => it.tagPlano))];
      uniqueTags.forEach(tag => {
        const sibs = combined.filter(i => i.tagPlano === tag && i.pkgId === pkgId);
        const tItem = sibs.find(i => i.desc.toUpperCase().includes('TUBERIA') || i.desc.toUpperCase().includes('TUBERÍA'));
        const cItem = sibs.find(i => i.desc.toUpperCase().includes('CABLE') && !i.desc.toUpperCase().includes('JUMPER'));
        const tOt = tItem ? tItem.metradoOt : '';
        const cOt = cItem ? cItem.metradoOt : '';
        combined = applyDetalleVariant(combined, tag, pkgId, detalleCode, numSoportes, numJumpers, tOt, cOt);
      });
    }

    if ((rule.id === 'r8' || rule.id === 'r9' || upTrigger.includes('BARRA')) && (activeArea === 'AREA HUMEDA' || detalleCode.startsWith('010/17'))) {
      const uniqueTags = [...new Set(newItems.map(it => it.tagPlano))];
      uniqueTags.forEach(tag => {
        combined = applyBarraPotDetalleVariant(combined, tag, pkgId, detalleCode, numSoportes);
      });
    }

    combined = assignTagUnicoSuffixes(combined);
    combined = correlateItemsWithPartidas(combined, partidas, activeArea);

    setUndoSnapshot(preSnapshot);
    setItems(combined);
    showToast(`${newItems.length} ítems agregados`, 'success');
  };

  const handleCsvUpload = (csvText: string) => {
    const pkgId = selPkg || packages[0]?.id || 'p1';
    const preSnapshot = JSON.stringify(items);
    const { newItems, addedCount, rejectedRows } = parseTakeoffCsv(
      csvText,
      rules,
      pkgId,
      customPlano,
      customRev,
      items,
      activeArea
    );

    // If there are rejected rows, generate and download an Excel file with the report
    if (rejectedRows && rejectedRows.length > 0) {
      const wsData = [
        ['FILA EXCEL', 'TAG', 'LONGITUD_CABLE', 'LONGITUD_TUBERIA', 'DETALLE', 'JUMPERS', 'MOTIVO DE RECHAZO'],
        ...rejectedRows.map(r => [
          r.fila,
          r.tag,
          r.longitudCable,
          r.longitudTuberia,
          r.detalle,
          r.jumpers,
          r.motivo
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Filas Rechazadas');
      XLSX.writeFile(wb, 'filas_rechazadas_metrado.xlsx');
    }

    if (addedCount > 0) {
      setUndoSnapshot(preSnapshot);
      const correlatedNewItems = correlateItemsWithPartidas(newItems, partidas, activeArea);
      setItems(correlatedNewItems);
      if (rejectedRows && rejectedRows.length > 0) {
        showToast(
          `${addedCount} ítems agregados. ${rejectedRows.length} fila(s) rechazadas (descargando reporte en Excel)`,
          'warn'
        );
      } else {
        showToast(`${addedCount} ítems agregados desde Excel`, 'success');
      }
    } else {
      if (rejectedRows && rejectedRows.length > 0) {
        showToast(
          `No se procesó ningún ítem. ${rejectedRows.length} fila(s) rechazadas por prefijos no válidos (descargando reporte en Excel)`,
          'warn'
        );
      } else {
        showToast('No se encontraron filas con datos válidos en el archivo Excel', 'warn');
      }
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
      showToast('Define la tabla de Canalizado antes de guardar en BD. Puedes exportar a Excel.', 'warn');
      return;
    }
    if (items.length === 0) {
      showToast('No hay ítems en la pantalla para guardar', 'warn');
      return;
    }

    const isJoined = accessoryViewMode === 'join';
    const itemsToSync = isJoined ? consolidateAccessories(items) : items;
    const modeLabel = isJoined ? 'UNIDOS (TOTALES)' : 'SEPARADOS (DETALLADO)';

    const confirmMessage = isJoined
      ? `⚠️ ATENCIÓN - GUARDAR EN BASE DE DATOS (MODO UNIDO):\n\n` +
        `Vas a depositar ${itemsToSync.length} filas en Supabase en modo UNIDOS (Totales Consolidados).\n\n` +
        `• Los accesorios base y jumpers de cada TAG se guardarán sumados en una sola fila combinada.\n` +
        `• Asegúrate de que este es el formato deseado para el registro en BD.\n\n` +
        `¿Deseas proceder y enviar los ${itemsToSync.length} ítems consolidados a la base de datos?`
      : `ℹ️ CONFIRMAR ENVÍO A BASE DE DATOS (MODO SEPARADO):\n\n` +
        `Vas a depositar ${itemsToSync.length} filas en Supabase en modo SEPARADOS (Detallado).\n\n` +
        `• Los accesorios base y jumpers se guardarán en líneas independientes.\n\n` +
        `¿Deseas proceder y enviar los ${itemsToSync.length} ítems a la base de datos?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsSyncing(true);

    const result = await syncItemsToSupabase(itemsToSync, packages);
    setIsSyncing(false);

    if (result.success) {
      showToast(`¡${result.count} ítems (${modeLabel}) guardados en Supabase con éxito!`, 'success');
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

  const saveRule = async (rule: TakeoffRule, isNew: boolean) => {
    if (!rule.trigger.trim()) {
      showToast('El disparador no puede estar vacío', 'warn');
      return;
    }
    if (rule.subitems.length === 0) {
      showToast('Agrega al menos un ítem asociado', 'warn');
      return;
    }

    const { error } = await saveTakeoffRuleToSupabase(rule, section, rules.length);
    if (error) {
      console.warn('[Supabase] Error al guardar la regla en la nube, guardando localmente:', error);
    }

    setRules(prev => {
      if (isNew) return [...prev, rule];
      return prev.map(r => (r.id === rule.id ? rule : r));
    });
    showToast(isNew ? 'Regla creada' : 'Regla actualizada', 'success');
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm('¿Eliminar esta regla?')) return;
    
    const { error } = await deleteTakeoffRuleFromSupabase(id);
    if (error) {
      console.warn('[Supabase] Error al eliminar la regla de la nube, eliminando localmente:', error);
    }

    setRules(prev => prev.filter(r => r.id !== id));
    showToast('Regla eliminada', 'warn');
  };

  const correlateAllItems = () => {
    setItems(prev => {
      const updated = correlateItemsWithPartidas(prev, partidas, activeArea);
      saveStoredItems(section, updated);
      return updated;
    });
    showToast('Partidas correlacionadas en todo el metrado', 'success');
  };

  const uploadPartidasList = async (newPartidas: PartidaRecord[]) => {
    const result = await syncPartidasToSupabase(newPartidas);
    const merged = [...partidas, ...newPartidas];
    setPartidas(merged);
    saveStoredPartidas(merged);
    setItems(prev => {
      const correlated = correlateItemsWithPartidas(prev, merged, activeArea);
      saveStoredItems(section, correlated);
      return correlated;
    });

    if (result.success) {
      showToast(`¡${result.count} partidas guardadas en Supabase y correlacionadas con éxito!`, 'success');
    } else {
      showToast(`Partidas guardadas localmente (${newPartidas.length}). ${result.error || ''}`, 'warn');
    }
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
        partidas,
        selPkg,
        addMode,
        searchQuery,
        filterPlano,
        filterDetalle,
        customPlano,
        customRev,
        collapsedPkgs,
        collapsedRuleAreas,
        undoSnapshot,
        isSyncing,
        isPartidasModalOpen,
        editingItemId,
        accessoryViewMode,
        highlightedTag,
        toast,

        setSection,
        setTab,
        toggleTheme,
        setActiveArea,
        setSelPkg,
        setAddMode,
        setAccessoryViewMode,
        toggleAccessoryViewMode,
        setHighlightedTag,
        setSearchQuery,
        setFilterPlano,
        setFilterDetalle,
        clearFilters,
        setCustomPlano,
        setCustomRev,
        togglePkgCollapse,
        toggleRuleAreaCollapse,
        setEditingItemId,
        setIsPartidasModalOpen,

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

        uploadPartidasList,
        correlateAllItems,

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

