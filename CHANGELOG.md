# Changelog

Engineering history for Flexa FormFlow: what changed, and why it changed.

This is the developer-facing log. The user-facing one is the
`== Changelog ==` section of `readme.txt`, which is what WordPress.org
renders on the plugin page; keep it short and written for site owners. When a
release is cut, summarise the entries below into that section rather than
copying them across — `.distignore` drops every `*.md`, so this file never
ships in the zip.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Then / Otherwise branches in workflows. A workflow with a condition now runs
  `actions` when it is met and the new `else_actions` when it is not (before,
  a failed condition just stopped the run). Workflows without
  `else_actions`, or without a condition, behave exactly as before; the
  sanitizer drops `else_actions` when there is no condition. The List view
  shows "If met" and "If not met" sections, the Visual view splits into two
  columns with labelled edges and highlights the branch the last test took,
  and steps can move between branches. Removing a condition that has
  Otherwise steps asks first. Pack refs, pack restore and saved recipes carry
  the Otherwise branch.
- Test data for workflow test runs. Run test opens a test panel docked beside
  the flow (List or Visual, sticky under the header), so the run can be
  followed on the steps; it stays open to run again and lists the last
  result step by step. It tests with the latest entry, a chosen recent entry,
  or typed test values (`POST /workflows/{id}/test`
  with `source: latest | entry | values`, `Workflows\TestRun`). Typed values
  become an unsaved entry (id 0): email and webhook steps really send, while
  status and note steps only report what they would do. The builder's forms
  list now includes choice fields' `options` for the dialog's inputs.
- Visual view for the workflow builder, next to the existing List view (a
  List / Visual switch in the header, remembered per browser in
  localStorage; screens under 900px stay on List). The linear flow (trigger,
  optional condition, actions, Add step) is drawn as nodes on a dotted canvas
  with pan, Ctrl/Cmd + scroll and button zoom, fit view and keyboard control.
  Selecting a node opens its settings in a side panel built from the same
  step editors as the List cards; actions can be added, removed and reordered
  on the canvas, and test-run results show on each node. Both views edit one
  draft through shared `DraftOps`; node positions follow the step order, so
  nothing new is saved and the API, sanitizer and engine are unchanged. No
  graph library was added: a linear flow needs no layout engine, and a
  library's unprefixed global CSS would sit outside the `ff:` prefix.
- Media Library picker for the Image and Logo blocks: Choose / Replace /
  Remove with a thumbnail, alt text filled while empty, the URL box kept for
  external links, and a click on an empty Image block on the canvas opens the
  library (`wp_enqueue_media()` on the plugin page; `canUpload` localized).
- Addresses block (`order_address`, WooCommerce only): billing, shipping, or
  both, picked with a Show option; with both, a Layout option puts them side
  by side (stacking on phones) or one under the other. Shipping follows WooCommerce's
  own rules (`needs_shipping_address()`, ship-to-billing-only).
- Searchable preview data pickers (`SearchSelect`). Orders are searched by
  number, name, email or address through `wc_order_search()`
  (`GET /woo-emails/orders`). The email editor, its test send, Dynamic Data
  and the header/footer editor can render against a real order (`order_id`).
- Switch email picker in the editor header, and Edit design / Customize on
  WooCommerce email cards (`POST /woo-emails/{id}/customize` copies the
  built-in design into an assigned template).
- Reset to default from the editor's More actions menu. Templates record
  `tree.origin` (`form`, `woo`, `pack`, `blank`; stamped on create, pack
  install and restore). `GET /email-templates/{id}/default` returns the design
  without writing; the editor applies it as an undoable edit. The dialog
  always shows a Start from choice, preselected in this order: the WooCommerce
  email or pack the template was made from, the WooCommerce email it is
  assigned to, then the form design it was made from
  (`GET /email-templates/origins` lists the rest).
