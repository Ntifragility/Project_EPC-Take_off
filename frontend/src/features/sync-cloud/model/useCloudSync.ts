import { mergeCurveCatalog, getCurveCatalog } from '../../../entities/bducto/model/catalog';
import {
  fetchTakeoffRulesFromSupabase,
  fetchDetalleVariantsFromSupabase,
  fetchPartidasFromSupabase,
  fetchCurveCatalogFromSupabase,
  syncItemsToSupabase,
  syncBductosToSupabase,
  syncCurveCatalogToSupabase
} from '../../../shared/api/supabase';
import { useBductoStore } from '../../generate-bducto/model/useBductoStore';
import { updateDynamicVariants } from '../../../entities/takeoff-rule/model/detalleVariants';
import { getDefaultDetalleByRule, getDefaultTagPrefixByRule, SEED_CANALIZADO_RULES, SEED_RULES } from '../../../entities/takeoff-rule/model/seedRules';
import { attachCatalogAreas } from '../../../entities/takeoff-rule/model/areaCatalog';
import { saveStoredRules, saveStoredPartidas } from '../../../shared/lib/storage';
import { consolidateAccessories } from '../../../entities/takeoff-item/model/itemAggregation';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { usePartidasStore } from '../../manage-partidas/model/usePartidasStore';
import { useItemsStore } from '../../manage-items/model/useItemsStore';
import { usePackagesStore } from '../../manage-packages/model/usePackagesStore';
import { useAppStore } from '../../app-config/model/useAppStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';

export async function loadInitialCloudConfig() {
  const { section, activeArea } = useAppStore.getState();
  const { setRules, incrementVariantsVersion } = useRulesStore.getState();
  const { setPartidas } = usePartidasStore.getState();
  const { correlateAll } = useItemsStore.getState();

  try {
    // 1. Fetch Takeoff Rules
    const { data: cloudRules, error: rulesErr } = await fetchTakeoffRulesFromSupabase(section);
    if (!rulesErr && cloudRules && cloudRules.length > 0) {
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

        return attachCatalogAreas(
          {
            ...r,
            trigger,
            subitems,
            detalle: r.detalle || getDefaultDetalleByRule(trigger, activeArea),
            tagPrefix: r.tagPrefix || getDefaultTagPrefixByRule(trigger)
          },
          section === 'canalizado' ? SEED_CANALIZADO_RULES : SEED_RULES
        );
      });

      setRules(
        section === 'canalizado' ? enrichedRules : enrichedRules.filter(r => r.id !== 'r-001-2b-x1'),
        section
      );
    }

    // 2. Fetch Detalle Variants
    const { data: cloudVariants, error: variantsErr } = await fetchDetalleVariantsFromSupabase();
    if (!variantsErr && cloudVariants) {
      updateDynamicVariants(cloudVariants);
      incrementVariantsVersion();
    }

    // 3. Curve catalog. Stored descriptions and lengths replace the code defaults for the same id.
    const { data: cloudCurves, error: curvesErr } = await fetchCurveCatalogFromSupabase();
    if (curvesErr) console.warn('[CloudSync] Catálogo de curvas:', curvesErr);
    else if (cloudCurves && cloudCurves.length > 0) mergeCurveCatalog(cloudCurves);
    else {
      const seeded = await syncCurveCatalogToSupabase(getCurveCatalog());
      if (!seeded.success) console.warn('[CloudSync] No pude cargar el catálogo de curvas:', seeded.error);
    }

    // 4. Fetch Master Partidas
    const { data: cloudPartidas, error: partidasErr } = await fetchPartidasFromSupabase();
    if (!partidasErr && cloudPartidas && cloudPartidas.length > 0) {
      setPartidas(cloudPartidas);
      correlateAll(cloudPartidas, activeArea, section);
    }
  } catch (err) {
    console.warn('[CloudSync] Fallback to local cache:', err);
  }
}

export async function executeSyncToDatabase(skipConfirm = false) {
  const { section, accessoryViewMode } = useAppStore.getState();
  const { items } = useItemsStore.getState();
  const { packages } = usePackagesStore.getState();
  const { showToast, setIsSyncing } = useUIStore.getState();

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

  if (!skipConfirm) {
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

    if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return;
    }
  }

  setIsSyncing(true);
  try {
    const result = await syncItemsToSupabase(itemsToSync, packages);
    if (result.success) {
      showToast(`¡${result.count} ítems (${modeLabel}) guardados en Supabase con éxito!`, 'success');
    } else {
      showToast(result.error || 'Error al guardar en el servidor', 'warn');
    }
  } finally {
    setIsSyncing(false);
  }
}

export async function executeSyncBductosToDatabase(skipConfirm = false) {
  const { rows } = useBductoStore.getState();
  const { showToast, setIsSyncing } = useUIStore.getState();

  if (rows.length === 0) {
    showToast('No hay filas de BDUCTOS para guardar', 'warn');
    return;
  }

  if (!skipConfirm && typeof window !== 'undefined') {
    const accepted = window.confirm(
      `Vas a depositar ${rows.length} filas en main_BDUCTOS_table y el catálogo de curvas en bducto_curve_catalog.\n\n` +
        `Cada guardado agrega las filas de nuevo. El catálogo se actualiza por id.\n\n` +
        `¿Deseas enviar los ${rows.length} ítems?`
    );
    if (!accepted) return;
  }

  setIsSyncing(true);
  try {
    const rowsResult = await syncBductosToSupabase(rows);
    const catalogResult = await syncCurveCatalogToSupabase(getCurveCatalog());
    if (rowsResult.success && catalogResult.success) {
      showToast(
        `${rowsResult.count} filas en main_BDUCTOS_table y ${catalogResult.count} curvas en el catálogo.`,
        'success'
      );
      return;
    }
    const detail = [rowsResult.error, catalogResult.error].filter(Boolean).join(' ');
    showToast(detail || 'Error al guardar BDUCTOS', 'warn');
  } finally {
    setIsSyncing(false);
  }
}
