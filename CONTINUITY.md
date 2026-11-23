# Session Continuity — PAT → REGLAS → NUEVO DETALLE (Supabase SSOT)

Date: 2026-11-23 (updated). Branch `main`. `tsc` + `npm run build` pass
after post-migration cleanup (Step 4, this session).

## Cleanup done this session (2026-11-23, post-migration)
- SQL migration `supabase_detalle_variants_ssot_migration.sql` **APPLIED in Supabase**
  (user-confirmed; per-(area, sub_area, category) count verification skipped by choice).
- Deleted no-op stub `syncRulesToDynamicVariants` from `useRulesStore.ts` (had zero callers).
- Deleted `frontend/src/entities/takeoff-rule/model/variantSeed.ts` (backfill snapshot,
  no longer needed now that Supabase holds the canonical 62 rows).
- Removed dead migration helpers from `ruleCatalog.ts`: `variantItems()`,
  `detalleVariantRows()`, `buildDetalleVariantRows()` (only consumers of the seed;
  `DetalleVariantRecord` type kept). Verified zero remaining references repo-wide;
  `tsc --noEmit` clean, `vite build` green.

## User decisions (binding)
1. Details/rules live in **Supabase only** — no hardcoded browser data. localStorage = offline cache.
2. 2/0 clones live **only inside** the 2/0 SECTION, never as outside cards.
3. **Split everything** by CORROSIVO vs NO_CORROSIVO (2/0, Barra, generic rules).

## Root causes fixed
- **Duplication**: display used exact trigger match, store mirror used substring `includes('2/0')`.
  Clone `CABLE DESNUDO 2/0 AWG - DET. X (COPIA)` failed exact → outside card, passed substring → inside row.
- **Delete-both**: business-key delete sweep + wipe-and-replace hydration + code-only card merge key.

## Key files
- `frontend/src/entities/takeoff-rule/model/ruleFamily.ts` (NEW) — single source of truth:
  `isCable20Family/isBarraPotFamily/isBarraInstFamily/isBarraFamily/isStandaloneRule`,
  `familyCategory`, `variantRowId` (canonical `AREA_SUBAREA_CAT_CODE`), `normalizeSubArea`.
- `.../model/detalleVariants.ts` — statics deleted; caches hydrate from Supabase only;
  Barra split per subarea (`DYNAMIC_BARRA_*_BY_SUBAREA` + `getBarraVariants`);
  `updateDynamicVariants` merges (never wipes); `normalizeVariantSubArea` helper.
- `.../model/variantSeed.ts` (NEW) — backfill snapshot only, never a runtime source.
- `.../model/seedRules.ts` — arrays emptied (deprecated stubs); helper fns kept.
- `.../model/ruleCatalog.ts` — `catalogRules()` returns empty (Supabase hydrates);
  `detalleVariantRows()/buildDetalleVariantRows()` = migration helper from `variantSeed`.
- `.../model/types.ts` — `TakeoffRule` += `subAreas?`, `originRuleId?`.
- `frontend/src/features/manage-rules/model/useRulesStore.ts` — substring mirror deleted;
  `saveRule` calls `stampFamilyRuleVariant` (scoped stamp + `rule_id` link);
  `deleteRule` removes rule + its scoped variants; `deleteDetalleVariant` id-only;
  `loadRules` Supabase-first + `loadStoredVariants/saveStoredVariants` cache.
- `frontend/src/shared/lib/storage.ts` — no seed fallbacks; += variant cache fns.
- `frontend/src/shared/api/supabase.ts` — save = upsert by id only (progressive
  missing-column retry, incl. `rule_id`); delete = by id only; += `rule_id` field.
- `frontend/src/entities/takeoff-rule/api/ruleRepository.ts` — persists/reads
  `allowed_subareas`, `origin_rule_id`; empty cache = `[]`.
- `frontend/src/widgets/rules-catalog/ui/RulesView.tsx` — `visibleCatalogRules` =
  `isStandaloneRule`; family sections render independently of it; clone handlers stamp
  `subAreas=[active]`; generic rules filtered by `subAreas`; Detalle-modal delete also
  drops overlay clone rules (`handleDeleteDetalleAndOverlays`); `RuleEditorModal` gets
  `activeSubArea`.
- `Cable20RuleCard.tsx` / `BarraRuleCard.tsx` — merge by rule identity, rule overlay wins
  display; `BarraRuleCard` takes `subArea`; row keys include rule id.
