# Phase 2 build plan: "Pro earns its price"

Design source: `PRODUCT_DESIGN.md` sections H (Form Builder), J (Workflow
Builder), D (Free vs Pro vs Packs), and section T items 5 and 6. This is the
second epic of the business model, built on Phase 1 (Library, Packs, lock
system). Phase 1 shipped the model as visible; Phase 2 gives the two flagship
builders the depth that makes Pro worth paying for.

Phase 2 lives on the `phase-2` branch, cut from `phase-1`. `main` stays on the
1.0.0 WP.org review build and is not touched until that review clears. Unlike
Phase 1, most of Phase 2 restyles surfaces that already ship (the form builder
and workflow builder), so there is nothing to hide behind `SHOW_UPCOMING`
(which stays `true` from Phase 1). The branch itself is the containment: it is
not merged to `main` until the epic is complete. Each slice keeps both builders
functional and ends build-green. Any sub-feature that has no data yet (the
workflow Logs tab) stays behind a runtime guard until it is wired to real data,
matching the Phase 1 discipline.

## New engine capability (the Phase 2 difference)

Phase 1 added no engine capability on purpose. Phase 2 adds exactly two, both
in the Free tier, both the base that Pro extends:

1. **A single workflow condition** that gates the action chain. Free gets one
   condition; Pro (a later add-on) extends the same node into branches.
2. **A single field show/hide condition** in the form builder. Free gets one
   rule per field; Pro extends the same tab into condition groups.

Keeping the Free capability to "exactly one" is the legibility contract from
section D: same place, more power, so the upgrade reads clearly.

## Slices

Each slice ends in a state that passes `pnpm type-check` and `pnpm build`, and
(for PHP slices) `php -l` plus phpstan level 6.

### Pillar A: Workflow builder (design section J)

#### Slice A1 - Workflow condition, backend · DONE

- [x] `Domain\Workflows\Workflow` + `WorkflowSanitizer`: extend the config
      shape to `{trigger, condition?, actions}`. Condition is
      `{field, operator, value}` with a whitelisted operator set
      (`equals`, `not_equals`, `contains`, `not_empty`, `is_empty`). A
      workflow with no condition behaves exactly as today. Unknown operators
      and malformed conditions are dropped by the sanitizer.
- [x] `Workflows\Engine::run`: evaluate the condition against the entry before
      the action chain. When it fails, skip the actions and record a single
      `condition` log line (`skipped`, "condition not met"); when it passes or
      is absent, run the chain as today and record a `condition` `ok` line so
      Test Run shows the outcome.
- [x] The condition rides inside `config`, so `Api\WorkflowsEndpoint` carries
      it through create / update / test with no route change. php -l + phpstan
      L6 clean.

#### Slice A2 - Workflow canvas redesign, frontend · DONE

- [x] Node cards read as plain-language sentences (`describeAction` builds the
      title from config: "Send email: ...", "Mark entry as read"). Config
      keeps opening in place for now.
- [x] Node palette grouped: Conditions, Actions, Timing & branching (Pro), and
      Recipes. The Condition node is a Free add, capped at one per workflow to
      match the engine (an amber `ConditionNode` with field / operator / value).
      Branch, Delay and Schedule appear as explorable Pro teasers (lock type 1)
      whose chip opens the compact `LockedExplainer`; extension connector nodes
      keep their Phase 1 addable + read-only treatment.
- [x] The Recipes group links into the Library, reusing the Phase 1 "Use this
      workflow" round-trip.
- [x] Kept Save, Run test, the enable switch and Save as recipe in the top bar.

#### Slice A3 - Test Run trail (Logs tab deferred) · PARTIAL

- [x] Test Run lights the canvas up node by node: `mapRun` realigns the flat
      run log onto the condition + action nodes, and each node shows its result
      (ok / skipped / error) inline via `NodeStatus`. The separate result box
      is replaced by an on-canvas trail plus a slim completion line.
- [ ] Logs tab: deferred. There is no queryable run store yet
      (`flexa_formflow.workflow.ran` fires but is not persisted at the workflow
      level). A run-log table + migration + endpoint is its own backend slice;
      per the containment rule the tab stays unbuilt rather than shipping a
      half-built surface. Revisit as a dedicated slice if it earns priority.

### Pillar B: Form builder (design section H)

#### Slice B1 - Insert panel categories + Pro advanced fields · DONE

- [x] Field types carry a `category` (Basic / Choice / Special); the palette
      groups under category headers via `PaletteSection`. A WooCommerce group
      appears only when Woo is active.
- [x] Advanced fields (Pro) render as explorable locked palette items
      (`ProPaletteItem`, lock type 1): the row opens the `LockedExplainer`
      rather than inserting a live field, matching the workflow Pro nodes so
      both builders teach the same lock language.

#### Slice B2 - Inspector tabs + Logic tab · DONE

- [x] Inspector is tabbed: Settings, Validation, Logic, Style (section H). The
      current controls moved into Settings / Validation / Style.
- [x] Logic tab: Free single show/hide rule on a field,
      `{action: show|hide, field, operator, value}`. A `ProLogicHint` teaser
      marks condition groups as Pro. `FieldTypes::sanitize_config` sanitizes
      the rule server-side (whitelisted operators); `FormField` carries the
      shape on the TS side. php -l + phpstan L6 clean.

#### Slice B3 - Field logic at render + Patterns insert category · PARTIAL

- [x] Server render (`templates/form.php`) emits each field's rule as a
      `data-ff-logic` JSON attribute; `assets/frontend/form.js` evaluates
      show/hide on input/change (plain JS, no build, multi-instance safe) and
      disables hidden-by-logic inputs so they never submit.
- [x] Patterns are a first-class insert category (`PatternsSection`): My
      Library form patterns list in the palette; inserting drops the fields in
      one action with regenerated ids and remapped intra-pattern logic. Pack
      patterns appear here once imported.
- [ ] Canvas multi-select "Save as pattern": deferred. Saving a whole form as a
      template already ships from the builder header; a canvas multi-select
      interaction (shift-select + floating action) is a larger UX change left
      as a follow-up.

## Acceptance for the epic

- A workflow can gate its actions on one condition; Test Run shows the
  condition outcome and each action node lights up; Pro timing and branch nodes
  are explorable-locked with the three-treatment lock system.
- The form builder is a three-panel builder with a categorized Insert panel
  (Patterns first-class), a tabbed Inspector including a Logic tab, and Pro
  advanced fields shown as explorable locked items.
- Field show/hide logic works on the live front-end form.
- `pnpm build` green; each slice keeps both builders functional; `main` stays
  on the untouched 1.0.0 review build throughout.