- Template import/export as a versioned `flexa-formflow/email-templates` JSON
  file. Export runs client-side (row, editor menu, Export all). Import
  (`POST /email-templates/import`, with `dry_run`) warns about missing block
  types, images hosted elsewhere and unknown header/footer sets, and always
  adds new templates.
- Pack restore. A pack's detail page now reports which of its installed items
  are no longer on the site and puts back only those, so deleting a form or a
  workflow is recoverable (`GET /library/packs/{id}/status`,
  `POST /library/packs/{id}/restore`, both `manage_permission`).
- `Packs\InstallState` records the `ref → id` of every row an import creates,
  which is what lets "installed, then deleted" be told apart from "never
  installed".
- Restored rows are rewired rather than left dangling: a workflow's trigger
  form and `send_email` template, and a form's two notification templates, are
  repointed from the ids that went away to the ids that replaced them. Only
  references present in that remap are touched, so a reference the user
  deliberately changed is left alone.
- Packs installed before ids were recorded are back-filled by exact name,
  accepted only on a single unambiguous match. No migration needed, and an
  ambiguous name is left unrecorded rather than guessed at.

### Fixed

- REST requests with a query string 404'd on plain permalinks: the base is
  `?rest_route=...`, so the path's `?` must become `&` (`lib/api.ts`). This
  also broke the existing forms list.
- Leaving the email editor within 800ms of an edit dropped it: the unmount
  cleared the pending autosave. Back and Switch email now save first.
- WooCommerce blocks were offered in the palette on sites without
  WooCommerce, where they rendered blank.
- A picker value from `wp_localize_script` (`hasWooCommerce`, "1"/"") passed
  to a React Query `enabled` option threw and blanked the email editor.
- A pack could never be reinstalled once any of its content was deleted. The
  install stamp held only the pack id and version, so `/import` kept refusing
  with 409 "already installed" while the content was gone, and nothing in the
  UI or the REST surface could clear that state.
- `Maintenance\Eraser` left `flexa_formflow_installed_packs` and
  `flexa_formflow_woo_emails` behind. After a full data reset, an empty site
  still read every pack as installed and refused to install it.
- `uninstall.php` did not delete `flexa_formflow_installed_packs`, so the same
  stale state survived removing the plugin with the delete-data option on.

### Changed

- `Installer::resolve_workflow()` moved to `Packs\WorkflowRefs::resolve()`, so
  the importer and the restorer resolve symbolic refs through one path and a
  restored workflow is wired exactly like an imported one. This also brings
  `Installer` back under the 300-line budget.

### Known gaps

Found while testing, not addressed here:

- The three standalone free items in the Flexa Library tab (Contact form,
  Customer information, Quote request received) are not clickable and cannot be
  installed: `LibraryPage` passes no `onSelect` for catalog assets, and the
  entries in `Library\Catalog::free_content()` carry no payload. Only packs are
  installable today, which does not match the "free content installable"
  acceptance line in `docs/PHASE1_PLAN.md`.
- An entry detail renders one row per field on the *current* form, so a field
  added after a submission shows as an empty `–`, indistinguishable from a
  field the visitor left blank. The data already tells them apart (a field
  present at submit time always has a key in `entry.data`); the UI does not
  read that signal yet.
- A `number` field accepts `e`, `E` and `+` because the HTML floating-point
  grammar allows them. `eeee` silently becomes an empty value, and `1e5`
  silently becomes `100000`.

## [1.2.0] - 2026-10-02

### Added

- Email pattern library. `Emails\Patterns\Registry` holds 56 patterns in
  nine categories (header, intro, banner, call to action, gallery, order,
  shipping, offer, footer), 6–7 per category, each built only from existing
  email blocks: no HTML, no second renderer. Every pattern carries a stable
  `id`, `version`, `name`, `description`, `category` key, `keywords`,
  `contexts` (`email`, `global-header`, `global-footer`), `tier` and
  `requires`. `Registry::normalize()` migrates the pre-1.2 shape (a translated
  category label, no contexts) and drops malformed add-on entries; order and
  shipping patterns need WooCommerce and are hidden without it.
