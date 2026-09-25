# Flexa FormFlow: Free / Pro / Add-on Architecture

Reference map of what the product does today and how the extension model
works, written so another model can reason about architecture and business
packaging. Two plugins exist right now:

- **Flexa FormFlow** (Free, slug `flexa-formflow`): the base plugin. Ships on
  its own, no WooCommerce required.
- **Flexa FormFlow Pro** (Pro, slug `flexa-formflow-pro`): an add-on plugin.
  `Requires Plugins: flexa-formflow`. Boots after Free and extends it through
  filter seams. Gated by a hosted license.

Both are PHP 8.1+, PSR-4, React 18 + Vite admin apps. Free owns all rendering
and the data contract; Pro (and any future add-on) ships behavior only.

---

## 1. The core idea (why it is built this way)

The whole design turns on one rule: **an add-on never ships React into the
Free bundle.** Instead, an add-on *describes* its UI as data (PHP arrays)
through filter seams. The Free admin app owns a fixed vocabulary of form
controls and renders those descriptors. The add-on runs the matching behavior
in PHP on a runtime seam.

Consequences that shape everything else:

- **One React instance.** Free and Pro build on independent Vite pipelines and
  never collide, because Pro's admin app is only its own license screen; all
  the *feature* UI Pro adds is rendered by Free from data.
- **Free is the platform, add-ons are data + PHP.** New paid features slot in
  as descriptors + handlers, not as new front-end apps.
- **Secrets never round-trip.** Credentials are stored server-side, masked in
  the client, never returned; a blank secret on save keeps the stored value.

This is the seam to protect and extend. Section 5 lists every filter.

---

## 2. Free feature map

The base product joins a form builder and a visual email builder so a form
field becomes a token you can drop into the notification email.

### Forms
- Drag-and-drop builder: field types text, email, paragraph, dropdown, radio,
  checkbox, number, date, hidden.
- Per-breakpoint field width (desktop columns, mobile stack), no CSS.
- Placement via `[flexa_formflow id="123"]` shortcode or a Gutenberg block.
- Spam defense: honeypot + submit-time trap.
- Code: `Domain/Forms/*`, `Frontend/Shortcode.php`, `Frontend/Block.php`,
  `Api/FormsEndpoint.php`, `Api/SubmitEndpoint.php`.

### Entries
- Every submission stored locally; list view with peek panel, detail view,
  read/unread status. No external service.
- Code: `Domain/Entries/*`, `Api/EntriesEndpoint.php`, `Api/StatsEndpoint.php`.

### Visual email builder
- Block editor for the notification email: heading, text, button, image,
  divider, spacer, logo, social, footer, and a fields-table element that
  renders the whole submission.
- `{field:ID}` tokens plus headers like `{form_title}`; template library;
  global styles; desktop/mobile preview; send-test.
- Element rendering is a registry (`Emails/Render/ElementRegistry.php` +
  `Emails/Render/Elements/*`); token resolution in `Emails/Tokens.php`;
  visibility rules in `Emails/Render/Visibility.php`.
- Code: `Domain/EmailTemplates/*`, `Emails/*`, `Api/EmailTemplatesEndpoint.php`,
  `Api/EmailPreviewEndpoint.php`, `Api/EmailTestEndpoint.php`.

### Workflows
- A workflow is a trigger (a form, or any form) plus an ordered action chain
  run against each new entry. The same `run()` path backs the editor test-run.
- Built-in action types: `send_email`, `webhook`, `set_status`, `add_note`.
- Unknown action types fall through to the extension runtime seam (this is
  where Pro nodes execute).
- Code: `Workflows/Engine.php`, `Domain/Workflows/*`, `Api/WorkflowsEndpoint.php`.

### Integrations directory
- A catalog of integration cards. Cards can carry a "Connect" drawer whose
  fields are described by add-ons and rendered by Free. One saved connection
  per integration id, reused across many workflows (connect once, use many).
- Free ships the directory, connection storage, encryption, activity log, and
  a bridge detector (for a companion delivery plugin).
