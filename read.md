# read.md — handoff (2026-11-24)

## Where we are
- Branch `main`, 2 commits ahead of `origin/main`, then pushed.
- Tree was clean at push time (`git status` empty).

## Last session — what happened
1. User asked "what is still pending?" → answered from `CONTINUITY.md` /
   `REVISAR_NOCHE.md` + uncommitted work (10 files, remodel cutover).
2. User said rules don't load + "commit those uncommitted files; I already ran
   the rejection_rules migration."
3. Diagnosis: uncommitted code had flipped `ruleRepository.ts` to
   normalized-only reads (`REMODEL_SOURCE='new'`). Any DB without the remodel
   backfill (`rule_items` empty) returns rules with empty `subitems` → catalog
   renders "Sin reglas para esta área". Also the repo's hard-coded Supabase anon
   key is dead (`Invalid API key` from REST) — the app needs valid
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY` baked at build time.
4. Fix committed in `0033c92`: readers tolerate dropped legacy tables
   (`detalle_variants`, `cable_tray_matrix` post-07), and `fetchUnifiedRules`
   always falls back to the `takeoff_rules.subitems` JSONB mirror when
   `rule_items` is empty. `tsc + vite build` green.
5. Supabase in-app health test passed (connected, readable+writable on
   `takeoff_rules`, `rule_item_overrides`, `main_PAT_table`). Noted: that test
   does NOT probe `rule_items`, `rule_parameter_options`, `detalle_catalog`,
   `rejection_rules` — green ≠ those tables exist.
6. User then hit "Minified React error #310" opening Reglas de Rechazo.
   Cause: `RejectionRulesModal.tsx` had `useMemo(filtered)` AFTER
   `if (!showModal) return null` → hook-count mismatch on open → full-tree
   crash. Fixed by moving the `useMemo` before the early return; swept ~15
   other modals, all clean. Committed in `38ae7e6`, build green.
7. Pushed everything to GitHub; wrote this file.

## Commits pushed
- `0033c92` fix: cutover readers tolerate missing legacy tables; rule loader
  always falls back to JSONB subitems so catalog never renders empty pre-backfill
- `38ae7e6` fix: RejectionRulesModal hooks order — useMemo before early return
  (React error #310 crash on open)

## Still pending / verify next
- [ ] Open Reglas de Rechazo modal → 20 rules list, edit + save persists.
- [ ] Rules catalog shows rows for active section (`pat` vs `canalizado`).
- [ ] If `rule_items` etc. are empty in Supabase, run remodel migrations in order:
  `frontend/src/sql/migration_remodel_01_ddl` → `02` → `03` (catalog FREEZE
  window) → `04`. NEVER run `07_cleanup_STAGED_DO_NOT_RUN_YET` yet.
- [ ] Browser checklist from `REVISAR_NOCHE.md` §5 (import per sub-area,
  create/delete 2/0 detalle, offline reload, disable-one-rule test).
- [ ] Keep `VITE_SUPABASE_*` valid in every deployment; fallback key in repo is dead.
