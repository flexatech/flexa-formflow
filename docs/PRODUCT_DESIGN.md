# Flexa FormFlow: Product Design Proposal

Status: proposal, 2026-09-25. Companion to `ARCHITECTURE.md` (what exists today).
This document designs the product experience around the new business model:

```
FREE CORE  +  PRO ENGINE  +  PAID SOLUTION PACKS  +  FLEXA LIBRARY
```

Guiding principle, repeated throughout the UX:

> **Pro gives you power. Packs give you solutions.**
> The engine lets you build. The Library gives you things to build with.

This is not a greenfield design. Every proposal below is checked against the
code that already ships: the declarative extension registry, the control
vocabulary, the `locked` descriptor pattern, the hosted license service with
products, tiers and terms, and the existing Form / Email / Workflow builders.
Where a proposal needs a new platform capability, it is called out explicitly
in the "platform note" boxes so the engineering cost is visible.

---

## A. Product architecture

Four layers, each with a distinct job and a distinct revenue role:

```
FLEXA FORMFLOW
│
├── 1. FREE CORE            the platform: builders, entries, rendering,
│                           delivery, seams. Useful alone. Acquisition.
│
├── 2. PRO                  capability unlocks inside the builders:
│                           advanced logic, advanced nodes, advanced
│                           fields, scheduling. Recurring revenue.
│
├── 3. FLEXA LIBRARY        the content layer, browsable inside the
│                           plugin: Templates, Patterns, Workflow
│                           Recipes, Industry Packs. Free and paid.
│
└── 4. PACKS                paid content products sold through the
                            Library: a complete business solution
                            assembled from reusable Library assets.
                            Expansion revenue, repeatable SKUs.
```

How each layer maps onto what already exists:

| Layer | Delivery mechanism | Already built |
|---|---|---|
| Free Core | the `flexa-formflow` plugin | Yes: builders, entries, Woo takeover, workflow engine, seams |
| Pro | the `flexa-formflow-pro` plugin, hooking the 22 `flexa_formflow.*` seams | Yes: boot model, license service, `locked` demo pattern, first Pro node |
| Library | a Library screen in Free Core reading a remote catalog, plus a local "My Library" of saved assets | Partially: template concepts exist; no unified Library surface yet |
| Packs | signed content bundles (data, not code) installed through the Library; entitlements checked against the same license service | No: new content-bundle format and import pipeline needed |

Two architectural rules that keep this maintainable:

1. **Packs are content, never code.** A Pack is a versioned bundle of form
   definitions, email trees, workflow graphs and patterns. It installs
   through an import pipeline in Free Core. It is never a WordPress plugin.
   This keeps support burden flat: one import pipeline to maintain instead
   of N plugins to keep compatible.
2. **Capability lives in Pro, content lives in Packs, and the boundary is
   testable.** A feature belongs in Pro if it changes what the builder can
   do (a new node type, a new field type, a new condition operator). It
   belongs in a Pack if it is an arrangement of existing capabilities (a
   pre-built form, email, workflow). If a Pack would need a capability the
   engine lacks, the capability ships in Pro first and the Pack depends on
   it.

Platform note: the license service already models products, tiers and terms.
Pack ownership rides on the same service as additional entitlements attached
to a customer account or license key. No second commerce system.

---

## B. Information architecture: the object model

The UX is built on eight user-facing object types. Users should be able to
recite this model after a week of use.

**Working objects** (things you build and run):

| Object | What it is | Lives under |
|---|---|---|
| Form | a published form with fields, validation, settings | Forms |
| Entry | one submission of a form, with activity trail | Entries |
| Email | a designed email template (form emails and WooCommerce emails) | Emails |
| Workflow | an automation: trigger, conditions, actions | Workflows |
| Connection | a saved credential for an external service, connected once, referenced everywhere | Integrations |

**Library objects** (reusable content):

| Object | What it is | Granularity |
|---|---|---|
| Pattern | a reusable building block: a field group ("Event Details"), an email section ("Order summary block") | smallest |
| Template | a complete ready-made form or email | medium |
| Workflow Recipe | a complete ready-made automation | medium |
| Pack | a business solution: forms + emails + recipes + patterns curated for one industry | largest |

The containment story, taught visually in the Library and in onboarding:

```
Patterns  →  compose into  →  Templates and Recipes  →  curated into  →  Packs
```