- Code: `Integrations/Catalog.php`, `Integrations/Connections.php`,
  `Integrations/ActivityRecorder.php`, `Integrations/BridgeDetector.php`,
  `Api/IntegrationsEndpoint.php`, `Support/Encryption.php`.

### WooCommerce email takeover (optional)
- Only wires when WooCommerce is active. Lets the visual builder design
  WooCommerce transactional emails; adds order tokens and an order-details
  element. Plugin runs fine without Woo; the screen explains the requirement.
- Code: `WooCommerce/*`, `Api/WooEmailsEndpoint.php`.

### AI assistance
- Proxies exactly the admin-submitted text to a provider chosen in settings
  (Anthropic, OpenAI, Google Gemini) using the site's own API key. Two tools:
  writing assistant for copy, and a form generator from a plain-English
  description. No visitor data sent; disclosed in readme "External services".
- Code: `Api/AiEndpoint.php`; settings keys `ai_provider`, `ai_model`,
  `ai_api_key`.

### Settings, onboarding, delivery
- Single option `flexa_formflow_settings`: brand/background/content/text
  colors, footer text, font, container width, AI keys,
  `delete_data_on_uninstall`.
- Onboarding flow + activation redirect.
- Delivery: FormFlow hands finished mail to `wp_mail()`; pairs with an SMTP or
  bridge plugin for routing/logs.
- Code: `Support/Settings.php`, `Support/OnboardingState.php`,
  `Api/SettingsEndpoint.php`, `Api/OnboardingEndpoint.php`,
  `Admin/ActivationRedirect.php`, `Emails/Notifications.php`.

### Platform plumbing (shared with add-ons)
- Singleton trait `Concerns/HasInstance`; REST facade `Api/Router.php`
  (registers every endpoint, ends by firing `flexa_formflow.rest.register_routes`);
  capabilities in `Support/Capabilities.php` (manage ~ `manage_options`,
  settings ~ `manage_options`), each wrapped in a filter so Pro can re-gate;
  install/migration in `Setup/*` and `Database/Schema.php`; single destructive
  path `Maintenance/Eraser.php` firing `flexa_formflow.data_reset`.

---

## 3. Pro feature map (today)

Pro is deliberately thin right now: two worked examples of the seam pattern
plus a real hosted license. It proves the model end to end so future features
copy the shape.

### CRM & marketing connector
- Turns the Free "CRM & marketing" catalog card from a placeholder into a real
  connector, and adds its Connect drawer (provider select: Mailchimp, HubSpot,
  SendGrid, or a custom HTTP POST endpoint; API key stored as a secret; list
  id; endpoint URL shown only for the webhook provider).
- Locked (read-only demo) until the license is active.
- Code: `flexa-formflow-pro/src/Integrations/ProCatalog.php` on
  `flexa_formflow.integrations.catalog` and `...connect_fields`.

### "Push to CRM" workflow node (`crm_push`)
- A workflow action node that reads the saved CRM connection (connect once,
  reuse from any workflow), maps entry fields to destination fields, and
  optionally gates on conditions before pushing.
- Config carries only per-workflow bits (mapping, conditions); credentials live
  in the saved connection and are read at runtime via `Connections::get('crm')`.
- Node is `locked` in the builder when unlicensed (explorable demo, read-only).
- Live hosted-connector calls are stubbed for non-webhook providers today
  (proves the wiring); the webhook provider does a real POST.
- Code: `flexa-formflow-pro/src/Workflows/ProNodes.php` on
  `flexa_formflow.workflows.action_types` (describe) and `...run_action` (run).

### Licensing (real, hosted)
- Talks to a self-hosted store (Laravel). Key-auth: `license_key` +
  per-site `instance_token`, no API secret.
- Client-side 14-day offline grace: transient failures (network, 5xx, 429)
  keep Pro active for up to 14 days since the last good validation;
  authoritative "no" (expired, revoked, disabled, invalid) downgrades at once.
- Daily cron re-validation (`flexa_formflow_pro_license_check`).
- `License::is_active()` is the single gate every Pro feature checks;
  `FLEXA_FORMFLOW_PRO_UNLOCK` forces active for dev.
