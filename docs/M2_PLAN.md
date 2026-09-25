# M2 Execution Plan: Visual email builder (0.6.0)

Single input for the M2 build session. Everything is decided here; build it
top to bottom without re-opening decisions. Spec references: `DESIGN.md`
(screens), `ROADMAP.md` (scope), `IMPLEMENTATION_PLAN.md` (phase tracker),
`M1_PLAN.md` (contracts this milestone builds on).

The editor and render pipeline are a port of flexa-mail
(`../flexa-mail/`). That plugin is the reference implementation: when a
detail is not specified here, open the equivalent flexa-mail file and mirror
it with the vocabulary swapped. Do not invent a different approach.

## Ground rules (recap for a fresh session)

- Vocabulary is locked (also in project memory): namespace `Flexa\FormFlow\`
  in `src/`, constants `FLEXA_FORMFLOW_*`, hooks dot-separated
  (`flexa_formflow.entry.created`), REST `flexa-formflow/v1`, options
  `flexa_formflow_`, Tailwind prefix `ff` on every utility, text-domain
  `flexa-formflow`, control marker `.flexa-formflow-control`.
- Every new endpoint MUST be registered in `Api\Router::register_routes()`
  or it is dead code.
- phpstan L6 must stay clean: `vendor/bin/phpstan analyse --no-progress
  --memory-limit=1G`. Cast `(array) $request->get_json_params()`.
- pnpm only in `apps/admin/`. Host WP-CLI cannot reach this Local site's
  MySQL: no `wp` commands that touch the DB; smoke-test through wp-admin.
- No WooCommerce dependency anywhere in M2. The Woo blocks and the
  Interceptor from flexa-mail are M4 material; do not port them now.
- i18n literals only inside `__()`. Regenerate `.pot` at the end
  (`./makepot.sh`).
- Reuse of M1 conventions: whole-document autosave with 800ms debounce and
  a `lastSaved` JSON-snapshot ref (BuilderPage pattern), full-area takeover
  editors without the sidebar, `formatDate` from FormsListPage.

## Scope

Phase 3: a reusable email template library plus a visual editor, wired into
the notification emails that M1 already sends. Out of scope: AI writing
assistant (Phase 7), per-block display conditions (Pro/workflows), Woo
blocks and interception (M4), template export/import (M3 if time allows).

What ships:

1. Custom table for email templates, DB_VERSION 2.
2. PHP render pipeline: JSON tree in, email-client-safe HTML out
   (tables + inline styles), token resolution, sample data in preview.
3. REST: templates CRUD + duplicate, live preview, test send.
4. `Emails\Notifications` renders through the pipeline. A notification with
   no template picked uses a default tree generated at runtime, so there is
   exactly one render path.
5. Admin: Emails section enabled in the nav; template list; full-screen
   editor (layer list + inspector + iframe preview with desktop/mobile
   toggle); template picker in the form builder's Notifications tab.

---

## Step 1 · Database and domain

`Database\Schema`: bump `DB_VERSION` to 2, add the table to `migrate()`
(dbDelta is idempotent; existing installs upgrade via `maybe_upgrade()`).

```sql
CREATE TABLE {$wpdb->prefix}flexa_formflow_email_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(190) NOT NULL DEFAULT '',
    tree LONGTEXT NOT NULL,                        -- JSON, shape below
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY  (id)
);
```

Add the DROP to `Schema::drop()`, `Maintenance\Eraser`, and `uninstall.php`
(same guard as the M1 tables).

`src/Domain/EmailTemplates/EmailTemplate.php`: readonly value object
(id, title, tree array, created_at, updated_at), `from_row()`, `to_array()`.

`src/Domain/EmailTemplates/EmailTemplateRepository.php`: HasInstance;
`find(int): ?EmailTemplate`, `all(): array` (updated_at DESC, no paging:
template libraries stay small), `create(string $title, array $tree): int`,
`update(int $id, array $fields): bool` (partial: title/tree; tree runs
through the sanitizer whole), `delete(int): bool`,
`duplicate(int): ?int` (title + " (copy)"). Same phpcs/prepare rules as
FormRepository.

## Step 2 · Tree contract and sanitizer

Document shape (flexa-mail Tree v1 with conditions removed):

```jsonc
{
  "version": 1,
  "settings": {              // per-template overrides; "" or absent = inherit
    "backgroundColor": "",   //   from Support\Settings global styles
    "contentBackground": "",
    "textColor": "",
    "brandColor": "",
    "fontFamily": "",
    "width": 600             // clamped 320..800
  },
  "elements": [
    { "id": "el_abc123", "type": "heading", "props": { } }
  ]
}
```

`src/Emails/TreeSanitizer.php`: port flexa-mail
`src/Support/TreeSanitizer.php` verbatim minus the conditions branch.
MAX_ELEMENTS 100, settings string keys sanitize_text_field, width clamped
320..800, element id/type sanitize_key (id generated when missing), props
sanitized recursively depth 3, strings via `wp_kses_post()`. Always returns
the canonical v1 shape.

Block set v1 (11 blocks). Props and defaults are flexa-mail's, unchanged
unless noted; `fields_table` is new (replaces the Woo `order_details`):

| type | props (defaults) |
|---|---|
| `logo` | image "", width 160 (40..600), align "center", alt "", link "{site_url}" |
| `heading` | text "Thanks for reaching out!", align "left", fontSize 24 (12..48), color "" |
| `text` | html "Hi there,", align "left", fontSize 15 (10..32), color "" |
| `button` | text "Visit our site", url "{site_url}", align "center", bgColor "", textColor "#ffffff", radius 6 (0..30), fontSize 15 (11..24) |
| `image` | url "", width 0 (0 = full), align "center", alt "", link "" |
| `divider` | color "#e6e6e6", thickness 1 (1..8), paddingY 8 (0..60) |
| `spacer` | height 24 (4..160) |
| `social` | align "center", facebook "", instagram "", x "", tiktok "", youtube "", pinterest "", website "" (hidden when all empty) |
| `fields_table` | title "Submission", borderColor "#e6e6e6". Renders label: value rows from the entry data; arrays joined ", "; hidden fields skipped when value empty |
| `footer_text` | html "", align "center", color "#8a8a8a". Empty html falls back to "{site_title} · {year}" |
| `html` | code "" (email-safe subset via wp_kses_post) |

Empty `color`/`bgColor` inherit the design tokens at render time, exactly as
in flexa-mail.

## Step 3 · Render pipeline

Port from flexa-mail `src/Render/` into `src/Emails/Render/`, vocabulary
swapped, Woo removed:

- `RenderContext.php`: readonly bundle of `?Form $form`, `?Entry $entry`,
  `string $type` ('admin' | 'confirmation'), `bool $is_preview`. No
  WC_Order, no WC_Email.
- `BaseElement.php`: `type()`, `defaults()`, `render(props, ctx, design)`,
  helpers `resolve_text()` (tokens), `rich_text()` (tokens + wp_kses
  allow-list a/strong/em/span/br/b/i/u), `row()` (tr/td with padding).
- `Elements/` : one final class per block above. `FieldsTable` iterates
  `$ctx->form->fields()` in config order, reads values from
  `$ctx->entry?->data`; in preview with no entry it substitutes sample
  values per field type ("Jane Doe", "jane@example.com", etc.).
- `ElementRegistry.php`: keyed map of instances, filter
  `flexa_formflow.emails.elements`.
- `Renderer.php`: `render_tree(array $tree, RenderContext $ctx): string`.
  Design tokens = tree settings over `Support\Settings` values
  (brand_color, background/content/text colors, font_family,
  container_width map to the token names). Document wrapper: DOCTYPE,
   table-based container, mobile media query on `.ff-container`/`.ff-col`
  (same CSS as flexa-mail with the class prefix swapped).
- `DefaultTemplates.php`: `tree_for(string $type): array` generates the
  runtime default: admin = heading "New submission: {form_title}" + text
  intro + fields_table + divider + footer_text; confirmation = heading
  "Thanks, we got your message" + text + divider + footer_text. Filter
  `flexa_formflow.emails.default_tree` ($tree, $type).

`src/Emails/Tokens.php` (replaces flexa-mail `Placeholders\Resolver`):
syntax `{token}` plus `{field:ID}`, regex `/\{([a-z0-9_:]+)\}/`. Catalog:

| token | value |
|---|---|
| `{site_title}` | get_bloginfo name |
| `{site_url}` | home_url |
| `{admin_email}` | admin_email option |
| `{year}` | gmdate Y |
| `{form_title}` | $ctx->form->title |
| `{entry_id}` | $ctx->entry->id |
| `{entry_date}` | entry created_at via date_i18n with WP date+time format |
| `{page_url}` | entry meta referer |
| `{field:ID}` | entry data value for that field id (arrays joined ", ") |

Preview fallbacks when `$ctx->is_preview` and data is missing (form title
"Contact form", entry id 123, sample field values). Filter
`flexa_formflow.emails.tokens` ($values, $ctx) for extensions. Expose
`Tokens::catalog()` returning `[token => label]` for the editor hint list
(field tokens come from the form config client-side).

## Step 4 · Notifications rewire + config contract

`src/Emails/Notifications.php`: replace the hardcoded `wrap()`/table body
with the pipeline. For each of admin/confirmation:

1. `template_id` from the form's notification config; `> 0` and found in
   the repository → use its tree; else `DefaultTemplates::tree_for($type)`.
2. Build RenderContext (form, entry, type, is_preview false), render, send
   via the existing `send()` (headers, `flexa_formflow.notification.sent`,
   log-only failure all stay).
3. Subjects now run through `Tokens::resolve()` too (so
   "New submission: {form_title}" works). Keep the current defaults.

Config contract change in `FieldTypes::sanitize_config()`:
`notifications.admin.template_id` and `notifications.confirmation.template_id`
(absint, default 0). Mirror in `apps/admin/src/features/forms/types.ts`.

Delete the now-dead private helpers in Notifications (`wrap()`,
`fields_table()`) once the pipeline is in; do not leave both paths.

## Step 5 · REST

New endpoints, registered in `Api\Router` (all `manage_permission` unless
noted):

- `src/Api/EmailTemplatesEndpoint.php`
  - GET `/email-templates` → `{ items: [...] }` (no paging)
  - POST `/email-templates` `{title?, tree?}` → created template (tree
    defaults to `DefaultTemplates::tree_for('admin')`)
  - GET/PUT/DELETE `/email-templates/(?P<id>\d+)` (PUT partial title/tree)
  - POST `/email-templates/{id}/duplicate`
  - 404 via `flexa_formflow_not_found` like FormsEndpoint.
- `src/Api/EmailPreviewEndpoint.php`
  - POST `/email-preview` `{tree, form_id?, type?}` → `{ html }`. Sanitizes
    the tree, loads the form when given (plus its latest entry when one
    exists, else sample data), `is_preview` true.
- `src/Api/EmailTestEndpoint.php`
  - POST `/email-test` `{tree, to, form_id?, type?}` → `{ sent: bool }`.
    Validates `to` with is_email (400 on failure), renders like preview,
    sends through `Notifications::instance()->send()`.

## Step 6 · Admin app

Routing (`lib/router.ts`): `emails` stays the list route; add
`emailEditor { id }` for `#/emails/:id/edit`. `navSection()` maps
emailEditor → emails. In `main.tsx`: remove `upcoming: true` from the
Emails nav item, route `emails` to the real page, render `emailEditor`
as a full-area takeover like the form builder. Keep `SHOW_UPCOMING = false`
for workflows/integrations.