A Pack is explicitly presented as "made of the same patterns, templates and
recipes you can see individually in the Library", which both justifies the
price (curation + completeness) and reinforces reuse.

---

## C. Navigation structure

Top-level admin navigation, seven items plus settings:

```
FormFlow
├── Dashboard
├── Forms
├── Entries
├── Emails            (tabs: Form Emails · WooCommerce, second tab only when Woo is active)
├── Workflows
├── Library           (the strategic surface: My Library + Flexa Library)
├── Integrations
└── Settings
```

Deliberate decisions, with reasons:

- **AI is not a menu item.** AI assistance is a verb inside the builders
  (generate a form, improve this copy), not a destination. A top-level "AI"
  page would be a settings page pretending to be a feature. Provider and key
  configuration stays in Settings; the AI entry points live on the Form
  builder ("Generate with AI"), the Email builder (writing assistant), and
  later the Workflow builder (recipe generation).
- **WooCommerce is a tab, not a menu item.** Woo email takeover is an email
  concern; users think "I want to change my order emails", not "I want to
  open the WooCommerce module". The tab appears only when WooCommerce is
  active, so non-Woo sites never see it.
- **Library is one item covering both directions of reuse**: content you
  saved (My Library) and content you can get (Flexa Library). Splitting
  them into two menu items would hide the connection between saving a
  pattern and reusing it.
- **Entries stays top-level.** For the day-to-day operator (the catering
  business owner), Entries is the most visited screen. Burying it under
  Forms would optimize for the builder persona at the operator's expense.
- **Growth rule:** new features must land inside these eight items. A ninth
  top-level item requires removing or merging one. This is the guard rail
  against the "huge plugin" feel.

---

## D. Free vs Pro vs Packs: the UX strategy

The user must always be able to answer three questions at any lock point:
why is this locked, what do I get, and what do I need. The system uses
exactly three lock types, each with a fixed visual treatment, and never
mixes them.

### The three lock types

**1. Pro capability lock** (power). Appears inline where the capability
would be used: a node type in the workflow palette, a field type in the
form palette, an operator in the condition editor. Treatment:

- The item is visible, explorable and clearly rendered (the existing
  `locked` + `lockedNote` descriptor pattern), never hidden.
- A small neutral "Pro" chip, one accent color, no gradient, no lock icon
  spam.
- Clicking opens a compact explainer: one sentence of benefit, what plan
  includes it, `[Learn more]` `[Upgrade to Pro]`. No modal takeover.

**2. Paid Pack lock** (solutions). Appears only in the Library and on
Pack-provided content. Treatment: a price, a `[Preview]` action, a
`[Get Pack]` action. Packs are merchandised like products, never like
missing features. A Pack card must never say "Upgrade".

**3. Dependency chip** (requirements). A Pack or recipe that needs Pro (or
WooCommerce) shows a quiet requirement line: "Requires: FormFlow Pro". It
links to the Pro page. This is information, not a sales pitch: the primary
action on the card remains Preview.

### The Free line

Free must remain a real product a user can run a business on, both for
WP.org compliance (guideline 5: no disabled features shipped in Free) and
for acquisition. Proposed split of current and planned functionality:

| Area | Free | Pro |
|---|---|---|
| Form fields | all basic fields, validation, layout | repeater, signature, advanced file upload, calculated fields |
| Form logic | show/hide on single condition (the existing `showIf` single-equals model) | multi-condition groups, and/or logic, cross-field rules |
| Email builder | full builder, tokens, global styles, test send | dynamic sections (conditional blocks per recipient/order data) |
| WooCommerce | email takeover, order tokens, template assignment | per-product / per-category conditional email content |
| Workflows | linear workflows: trigger, single condition, send email, webhook, set status, add note (all current engine actions) | branching, delays and scheduled actions, multi-step sequences, advanced actions (CRM push and future connector nodes) |
| Integrations | webhook, delivery basics | hosted connectors (Mailchimp, HubSpot, and successors) |
| AI | generate a first form draft (site's own API key) | AI email copy sequences, AI workflow generation, AI on Woo emails |
| Library | browse everything, install free templates/patterns/recipes, save to My Library | (Pro is a requirement of some content, never a Library paywall) |

Notes on this split:

- Keeping basic AI in Free is deliberate: it uses the site owner's own API
  key (zero marginal cost to us) and it is a strong first-run wow moment.
  The Pro AI tier is about depth (sequences, workflows), not access.
- Workflow **branching and delays** are the flagship Pro capabilities. They
  are also exactly what Pack recipes need to be impressive, which makes
  "Requires FormFlow Pro" on the best Packs feel natural rather than
  punitive.
- WP.org compliance: the Free plugin ships zero locked code. Locked entries
  in palettes are descriptors injected by the Pro plugin (existing pattern)
  or catalog listings fetched from the Library service. Free without Pro
  simply shows fewer palette items plus the Library catalog.

### The anti-nag budget

Hard limits, enforced as design-system rules:

- At most one promotional surface per screen (the Dashboard gets a Library
  spotlight; builders get zero banners).
- No admin notices for upselling, ever.
- "Pro" chips appear on palette items only, never on the canvas, never on
  saved user content.
- A dismissed explainer stays dismissed.

---

## E. Library architecture

The Library is one screen with two sources, presented as tabs:

```
Library
├── Flexa Library        the catalog: discover and install
│   ├── filter: All · Templates · Patterns · Workflows · Packs
│   ├── facet:  Free · Pro · Purchased · Installed
│   ├── facet:  For: Forms · Emails · Workflows · WooCommerce
│   └── search + category browse (industries, use cases)
│
└── My Library           the user's own reusable assets
    ├── Saved patterns (from any builder: "Save as pattern")
    ├── Saved templates (forms and emails saved as templates)
    ├── Saved recipes (workflows saved as recipes)
    └── Installed pack content, grouped by pack, with update state
```

Design intents:

- **It reads as a resource shelf, not a store.** Default sort mixes free
  and paid; free content is genuinely good; the visual language is a
  design-tool template gallery (large previews, real screenshots of
  rendered forms/emails, workflow graph thumbnails), not a pricing page.
- **Ownership states are quiet metadata**, shown as a small corner chip on
  cards: `Free`, `Pro`, price (for paid Packs), `Installed`, `Purchased`,
  `Update available`. One chip per card maximum; Installed wins over
  everything else.
- **Everything is previewable**, including content the user cannot install
  yet. Preview opens the item read-only inside the real builder chrome
  (the existing locked-demo rendering path), so the preview is honest: what
  you see is exactly what you would customize.
- **My Library is the reuse engine.** Every builder gets a "Save to
  Library" action on any selection; every builder's insert panel gets a
  Patterns tab fed from My Library plus installed pack patterns. This is
  what makes content feel reusable instead of isolated (section K).

Platform note: the catalog is a remote JSON feed from the Flexa store with
local caching; previews ship as data in the feed (form/email/workflow trees)
so preview works without installing. Entitlement checks (Purchased) reuse
the license client. My Library is local data, no account needed.

---

## F. Pack architecture

### What a Pack is

A Pack is a versioned content bundle with a manifest:

- Identity: id, name, version, industry/category, changelog.
- Requirements: minimum Free version, whether Pro is required (and which
  capabilities it actually uses, listed honestly), whether WooCommerce is
  required.
- Contents: lists of forms, email templates, workflow recipes and patterns,
  each with a stable content id, a display name and a preview.
- Reuse: pack assets reference shared patterns by stable id. "Customer
  Information" has one canonical id across the Catering, Events and
  Hospitality packs.

### Reuse and deduplication

When a Pack is imported and one of its patterns is already installed (from
another Pack or from the catalog), the importer links to the existing
pattern instead of duplicating it, unless versions differ, in which case
the user chooses (see import flow, section L). This is what makes the
"Packs are made of reusable assets" story true in the data, not just in
marketing copy.

### Provenance and safe updates

Imported content becomes the user's own (they will rename, edit, break and
rebuild it), so:

- Every imported asset is stamped with its source pack id, content id and
  version (provenance metadata, invisible in daily use).
- A Pack update never touches user content silently. The update screen
  shows a diff summary: "4 items have updates. 1 of them you have modified."
  Per item: `Keep mine` / `Take update` / `Keep both` (imports the update as
  a copy). Unmodified items default to Take update; modified items default
  to Keep mine.
- Uninstalling a Pack removes nothing by default; it offers "remove
  unmodified pack content" as an explicit checkbox list.

### Commercial model

- A Pack is an entitlement on the existing license service (a product SKU).
  Purchasing attaches the entitlement to the customer's account/key; the
  plugin's daily license check also refreshes entitlements.