- License state exposed to the admin app: `status` (active/grace/expired/
  revoked/disabled/inactive), `tier`, `term`, `expires_at`, `product`,
  over-limit `warning`, key `hint`, `checked_at`, `last_error`.
- Config: base URL via constant `FLEXA_FORMFLOW_PRO_LICENSE_API` or filter
  `flexa_formflow_pro.license_api_base` (default `https://help.flexatech.com`,
  unconfirmed); product slug via filter `flexa_formflow_pro.product_slug`.
- Code: `flexa-formflow-pro/src/Support/License.php`, `.../LicenseClient.php`,
  `.../Api/LicenseEndpoint.php`, `.../Admin/Enqueue.php`,
  `apps/admin/src/features/license/*`.

### Pro boot model
- Boots on `plugins_loaded` priority 20 (Free is priority 10), only if
  `Requirements::met()`. Each subsystem registers itself on a Free seam from
  its own `register()`. Pro's own admin app is just the license screen.
- Code: `flexa-formflow-pro/flexa-formflow-pro.php`, `.../src/Plugin.php`.

---

## 4. The control vocabulary (what Free can render)

An add-on field descriptor picks a `control` from this fixed set; anything else
is dropped by the sanitizer. This is the contract boundary between "add-on
describes" and "Free renders".

| control | renders as | notes |
|---|---|---|
| `text` | text input | `secret: true` masks it, never returned |
| `textarea` | multiline | |
| `email` | email input | |
| `url` | url input | |
| `number` | number input | |
| `select` | dropdown | needs `options: [{value,label}]` |
| `switch` | toggle | |
| `token-text` | text with `{field:ID}` token insertion | |
| `field-map` | map destination keys to tokens/text | needs `mapKeys` |
| `conditions` | match-all/any rule builder | |
| `connection` | picker bound to a saved integration connection | needs `connectionId` |

Shared field options: `label`, `placeholder`, `help`, `default`, `options`,
`mapKeys`, `secret`, `connectionId`, and `showIf: {key, equals}` for a single
show/hide dependency (note: `equals` is a single value, so "not X" cannot be
expressed today, see the ProCatalog webhook gating comment).

Descriptors also carry `locked` + `lockedNote`, which is how a feature appears
as an explorable but read-only demo when unlicensed.

Sanitization and shaping live in `src/Extensions/Registry.php`. Adding a new
control means adding it to `Registry::CONTROLS`, handling it in the React
`SchemaFields` renderer, and (if it needs extra fields) extending
`sanitize_field`.

---

## 5. Extension seams (the add-on API surface)

Every `flexa_formflow.*` hook an add-on can use. Filters return data; actions
observe. This is the stable surface to version and document for third parties.

### Describe UI (add-on emits data, Free renders)
- `flexa_formflow.workflows.action_types` (filter): append a workflow node
  descriptor `{type,label,icon,group,summary,locked,lockedNote,fields[]}`.
- `flexa_formflow.integrations.catalog` (filter): change/append catalog cards.
- `flexa_formflow.integrations.connect_fields` (filter): describe a card's
  Connect drawer `{id,label,summary,locked,lockedNote,fields[]}`.
- `flexa_formflow.emails.elements` (filter): register email builder elements.
- `flexa_formflow.emails.default_tree` / `flexa_formflow.woo.default_tree`
  (filters): supply default email layouts.

### Runtime behavior (add-on handles, Free calls)
- `flexa_formflow.workflows.run_action` (filter): handle a custom node type;
  return `{type,status,detail}` or pass the prior value through.
- `flexa_formflow.emails.tokens` (filter): register token resolvers.
- `flexa_formflow.emails.node_visible` (filter): per-node visibility.
- `flexa_formflow.submission.validate` (filter): extra submission validation.
- `flexa_formflow.woo.catalog` / `flexa_formflow.woo.email_saved`: Woo hooks.

### Lifecycle / observation (actions)
- `flexa_formflow.entry.created` ($entry_id, $form): fires per submission
  (Engine runs workflows here at priority 20).
