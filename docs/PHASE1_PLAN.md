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
- [x] 3b: "Save to Library" action in the form builder, email editor, workflow
      builder. Shared `SaveToLibraryButton` (button + name dialog) in
      `features/library/SaveToLibrary.tsx`; form/email save as `template`,
      workflow as `recipe`; each builder passes its live document via
      `getPayload`. Gated behind `SHOW_UPCOMING` in every builder header.
- [ ] Asset preview + reuse: open the read-only builder chrome for a
      template/recipe and insert a saved pattern into a builder. This is the
      one Phase 1 thread still open (the save half of the round-trip ships; the
      reuse half does not yet).
- [x] Remove the `upcoming` gate on Library: flipped `SHOW_UPCOMING` to `true`
      at the Slice 5 closeout, once import + save round-trips landed. The flag
      stays as a single kill-switch rather than being deleted.

### Slice 4 — Pack v1 · DONE

- [x] Pack manifest format (`Domain\Packs\{PackManifest, PackContent}`) + a
      reader (`Packs\Registry`, filter seam `flexa_formflow.packs`); one authored
      Catering Pack (`Packs\CateringPack`: 1 form, 1 email, 1 workflow, 1 shared
      pattern) whose workflow uses only Free capabilities (send email, set
      status).
- [x] Entitlement check (`Packs\Entitlement`): the gate is the Pro *capability*
      (filter `flexa_formflow.pro.is_licensed`, default false), not the store
      purchase, so a free-capable pack installs on Free. Pro-only content is
      skipped and reported. Install state tracked in `Packs\InstallState`
      (option `flexa_formflow_installed_packs`).
- [x] Pack detail page (real named contents via `GET /library/packs/{id}`),
      3-step import flow (`ImportPackDialog`: review → import → done),
      provenance stamping + shared-pattern dedupe by content id
      (`LibraryRepository::find_by_content_id`) in `Packs\Installer`.
- [x] Imported workflows arrive inactive (the repository forces it) with
      form/template refs resolved to the new ids; nothing is written before the
      review step's confirm (`POST /library/packs/{id}/import`).

### Slice 5 — Locked states applied + nav restructure · DONE

- [x] Apply the three lock types across Pro surfaces using `LockedExplainer` +
      the badge taxonomy. The workflow palette's Pro nodes (crm_push and
      successors) now carry a neutral `Badge variant="pro"` whose click opens
      the compact explainer (why/what/upgrade), and the node stays addable and
      explorable (read-only config + `LockedNote`). The Integrations page gives
      locked hosted connectors the same Pro chip + explainer in place of the
      Connect button. Upgrade links go through one shared `lib/links.ts` URL.
- [x] Fold WooCommerce into an Emails tab. New `EmailsPage` owns the title and
      a Form Emails / WooCommerce tab strip; the WooCommerce tab appears only
      when Woo is active. `TemplatesListPage` and `WooCommercePage` became tab
      bodies (`FormEmailsTab` / `WooEmailsTab`). Routes: `#/emails` and
      `#/emails/woocommerce`, with `#/woocommerce` kept for back-compat. The
      top-level WooCommerce nav item is gone.
- [x] Demote AI from a top-level nav item to in-builder entry points. The AI
      page and route are removed; form generation is a "Generate with AI"
      dialog on the Forms list (`AiFormDialog`) and copy polish is a "Writing
      assistant" dialog in the email editor (`AiWritingDialog`). Provider and
      key config already lived in Settings. Both entry points point to Settings
      when no API key is configured.

### Slice 5 closeout

- [x] Deleted the dead `features/placeholders/pages.tsx` (unreferenced
      coming-soon stubs) so nothing half-built can surface.
- [x] Flipped `SHOW_UPCOMING` to `true`: the Library, its Dashboard spotlight
      and quick action, and the Save-to-Library actions are all backed by real
      data now. `pnpm type-check` and `pnpm build` clean.

## Acceptance for the epic

- Library browsable, free content installable, My Library round-trips a saved
  pattern into a builder.
- One Catering Pack previews, imports transparently, stamps provenance,
  arrives with workflows disabled.
- Every lock point answers why/what/what-needed with one of exactly three
  treatments. No upgrade nag beyond the one permitted Dashboard row.
- `pnpm build` green; a release zip built with `SHOW_UPCOMING = false` shows
  none of the in-progress surfaces.