New feature dir `apps/admin/src/features/emails/`:

- `types.ts`: `EmailTree`, `EmailElement`, `TreeSettings`, `EmailTemplate`;
  `ELEMENT_TYPES` meta array (label + lucide icon + field specs per prop:
  kind text | textarea | number(min,max) | color | select | align) mirroring
  flexa-mail `lib/elements.ts`; `newElement(type)` factory (`el_` + 6-char
  random id). Icons: Image, Heading1, Text, MousePointerClick, ImagePlus,
  Minus, MoveVertical, Share2, Table, AlignLeft, Code.
- `useEmailTemplates.ts`: `useEmailTemplatesList` `["email-templates"]`,
  `useEmailTemplate(id)` `["email-template", id]`, create/save/delete/
  duplicate mutations (same invalidation pattern as useForms), plus
  `useEmailPreview` (plain mutation posting to `/email-preview`) and
  `useTestSend`.
- `TemplatesListPage.tsx` (#/emails): card grid or simple table (title,
  updated, hover actions Edit/Duplicate/Delete with confirm Dialog),
  "New template" button → POST then navigate to the editor. Empty state
  explains templates are picked inside a form's Notifications tab.
- `editor/EmailEditorPage.tsx`: draft `{title, tree}`; init-once from
  query; 800ms whole-tree autosave with lastSaved snapshot and the same
  SaveStatus dot; header = back arrow, inline title input, desktop/mobile
  toggle (Monitor/Smartphone icons), "Send test" button opening a Dialog
  (email input + optional form Select), Save status. Three-pane body:
  left `LayerList`, center `PreviewPane`, right `PropsPanel`.