- `flexa_formflow.entry.note` ($entry_id, $note).
- `flexa_formflow.notification.sent`.
- `flexa_formflow.workflow.ran` ($workflow_id, $entry_id, $log).
- `flexa_formflow.settings.updated` ($new, $old).
- `flexa_formflow.data_reset`: fired by the single destructive path.
- `flexa_formflow.rest.register_routes`: register add-on REST controllers.
- `flexa_formflow.integrations.bridge`: bridge/delivery detection.

### Re-gating (filters)
- `flexa_formflow.capabilities.manage`, `flexa_formflow.capabilities.settings`:
  let an add-on change the capability required for management/settings.

---

## 6. The "add a Pro feature" recipe

Every new paid feature copies one of two shapes. No new front-end app.

**A new workflow node** (like `crm_push`):
1. On `flexa_formflow.workflows.action_types`, append a descriptor with a
   `fields[]` built from the control vocabulary. Set `locked` from
   `! License::is_active()` and a `lockedNote`.
2. On `flexa_formflow.workflows.run_action`, match your `type`, re-check
   `License::is_active()`, do the work, return `{type,status,detail}`.

**A new integration connector** (like the CRM card):
1. On `flexa_formflow.integrations.catalog`, flip a card to active/available by
   license.
2. On `flexa_formflow.integrations.connect_fields`, describe the Connect drawer.
   Store secrets with `secret: true`.
3. Read the saved connection at runtime with `Connections::get($id)`.

**A new email element / token**: register on `flexa_formflow.emails.elements` /
`flexa_formflow.emails.tokens`, gate by license inside the resolver.

Gate on file *absence* for whole features (Pro not installed = code not
present); gate on `License::is_active()` for licensed-but-inactive. Never ship
disabled Free-side code behind an `if ($pro)` runtime flag.

---

## 7. Naming vocabulary (locked)

| token | Free | Pro |
|---|---|---|
| PHP namespace | `Flexa\FormFlow\` | `Flexa\FormFlowPro\` |
| constants | `FLEXA_FORMFLOW_*` | `FLEXA_FORMFLOW_PRO_*` |
| hooks | `flexa_formflow.*` (dot) | `flexa_formflow_pro.*` |
| REST | `flexa-formflow/v1` | `flexa-formflow-pro/v1` |
| options | `flexa_formflow_*` | `flexa_formflow_pro_*` |
| JS global | `flexaFormFlow` | `flexaFormFlowPro` |
| Tailwind prefix | `ff` | `ffp` |
| text domain | `flexa-formflow` | `flexa-formflow-pro` |
| dev unlock | (none) | `FLEXA_FORMFLOW_PRO_UNLOCK` |

Note: Free hooks use dot separators, not slashes (a deliberate style choice for
this lineage).

---

## 8. Where the model should think about business packaging

Facts to build the packaging decision on, no recommendation baked in:

- **The seam already supports N add-ons, not just one Pro.** Any plugin can
  hook `flexa_formflow.*`. A tiered Pro, or separate paid add-ons (a CRM pack,
  a payments pack, a PDF pack), are all the same mechanism: describe + handle +
  gate. The license gate is per add-on plugin, so add-ons can carry their own
  license or share one.
- **Free is genuinely useful standalone** (forms + entries + email builder +
  local workflows + AI + optional Woo). That sets the floor for what must stay
  free to keep adoption.
- **The current Pro line is a demo of the model, not a full paid tier.** The
  two Pro surfaces (CRM connector, crm_push node) plus real licensing are the
  scaffold; the connectors themselves are stubbed for non-webhook providers.
- **WordPress.org guideline constraint (Free):** the Free plugin cannot ship
  features locked behind a license/trial/quota (review guideline 5). Locked
  *demos* of Pro nodes are descriptors provided by the *Pro* plugin, so the
  gating lives in Pro, not Free. Keep it that way: Free must never contain a
  disabled paid feature.
- **Licensing supports seats/tiers/terms already** (`tier`, `term`,
  `expires_at`, over-limit `warning`, per-site `instance_token`), so seat-based
  or tier-based pricing needs no client rework, only store-side plans.

Open items before shipping Pro commercially: confirm the production license
API base URL (default `https://help.flexatech.com` is a guess) and the store
product slug; wire the real hosted CRM connectors (only webhook is live).