- `RuleEditorModal.tsx` — central predicates, subarea-aware Barra/2-0 pickers.
- `ruleParameterResolver.ts`, `GenericRuleCard.tsx`, `ruleInsertPreview.ts`,
  `ruleExpander.ts`, `instanceRebuild.ts`, `detalleRegistry.ts`, `useCloudSync.ts`,
  `publishRuleCatalog.ts` (no more hardcoded seeding), `rulesMasterTable.ts`
  (per-subarea rows, family predicates, import stamps `subAreas`).
- `supabase_detalle_variants_ssot_migration.sql` (NEW, repo root) — adds
  `sub_area`/`rule_id`/`allowed_subareas`/`origin_rule_id`, dedupes, backfills 62 rows.
  **NOT YET RUN — operator must apply it in Supabase.**

## Pending / next session
1. ~~Apply the SQL migration in Supabase; verify row counts per (area, sub_area, category).~~
   DONE 2026-11-23 — migration applied + verified live via REST (anon key):
   68 rows total (62 canonical backfill + 6 pre-existing user rows dated Nov 14–22,
   preserved by design — backfill never wipes).
   AREA SECA: 18 (all NO_CORROSIVO, CABLE_2_0). AREA HUMEDA: 50
   (NO_CORROSIVO 26 / CORROSIVO 24; CABLE_2_0 42, BARRA_POT 4, BARRA_INST 4).
   NOTE asymmetry in user rows: 009/07A + 009/07A_CM exist in both partitions,
   009/08B + 009/11_G exist only in NO_CORROSIVO (CORROSIVO side simply has no
   row — not an error, just independent partition history).
   Columns confirmed: `sub_area`, `rule_id`, `updated_at` present on variants;
   `allowed_subareas`, `origin_rule_id` present on takeoff_rules (all 17 rules
   NULL = generic HUMEDA rules show in both partitions, per defaulted open-Q).
   BACKFILL 2026-11-23: user asked to mirror partitions — inserted CORROSIVO
   copies of 009/08B (6 items) and 009/11_G (8 items), payload cloned verbatim
   from the NO_CORROSIVO rows. Totals now 70 (SECA 18, HUMEDA 26+26 mirrored).
2. UI verify: create 2/0 detalle → inside only; delete inside → gone, outside untouched;
   toggle Corrosivo/No-Corrosivo → independent lists; reload + offline reload.
3. ~~Optional: `syncRulesToDynamicVariants` is a no-op stub — delete it + `variantSeed.ts`
   after backfill is confirmed in prod.~~ DONE 2026-11-23 — full cleanup incl.
   `detalleVariantRows()/buildDetalleVariantRows()` in `ruleCatalog.ts`; `tsc`+build green.
4. ~~Open Q (defaulted): generic HUMEDA rules without `subAreas` show in both partitions;
   `subArea` default for imports without SUBAREA column = NO_CORROSIVO.~~
   SETTLED 2026-11-23 — both defaults confirmed implemented in code, not just intent:
   (a) `RulesView.tsx:147-151` — empty `subAreas` returns `true` for both partitions
   ("legacy rows without subAreas stay visible in both"); live data: all 17
   takeoff_rules have `allowed_subareas = NULL`, so all show in both. Verified by
   headless test (generic visible in CORROSIVO + NO_CORROSIVO; scoped generic
   hidden in the other partition).
   (b) `rulesMasterTable.ts:491-494` — imports without SUBAREA column fall back to
   `NO_CORROSIVO` for AREA HUMEDA (SECA pins NO_CORROSIVO by scheme).

## Headless verification done this session (2026-11-23)
- `tsc --noEmit` clean + `vite build` green (12.4s) on the post-cleanup tree.
- 27-check headless suite (throwaway `tsx` script, removed after run — tree has no
  scaffolding residue): clone trigger matches `isCable20Family`, is NOT anchor,
  is NOT standalone (no outside card); generic `(COPIA)` stays standalone/outside;
  Barra anchors + clones inside-only; scoped variant ids differ per partition and
  are canonical (`AREA HUMEDA_{SUB}_CABLE_2_0_009/08B`); `ruleVariantScopes` stamps
  exactly the clone's own partition / canonical-only for legacy / fans out for
  both; generic-without-subAreas visible in both partitions; imports default
  NO_CORROSIVO. ALL 27 PASSED.
- Live Supabase re-verify: 70 variant rows (SECA 18, HUMEDA 26+26), HUMEDA mirror
  symmetry 26/26 codes with 0 asymmetric — the 009/08B + 009/11_G CORROSIVO
  backfill closed the gap; 0 rules with `allowed_subareas` set.
- Browser-click steps (create/delete detalle, toggle, reload/offline) remain manual:
  http://localhost:3000 is up (200) — run the 4-item checklist from the prior message.