- `editor/LayerList.tsx`: port of flexa-mail LayerList: palette of the 11
  blocks (click to append), sortable layer rows (@dnd-kit vertical, grip
  handle, duplicate + delete on hover, click selects). Selection reuses the
  `selectedFieldId` slice? No: add a separate transient `selectedElementId`
  to the Zustand builder slice (clear on unmount).
- `editor/PreviewPane.tsx`: iframe rendering the html from
  `useEmailPreview`, refreshed on tree change with a 500ms debounce;
  mobile toggle sets iframe width 375px, desktop = tree width; a form
  Select ("Preview with data from…") feeding form_id so fields_table and
  field tokens show real labels.
- `editor/PropsPanel.tsx`: nothing selected → template settings (the 6
  design tokens, each with an "inherit" empty state, width number input);
  element selected → generated field editors from the ELEMENT_TYPES specs
  (color inputs use `<input type=color>` + hex text, same as flexa-mail);
  collapsible token hint list from `Tokens::catalog()` shape (hardcode the
  global list client-side, append `{field:ID}` rows from the preview form).

Form builder integration: `NotificationsTab.tsx` gains a "Design" Select in
both cards (options: "Default design" (0) + templates from
`useEmailTemplatesList`) writing `template_id`, plus an "Edit design" link
to `#/emails/{id}/edit` when a template is picked and a "Manage templates"
link to `#/emails`.