- Patterns tab rebuilt: search over name, category, keywords and description;
  collapsible categories with counts; thumbnails and a large preview rendered
  by the email `Renderer` itself (`POST /emails/patterns/preview`), so the
  preview is what gets inserted. Insert places the blocks after the selected
  block (after its columns row when the selection is inside a column), or at
  the end; it is one undo step. Pro-tier patterns show a lock and cannot be
  inserted on Free (`flexa_formflow.pro_active`).
- Section background (`props.background`) on every block. Consecutive blocks
  with the same color share one `bgcolor` cell in sent mail, so a band has no
  seams. This is what lets patterns build dark or tinted bands from ordinary
  blocks. Logo and Social blocks gained a color prop for dark bands.
- Global header & footer templates: the layout editor's Patterns tab shows
  only header or footer patterns, and applying one to a part that already has
  blocks asks Replace current / Insert blocks / Cancel.
- Per-email header and footer modes: Use global (by reference, so set edits
  reach the email), Override for this email (a snapshot in `headerOverride` /
  `footerOverride`, edited on the email's own canvas and never changed by set
  edits), or Disabled. Resolved server-side by `Emails\LayoutParts`; a deleted
  set falls back to the default set.
- Merge tags: `{site_tagline}`, `{site_logo_url}`, and on WooCommerce
  `{order_subtotal}`, `{order_discount}`, `{order_shipping_total}`,
  `{order_tax_total}`, `{billing_address}`, `{shipping_address}`. Catalog
  entries now state a type, the email kinds they have data in, and a fallback
  (`flexa_formflow.emails.token_fallbacks`). The block inspector flags tags the
  current context cannot fill. Logos default to `{site_logo_url}` and fall back
  to the site name, never a fixed brand.
- Spam protection, always on: the honeypot, a timing check that needs either
  enough dwell time or real interaction (`_ff_i`) instead of one hard cut-off,
  and rate limits per form and per site (`Spam\RateLimiter`, defaults 8 and
  20 submissions per 10 minutes, `flexa_formflow.spam.rate_limits`). Buckets
  are an HMAC of IP + user agent, so people sharing a NAT do not share a limit
  and no raw IP is stored.
- Optional CAPTCHA per form: Cloudflare Turnstile or Google reCAPTCHA v2 behind
  `Spam\Captcha\CaptchaProviderInterface` and its registry
  (`flexa_formflow.captcha.providers`). Server-side verification through the
  WordPress HTTP API checks success, hostname, and for Turnstile the action
  and the form instance (`cdata`); tokens are single-use
  (`Spam\ReplayGuard`).
- Settings > Spam protection: Built-in protection (always on), Default CAPTCHA
  for new forms (applies at creation only), and each provider's site and
  secret key with Configured / Needs keys status, Replace key, Remove and Test
  keys (`POST /spam/captcha/test`).
- Form builder: a Spam protection section (built-in shown as always active, a
  CAPTCHA select storing only the provider id), a CAPTCHA stand-in in Preview
  labelled as not verifying, and Run test (`POST /forms/{id}/test-submission`):
  a dry run of the submit pipeline on sample answers that reports every step
  and creates no entry, sends no email and runs no workflow.
- Frontend: provider scripts load only on pages with a form that uses them,
  in explicit-render mode so several forms and providers share a page; a
  failed or blocked script shows a retry instead of hanging; tokens reset after
  every server answer.
- Dashboard warning for published forms whose CAPTCHA has no keys.
- Unit tests: `tests/` (PHP, `composer test` or `php tests/run.php`) and
  `pnpm test` (Vitest) for patterns, layout modes, tokens, the renderer and
  every spam layer.
- Pack restore. A pack's detail page now reports which of its installed items
  are no longer on the site and puts back only those, so deleting a form or a
  workflow is recoverable (`GET /library/packs/{id}/status`,
  `POST /library/packs/{id}/restore`, both `manage_permission`).