- Packs work on Free where their content only uses Free capabilities. Packs
  whose recipes need branching/delays declare `Requires: FormFlow Pro`.
  Best practice for pack design: forms and emails should work on Free, the
  advanced workflow recipes carry the Pro requirement. The user gets real
  value immediately and a concrete reason to upgrade.

---

## G. Dashboard

Purpose: teach the ecosystem in ten seconds, then get out of the way.

Layout (single scrolling page, card grid, generous whitespace):

```
┌──────────────────────────────────────────────────────────────┐
│  Good morning. Here's FormFlow.                              │
│  [Create Form]  [Create Email]  [Create Workflow]  [Library] │
├───────────────────────────┬──────────────────────────────────┤
│  Recent activity          │  Entries this week (sparkline)   │
│  · last entries           │  Delivery health: OK             │
│  · last workflow runs     │  Connections: 2 active           │
│  · recently edited items  │  (issues surface here, quietly)  │
├───────────────────────────┴──────────────────────────────────┤
│  From the Library                                            │
│  one curated row: a spotlight Pack + 3 templates/recipes,    │
│  personalized later (Woo active → Woo content first)         │
└──────────────────────────────────────────────────────────────┘
```

Rules:

- The four quick actions mirror the four things the product does. "Browse
  Library" sits beside Create actions with equal weight: building and
  reusing are peers.
- The Library row is the one permitted promotional surface (section D). It
  is curation ("Recommended for you"), not a sale banner, and free content
  appears in it regularly.
- System status (delivery, integrations, license state when Pro is active)
  is a quiet line, expanding only when something needs attention. The
  existing license grace/warning states surface here as a single amber
  line, not a page-wide banner.
- First-run state of the Dashboard is the onboarding surface (section P).

---

## H. Form Builder redesign

Three-panel builder, shared skeleton with the Email builder so learning
transfers:

```
┌ Top bar ─────────────────────────────────────────────────────┐
│ ‹ Back · Form name · Saved state │ Undo Redo │ Preview ▾     │
│ (desktop/mobile) · [Save] · [Publish]                        │
├───────────┬─────────────────────────────┬────────────────────┤
│ INSERT    │           CANVAS            │  INSPECTOR         │
│           │                             │                    │
│ Fields    │  live form preview,         │  selected field:   │
│ · Basic   │  drag targets, inline       │  · Settings        │
│ · Advanced│  labels editing             │  · Validation      │
│ · Woo     │                             │  · Logic           │
│ Layout    │                             │  · Style           │
│ Patterns  │                             │  (nothing selected:│
│           │                             │   form settings)   │
└───────────┴─────────────────────────────┴────────────────────┘
```

Key decisions:

- **Patterns are a first-class insert category**, at the same level as
  Fields, showing My Library patterns and installed pack patterns with
  thumbnails. Inserting "Event Details" drops five configured fields in one
  action. Any multi-select on the canvas offers "Save as pattern".
- **Advanced fields (Pro) appear in the palette as explorable locked items**
  with the Pro chip (lock type 1). Dragging one opens the explainer instead
  of inserting.
- **Logic tab on every field**, not a separate screen: Free shows the single
  show/hide condition; Pro extends the same tab with condition groups. Same
  place, more power: the upgrade is legible.
- **AI entry point**: an empty canvas offers "Describe your form" alongside
  "Start from a template" (which deep-links into the Library filtered to
  form templates). AI and Library are presented as two answers to the same
  blank-canvas problem.
- Top bar Preview includes viewport toggle and a "view as filled" sample-data
  mode so users can see validation and logic behave.

---

## I. Email Builder redesign

Same skeleton, email-specific content:

- Insert panel categories: Basic, Typography, Layout, Media, WooCommerce
  (only when active), **Dynamic Data**, Patterns.
- **Dynamic Data is a browsable category, not a token cheat-sheet.** It
  lists real sources with live sample values: Form fields (from the linked
  form), Entry data, Order data (Woo), Site data. Inserting a token drops a
  styled token chip into the text; chips render sample values in preview.
  Non-technical users never see raw `{{token}}` syntax unless they open the
  chip.
- Canvas renders with the global email styles (existing settings: brand
  color, fonts, container width); the inspector's Style tab edits per
  element, with a visible "edit global styles" escape hatch.
- Top bar: template name, desktop/mobile toggle, Undo/Redo, `Test send`,
  `Save`. Test send remembers the last address and reports delivery result
  inline (reusing the existing test-send endpoint).
