# Phase 3 build plan: "depth"

Design source: `PRODUCT_DESIGN.md` sections I (Email Builder), E / F / L (Library,
Pack architecture, Pack discovery / purchase / install / update flows), and
section T items 7 and 8. This is the third epic, built on Phase 1 (Library,
Packs, lock system) and Phase 2 (the two flagship builders). Phase 1 made the
model visible; Phase 2 gave the builders their depth; Phase 3 finishes the two
deepest surfaces: the email builder's Dynamic Data browser, and the full Pack
lifecycle (update / diff, purchase-return, bundles, more Packs).

Phase 3 continues on the `phase-2` branch. `main` stays on the 1.0.0 WP.org
review build and is not touched. Each slice keeps every builder and screen
functional and ends build-green (`pnpm type-check` + `pnpm build`; for PHP,
`php -l` + phpstan level 6).

## What Phase 3 adds

No new form/workflow engine capability. Phase 3 is depth on content and
lifecycle:

1. **Email Dynamic Data browser** (item 7): the passive "Available tokens"
   cheat-sheet becomes a browsable, categorized data picker with live sample
   values, and clicking a source inserts its token at the cursor of the field
   being edited. Sources: Site data, Submission data, Form fields, and Order
   data (WooCommerce only). Preview already resolves tokens to sample values,
   so a design never renders blank.
2. **Pack lifecycle** (item 8): the update / diff flow (keep mine / take update
   / keep both, modified-item protection, changelog), purchase-return polish,
   a bundles presentation, and two more authored Packs.

## Scope honesty

- The Dynamic Data browser inserts the raw `{token}` at the cursor and relies
  on the existing preview pipeline to render the sample value. A full
  chip-in-text rich editor (tokens shown as removable chips inside the text) is
  a larger rewrite of the text elements and is out of scope for this slice; the
  browser + insert-at-cursor + live samples is the shippable core of item 7.
- The Pack update / diff flow operates on the provenance-tracked Library
  content (the patterns a Pack installs). Forms, emails and workflows a Pack
  creates are the user's own copies and are never diffed or overwritten, which
  matches the provenance model (only Library assets carry `source_*`).
- Bundles are presented, not sold: a bundle card lists its member packs and a
  combined price. Entitlement stays a store-side concern (the plugin sees packs
  as purchased), exactly as section R specifies.

## Slices

### Pillar E: Email builder (design section I)

#### Slice E1 - Dynamic Data catalog endpoint · DONE

- [x] `GET /emails/dynamic-data?form_id=` returns categorized sources
      (`site`, `submission`, `fields`, and `order` when Woo is active), each
      item carrying `token`, `label` and a resolved `sample`. Samples come from
      the same preview render context the editor already uses, so the picker and
      the preview never disagree. A `flexa_formflow.emails.dynamic_data` filter
      lets add-ons contribute categories.

#### Slice E2 - Dynamic Data browser + insert-at-cursor · DONE

- [x] `useDynamicData(formId)` backs a `DynamicDataBrowser` in the inspector
      that replaces the "Available tokens" cheat-sheet: categorized, searchable,
      each row shows the label and its live sample and inserts the token into the
      last-focused text field at the cursor. Text-bearing fields register their
      focus + selection so the insert lands in the right place.

### Pillar P: Pack lifecycle (design sections F, L)

#### Slice P1 - Pack update / diff / apply, backend · DONE

- [x] Library provenance gains `source_hash` (Schema DB_VERSION 6, dbDelta adds
      the column). `LibraryRepository` stores the hash on create, gains
      `update()` and `all_by_source_pack()`, and a `hash()` helper. `LibraryAsset`
      carries `source_hash`.
- [x] `PackManifest` gains a `changelog` (`list<{version, notes}>`).
      `Installer::diff()` compares a manifest's patterns against the installed
      Library copies by content id and classifies each: `new`, `update`
      (unmodified, defaults to take update), `conflict` (user-modified, defaults
      to keep mine), or `unchanged`. `Installer::update()` applies per-item
      decisions and re-stamps the install version.
- [x] `GET /library/packs/{id}/diff` and `POST /library/packs/{id}/update` on
      `LibraryEndpoint`; the detail response carries `changelog` and `purchased`.

#### Slice P2 - Update dialog, frontend · DONE

- [x] `usePackDiff` / `useUpdatePack` hooks; an `UpdatePackDialog` shows the diff
      summary ("N updates, M you've modified"), the changelog, and per-item
      Keep mine / Take update / Keep both with the protective defaults, then
      applies. The pack detail page shows an Update button when an update is
      available.

#### Slice P3 - Purchase-return polish · DONE

- [x] Returning from the store (`#/library/pack/{id}?purchased=1`) shows an
      "you own this pack" confirmation banner with an Install CTA, plus a
      "Purchased on our store? Refresh entitlements" action that refetches. The
      detail response exposes a filterable `purchased` flag.

#### Slice P4 - Bundles presentation · DONE

- [x] A `bundle` catalog type: bundles are registered through
      `flexa_formflow.library.bundles` and merged into the catalog. One authored
      "Business Starter" bundle groups the three Free packs with a combined price
      and a savings line. A `BundleCard` presents the member packs and pricing in
      the Library.

#### Slice P5 - Second and third Packs · DONE

- [x] Two more authored Packs alongside Catering, both Free-installable (Free
      capabilities only): a Lead Capture pack (Marketing) and an RSVP / Events
      pack. Registered in `Registry`, so the catalog, importer and bundle pick
      them up with no other change.

## Acceptance for the epic

- The email builder has a browsable Dynamic Data picker with live sample values
  that inserts tokens at the cursor; preview renders the samples.
- A Pack can be updated after a version bump: the diff screen protects modified
  items, defaults unmodified items to the update, shows the changelog, and
  applies per-item decisions without touching the user's forms / emails /
  workflows.
- Returning from a purchase reads as owning the pack, with an install path.
- The Library presents a bundle of packs with combined pricing.
- Three authored Packs ship, all installable on Free.
- `pnpm build` green; every screen stays functional; `main` stays on the
  untouched 1.0.0 review build throughout.
</content>
</invoke>