- `Packs\InstallState` records the `ref → id` of every row an import creates,
  which is what lets "installed, then deleted" be told apart from "never
  installed".
- Restored rows are rewired rather than left dangling: a workflow's trigger
  form and `send_email` template, and a form's two notification templates, are
  repointed from the ids that went away to the ids that replaced them. Only
  references present in that remap are touched, so a reference the user
  deliberately changed is left alone.
- Packs installed before ids were recorded are back-filled by exact name,
  accepted only on a single unambiguous match. No migration needed, and an
  ambiguous name is left unrecorded rather than guessed at.

### Changed

- The submit route runs a fixed pipeline: request size → published form →
  built-in protection → rate limit → CAPTCHA → field validation → entry →
  notifications and workflows. Nothing with a side effect runs before every
  check has passed. Field validation moved to `SubmitEndpoint::validate()` so
  the test run judges answers the same way.
- `Emails\Patterns` is now a thin wrapper over `Emails\Patterns\Registry`;
  the `flexa_formflow.emails.patterns` filter still works and its entries are
  normalized. Category keys replaced translated labels.
- `GET /emails/patterns` takes `context` and returns `categories` and
  `schemaVersion` alongside `patterns`.
- A form's `settings.captcha` is part of the config; forms saved before read
  as `none`. Publishing (or switching a live form) to a CAPTCHA without keys
  is refused with a 422 and a link to Settings; drafts save freely.
- Database version 7 adds the `flexa_formflow_throttle` table (hashed bucket,
  count, expiry) for rate limits and token claims. It migrates on the next
  admin page load; until then rate limiting is skipped rather than blocking
  submissions.
- The global layout editor preview keeps the email's own design settings.
- `Installer::resolve_workflow()` moved to `Packs\WorkflowRefs::resolve()`, so
  the importer and the restorer resolve symbolic refs through one path and a
  restored workflow is wired exactly like an imported one. This also brings
  `Installer` back under the 300-line budget.

### Fixed

- The "Friendly greeting" pattern used `{billing_first_name}`, a tag that does
  not exist, so sent emails showed it raw.
- Unknown or empty merge tags are no longer sent raw: a real send uses the
  tag's fallback (usually empty). Previews still show unknown tags so typos
  stand out.
- `uninstall.php` and `Maintenance\Eraser` left the `flexa_formflow_email_layout`
  option behind.
- A pack could never be reinstalled once any of its content was deleted. The
  install stamp held only the pack id and version, so `/import` kept refusing
  with 409 "already installed" while the content was gone, and nothing in the
  UI or the REST surface could clear that state.
- `Maintenance\Eraser` left `flexa_formflow_installed_packs` and
  `flexa_formflow_woo_emails` behind. After a full data reset, an empty site
  still read every pack as installed and refused to install it.
- `uninstall.php` did not delete `flexa_formflow_installed_packs`, so the same
  stale state survived removing the plugin with the delete-data option on.

### Security

- Token values in rich-text blocks are escaped before they reach the markup,
  so a visitor's answer can no longer inject a link or tag into a
  notification. Formatted addresses are the only HTML-valued tags
  (`flexa_formflow.emails.html_tokens`) and pass `wp_kses_post()`.
- CAPTCHA secret keys are encrypted at rest with the existing AES-256-GCM
  `Support\Encryption` (key from the WordPress salts or
  `FLEXA_FORMFLOW_ENCRYPTION_KEY`, never stored with the ciphertext), sent to
  the browser only as a mask, and never logged. The mask coming back keeps the
  stored key; an empty value removes it. Threat model: a database-only leak
  does not reveal the keys; access to `wp-config.php` or code execution does,
  as with any WordPress secret.
- CAPTCHA verification fails closed on timeouts, network errors, non-200
  answers and unexpected bodies; failures log only a code when `WP_DEBUG` is
  on, never the token, secret or payload.
