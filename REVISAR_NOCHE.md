# REVISAR_NOCHE — resumen de sesión (2026-11-23)

> Commit único en `main` con todo lo pendiente de la sesión: cleanup post-migración,
> selector de sub-área en importación de metrado, y nueva sección de Reglas de Rechazo.
> `tsc --noEmit` limpio + `vite build` verde (1759 módulos, ~12.6 s).

## 1. Cleanup post-migración SSOT (ya aplicado en Supabase)

- Migración `supabase_detalle_variants_ssot_migration.sql` **APLICADA en Supabase**
  (confirmado por usuario): 70 filas variantes (SECA 18, HUMEDA 26+26 espejadas),
  columnas `sub_area` / `rule_id` / `updated_at` presentes; `allowed_subareas` /
  `origin_rule_id` presentes en `takeoff_rules` (17 reglas, todas NULL = visibles en ambas particiones).
- Código eliminado: stub `syncRulesToDynamicVariants` (`useRulesStore.ts`),
  `frontend/src/entities/takeoff-rule/model/variantSeed.ts`,
  `variantItems()` / `detalleVariantRows()` / `buildDetalleVariantRows()` (`ruleCatalog.ts`).
  Cero referencias restantes; `ruleFamily.ts` (`isCable20Family`, `isBarra*Family`,
  `familyCategory`, `variantRowId`, `normalizeSubArea`) es la única fuente de predicados.
- Borrado dual corregido: `deleteRule` borra regla + variantes propias por `id`;
  `saveDetalleVariantToSupabase` hace upsert **solo por id canónico**
  (`AREA_SUBAREA_CATEGORIA_CODIGO`); clon 2/0 vive **solo dentro** de su sección.
- Verificación headless (27 checks, script desechable, árbol sin residuos): TODO PASÓ.
- ⚠️ **PENDIENTE manual en navegador** (no se pudo hacer desde aquí): crear/eliminar
  detalle 2/0 dentro/fuera, toggle Corrosivo/No-Corrosivo, reload + reload offline
  en http://localhost:3000 (estaba 200). Ver matriz simétrica 26/26 y 0 filas huérfanas.

## 2. Importación de metrado respeta Corrosivo / No Corrosivo (NUEVO)

- Problema: `parseTakeoffCsv` ignoraba `subAreaHumeda`; todo caía en `NO_CORROSIVO`.
- `executeImportExcel` (`features/import-excel/model/useImportExcel.ts`) ahora lee
  `subAreaHumeda` del store y lo pasa como `activeSubArea` a `parseTakeoffCsv`.
- `csvParser.ts`: `activeSubArea` llega a `applyDetalleVariant` / `applyBarraPotDetalleVariant`
  (r1/r2, r8/r9) y se estampa en `it.subArea` cuando el área es HUMEDA.
- `AddPanel.tsx`: nuevo selector "Sub-área para importar (Área Húmeda)" 💧/🛡️ encima
  del botón Importar + indicador "Importando como: …". Escribe en el mismo store global.
- DETALLE explícito en el Excel sigue mandando; el selector gobierna la partición de
  variantes y los defaults por área. AREA SECA queda siempre en `NO_CORROSIVO`.
- ⚠️ **PENDIENTE manual**: importar el mismo archivo con cada sub-área y comparar
  líneas 2/0 y Barra (requiere ambas particiones pobladas en Supabase).

## 3. Sección Reglas de Rechazo — reutilizable y editable (NUEVO)

- Dónde: avatar usuario (arriba-derecha) → **Reglas de Rechazo**. Filtro por importación
  (Metrado PAT / Bductos / Reglas Maestro / Partidas) + búsqueda.
- 20 reglas (`features/rejection-rules/model/rejectionRules.ts`), todas con:
  **on/off + mensaje editable** (MOTIVO_RECHAZO, con `{tag} {plano} {rule} {detalle} {origen} {prefixes}`)
  **+ parámetros** (regex de plano, lista de prefijos TAG, auto-1 por familia, mín. bductos, etc.).
- Store `useRejectionRulesStore.ts`: Supabase-primero, localStorage solo caché,
  merge sobre defaults (reglas nuevas aparecen solas), seed best-effort en primera carga.
- Los 4 parsers ya NO tienen strings hardcodeados: `csvParser.ts` (7 reglas metrado:
  plano requerido/forma, prefijo TAG configurable por lista, longitud, regla existe,
  detalle conocido, colisión TAG), `expandBducto.ts` (5: columnas, longitud mín.
  configurable, forma plano/tag, archivo vacío), `rulesMasterTable.ts` (5),
  `partidasExcel.ts` (3, vía throw con mensaje configurado).
- Apagar una regla = la fila pasa (o se salta silenciosamente si no hay con qué expandirla).
- Archivos: `features/rejection-rules/{model,rejectionRules.ts + useRejectionRulesStore.ts, ui/RejectionRulesModal.tsx}`,
  migración `supabase_rejection_rules_migration.sql` en raíz.
- ⚠️ **ACCIÓN REQUERIDA**: ejecutar `supabase_rejection_rules_migration.sql` **UNA VEZ**
  en el editor SQL de Supabase (crea tabla `rejection_rules` + RLS). Sin esto la sección
  funciona igual (defaults locales) pero no comparte entre máquinas.

## 4. Archivos tocados (este commit)

- Modificados (~31): App.tsx (monta modal + precarga), csvParser.ts, partidasExcel.ts,
  expandBducto.ts, rulesMasterTable.ts, useImportExcel.ts, AddPanel.tsx,
  useRejectionRulesStore (nuevo), UserProfileButton.tsx (entradas menú),
  ruleFamily.ts (nuevo), ruleCatalog/seedRules/detalleVariants/useRulesStore/RuleEditorModal/
  RulesView/Cable20RuleCard/BarraRuleCard/GenericRuleCard (cleanup SSOT), storage.ts,
  supabase.ts, ruleCalculator, ruleParameterResolver, ruleExpander, ruleInsertPreview,
  instanceRebuild, areaCatalog, detalleRegistry, ruleRepository, publishRuleCatalog,
  useCloudSync, package-lock.json.
- Nuevos: `CONTINUITY.md`, `supabase_detalle_variants_ssot_migration.sql`,
  `supabase_rejection_rules_migration.sql`, `frontend/src/features/rejection-rules/`,
  `frontend/src/entities/takeoff-rule/model/ruleFamily.ts`, este archivo.
- `frontend/dist/` ignorado (no se commitea).

## 5. Checklist para mañana

1. [ ] Correr `supabase_rejection_rules_migration.sql` en Supabase.
2. [ ] Verificar en Reglas de Rechazo que cargan las 20 reglas y Guardar persiste (recargar).
3. [ ] Importar metrado de prueba en CORROSIVO y en NO_CORROSIVO; comparar variantes.
4. [ ] Checklist navegador pendiente del §1 (crear/eliminar detalle, toggle, offline).
5. [ ] Probar apagar una regla (p. ej. `metrado.plano_shape`) e importar fila mala: debe pasar.
6. [ ] Revisar que `git status` quede limpio tras este commit.
