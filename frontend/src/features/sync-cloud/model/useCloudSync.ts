import { getCurveCatalog, setCurveCatalog, setJointLossCatalog, setMaterialCatalog } from '../../../entities/bducto/model/catalog';
import {
  fetchDetalleVariantsFromSupabase,
  fetchPartidasFromSupabase,
  fetchCurveCatalogFromSupabase,
  fetchJointLossCatalogFromSupabase,
  fetchMaterialCatalogFromSupabase,
  syncItemsToSupabase,
  syncBductosToSupabase,
  syncCurveCatalogToSupabase
} from '../../../shared/api/supabase';
import { fetchUnifiedRules } from '../../../entities/takeoff-rule/api/ruleRepository';
import { useBductoStore } from '../../generate-bducto/model/useBductoStore';
import { updateDynamicVariants } from '../../../entities/takeoff-rule/model/detalleVariants';
import { ensureRuleCatalog } from './publishRuleCatalog';
import { attachCatalogAreas } from '../../../entities/takeoff-rule/model/areaCatalog';
import { saveStoredRules, saveStoredPartidas } from '../../../shared/lib/storage';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { usePartidasStore } from '../../manage-partidas/model/usePartidasStore';
import { useItemsStore } from '../../manage-items/model/useItemsStore';
import { usePackagesStore } from '../../manage-packages/model/usePackagesStore';
import { useAppStore } from '../../app-config/model/useAppStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { siteConfirm } from '../../../shared/ui/askSite';

export async function loadInitialCloudConfig() {
  const { section, activeArea } = useAppStore.getState();
  const { setRules, incrementVariantsVersion } = useRulesStore.getState();
  const { setPartidas } = usePartidasStore.getState();
  const { correlateAll } = useItemsStore.getState();

  let cloudRules: Awaited<ReturnType<typeof fetchUnifiedRules>> = [];
  try {
    await ensureRuleCatalog();

    // 1. Fetch Takeoff Rules — single dual-read path (repository owns the
    // new-tables-first + JSONB-fallback order; no second reader allowed).
    cloudRules = await fetchUnifiedRules(section);
    if (cloudRules && cloudRules.length > 0) {
      const enrichedRules = cloudRules.map(r => {
        const up = (r.trigger || '').toUpperCase().trim();
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

        return attachCatalogAreas({
          ...r,
          trigger,
          subitems,
          tagPrefix: trigger === 'SOLDADURA T 4/0' ? 'TT' : r.tagPrefix || 'M'
        });
      });

      const hydrated = enrichedRules;
      setRules(
        section === 'canalizado' ? hydrated : hydrated.filter(r => r.id !== 'r-001-2b-x1'),
        section
      );
    }

    // 2. Fetch Detalle Variants (pre-07 legacy table; post-07 gone — overrides hydrate the cache)
    try {
      const { data: cloudVariants, error: variantsErr } = await fetchDetalleVariantsFromSupabase();
      if (!variantsErr && cloudVariants) {
        updateDynamicVariants(cloudVariants);
        incrementVariantsVersion();
      }
    } catch {
      // table dropped by 07 — overrides below own the variant payload
    }
    // Post-07 path: hydrate the variant cache from rule_item_overrides so the
    // section cards render even when detalle_variants no longer exists.
    try {
      const { hydrateVariantFromOverrides } = await import('../../../entities/takeoff-rule/model/detalleVariants');
      for (const r of cloudRules || []) {
        if (r.overrides && r.overrides.length > 0) hydrateVariantFromOverrides(r.overrides as any);
      }
      incrementVariantsVersion();
    } catch { /* best-effort secondary source */ }

    // 3. Curve catalog. bducto_curve_catalog is the only source.
    const { data: cloudCurves, error: curvesErr } = await fetchCurveCatalogFromSupabase();
    if (curvesErr) console.warn('[CloudSync] Catálogo de curvas:', curvesErr);
    else setCurveCatalog(cloudCurves ?? []);

    // 3b. Joint loss catalog (Pérdida por embone)
    const { data: cloudJointLoss, error: jointLossErr } = await fetchJointLossCatalogFromSupabase();
    if (jointLossErr) console.warn('[CloudSync] Catálogo de pérdida por embone:', jointLossErr);
    else if (cloudJointLoss && cloudJointLoss.length > 0) setJointLossCatalog(cloudJointLoss);

    const { data: cloudMaterials, error: matErr } = await fetchMaterialCatalogFromSupabase();
    if (matErr) console.warn('[CloudSync] Catálogo de materiales:', matErr);
    else if (cloudMaterials && cloudMaterials.length > 0) setMaterialCatalog(cloudMaterials);

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
  const { section } = useAppStore.getState();
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

  const itemsToSync = items;

  if (!skipConfirm) {
    const confirmMessage =
      `Confirmar envío a base de datos\n\n` +
      `Vas a depositar ${itemsToSync.length} filas en Base de Datos.\n\n` +
      `Los accesorios base y jumpers se guardarán en líneas independientes.\n\n` +
      `¿Deseas proceder y enviar los ${itemsToSync.length} ítems a la base de datos?`;

    if (!(await siteConfirm(confirmMessage))) {
      return;
    }
  }

  setIsSyncing(true);
  try {
    const result = await syncItemsToSupabase(itemsToSync, packages);
    if (result.success) {
      showToast(`¡${result.count} ítems guardados en Base de Datos con éxito!`, 'success');
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

  if (!skipConfirm) {
    const accepted = await siteConfirm(
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
