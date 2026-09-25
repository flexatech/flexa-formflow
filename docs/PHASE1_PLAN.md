# Phase 1 build plan: "the model becomes visible"

Design source: `PRODUCT_DESIGN.md` section T (Phase 1) and sections C, D, E, G.
This is the first epic of the new business model (Free + Pro + Packs + Library)
layered on the already-shipped plugin (M1 through M7 in `IMPLEMENTATION_PLAN.md`).

The whole epic ships behind the existing `SHOW_UPCOMING` gate (now moved to
`apps/admin/src/lib/flags.ts`) until each surface is backed by real data, so a
release zip built while the flag is `false` never exposes a half-built screen.
This mirrors how Workflows and Integrations were staged before M5/M6.

## Slices

Each slice ends in a state that passes `pnpm type-check` and `pnpm build`.

### Slice 1 — Shell foundation (frontend only) · DONE

Design system primitives plus a navigable Library shell and the redesigned
Dashboard. No backend; the catalog is a local placeholder module.

- [x] `lib/flags.ts` — shared `SHOW_UPCOMING` flag (was inline in `main.tsx`).
- [x] `components/ui/badge.tsx` — the chip taxonomy (Free · Pro · price ·
      Installed · Purchased · Update · neutral), one variant each, no animation.
- [x] `components/custom/LockedExplainer.tsx` — dependency-free click popover:
      one-sentence benefit, what unlocks it, `Learn more` / `Upgrade` actions.
      This is lock type 1 (Pro capability) from PRODUCT_DESIGN.md section D.
- [x] `components/custom/AssetCard.tsx` + `PackCard.tsx` — Library cards,
      presentational; PackCard visually senior per section L.
- [x] `features/library/` — `LibraryPage` (Flexa Library / My Library tabs,
      type + ownership facets), `useLibrary` (reads the placeholder catalog),
      `catalog.ts` (clearly-marked placeholder data), `types.ts`.
- [x] `lib/router.ts` — `library` + `pack` (`#/library`, `#/library/pack/:id`)
      routes.
- [x] `main.tsx` — Library nav item (`upcoming: true`), wire the two routes.
- [x] `features/dashboard/DashboardPage.tsx` — redesign: welcome + four quick
      actions (incl. Browse Library), recent activity + system status split,
      Library spotlight row (gated with `SHOW_UPCOMING`).

To view Slice 1 in wp-admin, flip `SHOW_UPCOMING` to `true` in
`apps/admin/src/lib/flags.ts` and rebuild.

### Slice 2 — Library backend + My Library · DONE

- [x] `Database\Schema` DB v4: `flexa_formflow_library` table (id, uuid, type,
      name, kind, payload JSON, source_pack/content_id/version, timestamps).
      Provenance columns from the start; `tables_present()` probe + `drop()`
      updated; Eraser drops it via `Schema::drop()`.
- [x] `Domain\Library\{LibraryAsset, LibraryRepository}` — `from_row` /
      `to_array` / `find` / `all` / `find_by_source` (dedupe) / `create` (with
      source) / `delete` / `count`, type+kind whitelists.
- [x] `Library\Catalog` — free content + pack listings through the
      `flexa_formflow.library.catalog` filter (add-on seam, no code in Free).
- [x] `Api\LibraryEndpoint` — `GET /library/catalog`, `GET/POST /library/mine`,
      `DELETE /library/mine/{id}`; `manage_permission` on all; registered in
      `Api\Router`. php -l + phpstan L6 clean.

### Slice 3 — Library frontend, real · PARTIAL (3a done)

- [x] `useLibrary` reads the REST endpoints; placeholder catalog deleted.
      `usePacks` derives packs from the catalog (Dashboard + pack detail).
- [x] My Library tab: lists saved assets, remove action, toast.
- [ ] 3b: "Save to Library" action in the form builder, email editor, workflow
      builder (minimal: one action + a name dialog).
- [ ] Asset preview: open the read-only builder chrome for a template/recipe.
- [ ] Remove the `upcoming` gate on Library once import + save round-trips.

### Slice 4 — Pack v1 · TODO

- [ ] Pack manifest format + a `Domain\Packs\` reader; one authored Catering
      Pack whose workflows use only Free capabilities (sell before Pro nodes).
- [ ] Entitlement check: on Free, free-capable packs install; Pro-required
      content imports disabled with a "needs Pro" state. Rides the license
      service entitlement list (empty on Free).
- [ ] Pack detail page (section L), 3-step import flow (review → import →
      done), provenance stamping, shared-pattern dedupe on import.
- [ ] Imported workflows arrive disabled; nothing is written before Step 1
      confirm.

### Slice 5 — Locked states applied + nav restructure · TODO

- [ ] Apply the three lock types across Pro surfaces (crm_push node,
      connectors) using `LockedExplainer` + the badge taxonomy.
- [ ] Fold WooCommerce into an Emails tab (Form Emails / WooCommerce).
- [ ] Demote AI from a top-level nav item to in-builder entry points +
      Settings, per section C.

## Acceptance for the epic

- Library browsable, free content installable, My Library round-trips a saved
  pattern into a builder.
- One Catering Pack previews, imports transparently, stamps provenance,
  arrives with workflows disabled.
- Every lock point answers why/what/what-needed with one of exactly three
  treatments. No upgrade nag beyond the one permitted Dashboard row.
- `pnpm build` green; a release zip built with `SHOW_UPCOMING = false` shows
  none of the in-progress surfaces.