## Step 7 · Verification and wrap-up

1. `php -l` every touched PHP file.
2. `vendor/bin/phpstan analyse --no-progress --memory-limit=1G` clean at L6.
3. `pnpm type-check`, `pnpm build` clean.
4. `./makepot.sh` regenerated.
5. Update `docs/IMPLEMENTATION_PLAN.md`: Phase 3 `[x]` with an M2 note.
6. Manual smoke test (wp-admin, listed for the user):
   - Reactivate the plugin (or just load wp-admin: `maybe_upgrade` runs)
     and confirm the email_templates table exists.
   - Emails nav item visible; create a template; editor loads with the
     default tree; drag to reorder; edit props; preview updates; mobile
     toggle; send a test email.
   - Pick the template in a form's Notifications tab, submit the form on
     the frontend, confirm the received email uses the design and tokens
     resolve ({form_title}, {field:ID}, fields_table).
   - A form with template_id 0 still gets the default-design email.
   - Duplicate + delete a template; deleting a template that a form
     references must fall back to the default design at send time (no
     dangling-id error).

## Definition of done

DB v2 migrates on existing installs; one render path for all notification
email; templates CRUD + editor + preview + test send working end to end;
Emails nav enabled while workflows/integrations stay hidden; no Woo
references anywhere; phpstan L6, tsc, build, makepot all clean.