- WooCommerce mode: the same builder opened from the WooCommerce tab, with
  order tokens and a "which email is this" assignment control in the
  inspector's empty state. One builder, two contexts, zero duplicated UI.
- Patterns work exactly as in the Form builder: save any section, reuse
  anywhere, pack email patterns appear here.

---

## J. Workflow Builder redesign

The workflow canvas is the product's long-term differentiator and the
place Pro sells itself. Design it for business users first.

### Canvas model

Vertical node graph, top to bottom (reads like a checklist, not a free-form
node soup):

```
◉ Trigger: New entry on "Catering Quote Request"
│
◇ Condition: Budget over $5,000?
├── Yes ──────────────┐
│   ▷ Notify sales team
│   ▷ Send "Premium confirmation"
└── No ───────────────┐
    ▷ Send "Standard confirmation"
│
◷ Wait 2 days                     (Pro)
│
◇ Condition: Still status "New"?  (Pro branch)
    ▷ Send follow-up
```

- **Node cards** are plain-language sentences ("Send email: Quote Ready to
  the customer"), with the node's icon and status. Configuration opens in
  the right inspector, same as the other builders. No inline mini-forms on
  the canvas.
- **Free canvas is linear**: trigger, one condition, actions in sequence
  (matches the current engine). The palette shows Branch, Delay and
  Schedule as explorable Pro nodes (lock type 1). The upgrade story is
  visible on every workflow.
- Node palette groups: Triggers, Conditions, Actions, Timing (Pro), and
  connector actions contributed through the existing
  `workflows.action_types` seam (Pro/add-ons), plus **Recipes**.
- **Test Run** is a first-class top-bar action: pick a sample entry (or
  auto-generate one), run, and watch the canvas light up node by node with
  a per-node result trail. Runs land in a Logs tab (feeding from the
  existing `workflow.ran` activity recording).
- Each workflow has an explicit Enabled/Disabled switch, duplicate action,
  and "Save as recipe".

### Workflow Recipes

A recipe is a workflow saved as reusable content (My Library) or shipped
in the catalog/Packs. The recipe card shows the graph as a readable
mini-diagram plus the plain-language step list ("New lead, confirmation,
wait 2 days, follow-up, notify sales"). Primary action: `[Use this
Workflow]`, which copies the graph into a new workflow with a short
mapping step: "This recipe needs: a form (pick yours), an email template
(pick or import), a connection (connect or skip)". Unresolved references
are marked on the canvas as fix-me nodes rather than blocking the import.

Recipes are the bridge between the engine and Packs: a Pack's workflows
are simply recipes plus the pre-mapped forms and emails imported with them.

---

## K. Template / Pattern system

One reuse loop, taught explicitly:

```
build something good  →  Save to Library  →  insert it anywhere
get a Pack            →  its assets land in My Library  →  same loop
```

Rules that make reuse real:

- Saving is available from every builder on any selection (field group,
  email section, whole form/email/workflow). Saving asks only for a name
  and an optional category.
- Inserting is available in every builder's Patterns tab and from the
  blank-canvas state ("Start from a template").
- A pattern inserted into a form is a copy, not a live reference (editing
  the instance never mutates the library asset). "Update the library
  pattern from this selection" is an explicit action. Live-linked patterns
  are deliberately out of scope: they create spooky action at a distance
  in exchange for little value at this product's scale.
- Organizing: flat list with categories and search. No folders in v1.
- Every catalog/pack asset is the same object type as user-saved assets:
  one Patterns system, two origins. This keeps the mental model and the
  code surface small.

---

## L. Pack discovery, purchase, install and update flows

### Discover (Library)

Pack cards are visually senior to template cards: larger, industry imagery,
contents summary ("6 forms · 10 emails · 5 workflows · 18 patterns"),
price or Purchased/Installed chip, requirement line when relevant.

### Pack detail page

```
Catering Business Pack                                    $29
Build a complete catering inquiry and quote pipeline
without starting from scratch.

[Preview Pack]   [Get Pack]          Requires: FormFlow Pro

What's inside            What it solves
· 6 Forms      (list)    lead capture → qualification →
· 10 Emails    (list)    quote → follow-up → booking,
· 5 Workflows  (list)    with every email and automation
· 18 Patterns  (list)    pre-written for catering.

Compatibility: FormFlow 1.x · Version 1.2 · Updated May 2026
Changelog ▾
```

Every listed item is clickable into the same read-only preview used by the
Library (real builder chrome, locked). The user can inspect all 6 forms
before paying. Honest previews are the conversion strategy; there is no
other sales copy on the page.

### Purchase

`[Get Pack]` sends the user to the Flexa store checkout (external,
disclosed). On return (or on the next entitlement refresh), the pack shows
as Purchased with `[Install]`. Users who bought on the website first see
their packs under Library → Purchased automatically once the license key
is connected. Design the waiting state: "Purchased on flexatech.com?
Connect your license to see your packs here."

### Install and import

One flow, fully transparent:

```
Step 1 · Review          Step 2 · Import        Step 3 · Done
You are importing:       progress list,         Pack installed.
✓ 6 Forms                item by item           Created: 6 forms,
✓ 10 Email Templates                            10 emails, 5 work-
✓ 5 Workflows (2 need                           flows (2 marked
  FormFlow Pro)                                 "needs Pro"), 18
✓ 18 Patterns                                   patterns.
  (3 already installed,                         [View Pack]
   will be linked)                              [Open first form]
[Import Pack]                                   [Start building]
```

- Nothing is written before the user confirms Step 1.
- Conflicts are resolved in Step 1, not mid-import: already-installed
  shared patterns are linked (section F); name collisions get a "(Catering
  Pack)" suffix preview the user can see before confirming.
- Recipes that need Pro still import on Free: they land disabled with a
  clear "needs FormFlow Pro" state. The user owns what they bought; the
  dependency chip explains the rest. (The gating lives in Pro at run time,
  consistent with the existing seam model.)
- Imported workflows always arrive **disabled** until the user reviews and
  enables them. Never auto-activate automation on import.

### Update

Library → My Library shows an "Update available" chip per pack, opening the
diff summary described in section F (keep mine / take update / keep both,
per item, with modified items protected by default). Changelog is shown on
the same screen.

---

## M. Monetization and locked states (summary of the system)

| State | Where it appears | Visual | Primary action |
|---|---|---|---|
| Pro capability | builder palettes, condition editors, node palette | neutral "Pro" chip, item fully rendered | click → 1-sentence explainer → Learn more / Upgrade |
| Paid Pack | Library only | price on card | Preview → Get Pack |
| Pack requires Pro | pack cards, recipe cards, imported-but-gated items | quiet "Requires: FormFlow Pro" line | View Pro (secondary; Preview stays primary) |
| Purchased, not installed | Library | "Purchased" chip | Install |
| Installed | Library | "Installed" chip | Open / Update |
| License attention (grace, seat limit, expired) | Dashboard status line + Pro license page | single amber/red line (existing banner system) | Fix it link |

The explainer copy formula, everywhere: what it does (one sentence), what
unlocks it (one line), two buttons. No feature-matrix modals inside the
product; the full comparison lives on the website's Pro page.

---

## N. Design system

Extends the existing stack (Tailwind v4 with the `ff` prefix, hand-vendored
shadcn primitives, lucide icons, the WP-admin override layer). This section
defines what the new surfaces add; it does not restyle what ships.

**Foundations** (already established, reaffirmed): brand color scale from
settings, slate neutrals, `radius-md` default, spacious 5/4 padding rhythm,
subtle 1px slate-200 borders, no gradients, light theme first with the
existing `data-theme` dark support.

**Component inventory to add or formalize:**

- Cards: `AssetCard` (template/pattern/recipe: preview, name, type icon,
  one ownership chip), `PackCard` (larger: cover, contents summary, price
  chip, requirement line), `StatCard` (dashboard).
- Chips/badges, one taxonomy: `Free` (slate outline), `Pro` (brand
  outline), price (solid slate), `Installed` (emerald tint), `Purchased`
  (slate tint), `Update` (amber tint). Rule: max one chip per card, one
  "Pro" chip per palette row, chips never animate.
- Builder chrome: `BuilderShell` (top bar + three panels, shared by all
  three builders), `InsertPanel` (categorized, searchable), `Inspector`
  (tabbed), `CanvasToolbar`.
- Workflow: `NodeCard` (icon, sentence, status dot, error state),
  `BranchLabel`, `RunTrail` (per-node test-run result), `RecipeDiagram`
  (read-only mini graph).
- Flows: `ImportSummary` (the checklist screen), `DiffList` (update
  keep/take rows), `LockedExplainer` (popover, not modal), `EmptyState`
  (icon, one line, primary + library action), skeleton loaders for
  Library grids.
- Existing primitives reused as-is: Button (default/ghost/outline/
  destructive), Input, Select, Switch, Dialog, Tooltip, Toaster, tables,
  banners (license notices).

**Action hierarchy**: primary (brand solid) for the single next step,
outline for alternatives, ghost for tertiary, destructive red only inside
confirm dialogs. Upgrade buttons use the standard primary style: Pro is
part of the product, not a special color.

---

## O. Empty states

Every list screen's empty state is a small onboarding moment with the same
anatomy: illustration (line-art, no clip-art), one sentence, one primary
action, one Library action.

| Screen | Line | Actions |
|---|---|---|
| Forms | "Your first form takes about a minute." | Create form · Start from a template |
| Entries | "Entries appear here as soon as a form is published." | View forms (or: embed instructions if forms exist but none published) |
| Emails | "Design the emails your forms send." | Create email · Browse templates |
| Workflows | "Automate what happens after someone submits." | Create workflow · Use a recipe |
| Library › My Library | "Anything you save from a builder lands here." | Learn how (15-second inline demo) |
| Integrations | "Connect a service once, use it in any workflow." | Browse integrations |
| Builder canvas (blank) | "Describe it, pick a template, or start empty." | Generate with AI · Templates · Start empty |

Empty states are the one place the Library is promoted outside its screen
and the Dashboard, and only as the secondary action.

---

## P. Onboarding

First-run experience is the Dashboard in checklist mode (no wizard modal,
no forced tour):

```
Welcome to FormFlow                                    3 of 5 done
○ Create your first form            (or: import one from the Library)
○ Publish it to a page              (embed block / shortcode helper)
○ You got your first entry          (auto-checks itself)
○ Design the confirmation email
○ Automate a follow-up              (workflow recipe suggestion)
```

- Each step deep-links into the real screen; no simulated UI.
- The existing onboarding state endpoint tracks progress; the checklist
  collapses to a quiet progress pill after first completion and disappears
  when done.
- Woo sites get a sixth optional step: "Take over an order email."
- The checklist teaches the object model in order (Form → Entry → Email →
  Workflow) and introduces the Library twice, both as an alternative path,
  which plants the "build or reuse" mental model on day one.

---

## Q. Responsive behavior

- **Management screens** (Dashboard, lists, Library, Entries): fully
  responsive. Cards reflow to one column; tables collapse to stacked
  key-value rows on narrow widths (WP admin on mobile is a real support
  scenario for the operator persona checking Entries).
- **Builders**: desktop-first with a working narrow mode, not a crippled
  one. Below ~1100px the insert panel and inspector become slide-over
  drawers toggled from the top bar; the canvas keeps priority. Below
  ~782px (WP's own mobile breakpoint) builders show a read-only preview
  plus "editing works best on a larger screen", with Entries and toggling
  workflows still fully usable.
- Preview modes inside builders (desktop/mobile email preview, form
  viewport toggle) are explicit controls, independent of the actual window
  size.

---

## R. Future marketplace extensibility

Design decisions made now so the Library can grow without rework:

- **Entitlements are a list, not a boolean.** The license client already
  returns product/tier/term; extend the same payload with an entitlement
  list (pack SKUs, bundle SKUs, or the wildcard). The plugin never hardcodes
  pack ownership logic beyond "is this SKU in the list".
- **Bundles are entitlement groups defined server-side.** "Hospitality
  Bundle" resolves to its member pack SKUs at the store; the plugin just
  sees the packs as purchased. Bundle cards in the Library are a catalog
  presentation concern (a card listing member packs with combined pricing),
  requiring no new plugin logic.
- **All Access is the wildcard entitlement.** UI: an "All Access" banner
  state in the Library header ("Everything unlocked") replacing per-card
  price chips with Install. Again no new mechanics.
- **The catalog feed is versioned and additive**: new content types (say,
  "Page templates" someday) appear as a new type facet; unknown types are
  ignored by older plugin versions.
- **Updates channel**: the existing daily license cron also refreshes
  entitlements and pack-update availability; a future "Updates" view under
  My Library lists all pending content updates in one place.
- Third-party pack authorship (a true marketplace) is explicitly out of
  scope until the first-party pack pipeline is proven; the bundle format
  is signed by the store, and imports verify the signature, which keeps the
  door open for vetted third parties later.

---

## S. Screen inventory

Grouped, with new-vs-restyle status:

**Shell**: Dashboard (new), navigation (restructure).

**Forms**: list (restyle to cards/table hybrid), Form Builder (three-panel
restructure), form settings (into inspector), publish/embed helper (new
small surface).

**Entries**: list with filters (restyle), entry detail with activity trail
(restyle), export (existing).

**Emails**: list with Form/Woo tabs (restructure), Email Builder (three-
panel restructure), test-send result surface (restyle), Woo assignment
control (into inspector).

**Workflows**: list with enabled toggles (restyle), Workflow canvas (major
redesign: vertical graph, palette, inspector), Test Run + Logs (new),
recipe mapping step (new).

**Library** (all new): Library home with tabs/facets, asset preview
(read-only builder chrome), Pack detail, purchase-return state, import
flow (3 steps), My Library, pack update/diff screen.

**Integrations**: directory (restyle, existing catalog), connect drawer
(existing), connection status on Dashboard.

**Settings**: general/delivery/AI/appearance (existing structure, restyle
pass), Pro license page (exists).

**System states**: empty states (7), locked explainer, license banners
(exist), import/update progress, error and offline-store states.

Roughly: 12 new surfaces, 10 restyles/restructures, the rest reuse.

---

## T. Recommended MVP design scope

Sequenced so the business model ships early and the deepest redesigns come
after it is validated.

**Phase 1: the model becomes visible** (highest strategic value per effort)

1. Navigation restructure + Dashboard (with checklist onboarding and the
   Library row).
2. Library v1: catalog browse (templates, patterns, recipes), install free
   content, My Library with "Save as pattern / template / recipe" from the
   existing builders (minimal builder changes: add the save action and a
   Patterns insert tab).
3. Pack v1: pack detail page, entitlement check, the 3-step import flow,
   provenance stamping. One real Pack (Catering) authored to prove the
   format, its workflows shipped as Free-capability recipes so the Pack
   sells before advanced Pro nodes exist.
4. Locked-state system: the three lock types, explainer popover, chip
   taxonomy. Applied to the existing Pro surfaces (crm_push node,
   connectors).

**Phase 2: Pro earns its price**

5. Workflow canvas redesign (vertical graph, Test Run, logs) + Pro timing
   and branching nodes as the flagship locked items.
6. Form builder three-panel restructure with logic tab and Pro advanced
   fields.

**Phase 3: depth**

7. Email builder restructure with the Dynamic Data browser.
8. Pack updates/diff flow, purchase-return polish, bundles presentation,
   second and third Packs.

**Explicitly deferred**: All Access UI, third-party marketplace, live-linked
patterns, folder organization, AI workflow generation.

The test applied to everything above (section 26 of the brief): each Phase 1
item either improves the core loop (Dashboard, nav), creates the content
ecosystem (Library, save/insert, Pack import), or makes the business model
legible (lock system). Nothing in Phase 1 adds a new engine capability, so
support burden stays concentrated where it already is.

---

## Appendix: the seven journeys, end to end

1. **First form**: Dashboard checklist → Create form → blank-canvas choice
   (AI / template / empty) → build → Publish helper (embed block) → first
   entry auto-checks the checklist → prompted step: design the
   confirmation email (opens Email builder pre-linked to the form).
2. **Design an email**: Emails → Create → template picker (Library-fed) →
   customize in builder → Dynamic Data chips with sample values → mobile
   preview → Test send (inline result) → Save.
3. **First workflow**: Workflows → Create → pick trigger (form entry) →
   add actions from palette → optional single condition → Test Run with a
   sample entry, watch the trail → Enable.
4. **Buy a Pack**: Library → Packs facet → Catering Pack card → detail
   page → preview two forms and a recipe read-only → Get Pack (store
   checkout) → return, Purchased → Install → 3-step import → "Open first
   form" → customize.
5. **Use a recipe**: Library or Workflows empty state → recipe card →
   preview diagram → Use this Workflow → mapping step (pick form, pick
   email, skip connection) → fix-me node for the skipped connection →
   connect later → Enable.
6. **Hit a Pro lock**: drags Delay node → explainer popover (one sentence,
   Learn more / Upgrade) → website Pro page → purchase → enter key on the
   existing license page → palette unlocks in place, no reload of mental
   model.
7. **Pack update**: Dashboard status line "1 pack update" → My Library →
   Catering Pack → diff summary, one modified email protected by default →
   take updates for the rest → changelog visible → done.