- Bots caught by the built-in checks get the normal success message and
  nothing is stored, sent or run; the response does not say which check fired.
- Submit bodies over 128 KB are refused.

## [1.0.0]

First release, prepared for the WordPress.org directory.

### Added

- Pack uninstall. A pack's detail page can now remove exactly the form, email
  template and workflow its install (or a later restore) is recorded to have
  created, then clears the install stamp so the catalog offers "Install pack"
  again instead of a permanently stuck "Installed" badge
  (`DELETE /library/packs/{id}`, `Packs\Uninstaller`, `InstallState::forget()`).
  Patterns are left alone: they are shared by content id across every pack
  that ships them, and already behave as the user's own My Library copies
  once installed. The confirm dialog lists the named items about to go.
- Default WooCommerce email content is now written per event instead of one
  generic "thanks for your order" copy shared by all 11 (`WooTemplates::copy_for()`).
  The two account emails (Reset password, New account) also get a real
  call-to-action button wired to the two new order tokens below.
- Two new order tokens, `{reset_password_url}` and `{set_password_url}`,
  built from the `reset_key` / `user_id` / `set_password_url` WooCommerce
  hands the email template (`OrderTokens`, `templates/woo-email.php`).
- A fullscreen toggle for the admin app: a floating button, rendered once
  above the router so it covers every screen including the full-area
  builder/editor takeovers, expands the plugin root into a fixed
  full-viewport overlay above wp-admin's own bars.

### Fixed

- `WooEmailsEndpoint::recent_orders()` crashed with a 500 when a refund was
  among the store's latest orders: `OrderRefund` does not have
  `get_formatted_billing_full_name()`. `wc_get_orders()` is now scoped to
  `type: shop_order`, with a defensive `method_exists()` check kept as a
  second line of defense.
- `{customer_first_name}`, `{my_account_url}` and `{shop_url}` silently stayed
  as literal, unresolved text on any real WooCommerce send with no
  `WC_Order` in context (Reset password, New account) — those tokens were
  gated behind an order that account emails never have.
- The WooCommerce email preview cached by `(email id, order id)` only, so a
  saved subject/template change never appeared in an already-open preview
  until a manual refresh.
- `FieldTypes::sanitize_config()` saved a field's `width` as an empty string
  instead of the intended `"full"` default whenever the field omitted it: the
  validity check read `$field['width'] ?? 'full'`, but the branch that used
  the value read `$field['width']` directly, without the same fallback.
- `Tokens::field_values()` and `FieldsTable::render()` both used
  `array_key_exists()` to decide an entry had answered a field, but that is
  true even for an empty string or array. An entry that left a field blank
  (it was not required) permanently suppressed the sample-value fallback in
  preview, rendering the Dynamic Data panel and the email's Submission table
  blank instead of showing `Jane Doe` / `jane@example.com` / `42`.
- After uninstalling a pack, the "N items missing / Put missing items back"
  banner on its detail page kept showing stale data indefinitely:
  `usePackStatus` disables itself once `pack.installed` flips to `false`, and
  a disabled React Query entry keeps serving its last cached result —
  `invalidateQueries` does not refetch a disabled query. The uninstall
  mutation now calls `removeQueries` on that cache entry instead.

- Form builder: drag-and-drop canvas, nine field types, per-field responsive
  column widths, required and placeholder options.
- Frontend rendering via shortcode and block, with honeypot and submit-time
  spam traps.
- Entries: storage, list with peek panel, detail view, read/unread status.
- Visual email builder: block-based editor, field tokens, a fields table,
  template library, global styles, desktop and mobile preview, test send.
- Notification email to the admin and an optional confirmation to the
  submitter, both sent through `wp_mail()`.
- WooCommerce email takeover, workflows, integrations with delivery-bridge
  detection, and AI form generation and copy assistance.
- Settings and onboarding; optional delete-data-on-uninstall.
