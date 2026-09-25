# M1 Execution Plan: "A form plugin that works" (0.5.0)

Single input for the M1 build session. Everything is decided here; build it
top to bottom without re-opening decisions. Spec references: `DESIGN.md`
(screens), `ROADMAP.md` (scope), `IMPLEMENTATION_PLAN.md` (phase tracker).

## Ground rules (recap for a fresh session)

- Vocabulary is locked (also in project memory): namespace `Flexa\FormFlow\`
  in `src/`, constants `FLEXA_FORMFLOW_*`, hooks dot-separated
  (`flexa_formflow.entry.created`), REST `flexa-formflow/v1`, options
  `flexa_formflow_`, Tailwind prefix `ff` on every utility, text-domain
  `flexa-formflow`, control marker `.flexa-formflow-control`.
- New-generation scaffold names: `Api\Router` + `Api\Endpoint`,
  `Concerns\HasInstance`, `Setup\Activator`, `Maintenance\Eraser`,
  migrations go in `Database\Schema` (new class, does not exist yet).
- Every new endpoint MUST be registered in `Api\Router::register_routes()`
  or it is dead code.
- phpstan L6 must stay clean: `vendor/bin/phpstan analyse --no-progress
  --memory-limit=1G`. Cast `(array) $request->get_json_params()`.
- pnpm only in `apps/admin/`. Host WP-CLI cannot reach this Local site's
  MySQL: no `wp` commands that touch the DB; smoke-test through wp-admin.
- No WooCommerce dependency anywhere in M1.
- i18n literals only inside `__()`. Regenerate `.pot` at the end
  (`./makepot.sh`).

## Scope

Phases 1 + 2 plus the notification-email slice: form builder, frontend
render + submit, entries, fixed-template notification emails. The visual
email builder, workflows, and integrations are NOT in M1. Their nav items
get hidden (step 7).

---

## Step 1 · Database

New `src/Database/Schema.php` (final class, static like Activator):
`DB_VERSION = 1`, option `flexa_formflow_db_version`, `migrate()` using
`dbDelta()`, `maybe_upgrade()` hooked on `admin_init` from `Plugin::boot()`.
`Setup\Activator::activate()` calls `Schema::migrate()` first.

Tables (use `$wpdb->get_charset_collate()`):

```sql
CREATE TABLE {$wpdb->prefix}flexa_formflow_forms (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    title VARCHAR(190) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft | published
    config LONGTEXT NOT NULL,                      -- JSON, shape below
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY  (id),
    UNIQUE KEY uuid (uuid),
    KEY status (status)
);

CREATE TABLE {$wpdb->prefix}flexa_formflow_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    form_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread',  -- unread | read
    data LONGTEXT NOT NULL,                        -- JSON: field_id => value
    meta LONGTEXT NOT NULL,                        -- JSON: user_agent, referer
    created_at DATETIME NOT NULL,
    PRIMARY KEY  (id),
    KEY form_status (form_id, status),
    KEY created_at (created_at)
);
```

Privacy: do NOT store IP addresses. `meta` holds `user_agent` and `referer`
only.

Update `Maintenance\Eraser::erase_all()` to DROP both tables and delete the
db-version option. Update `uninstall.php` (standalone, direct `$wpdb`
queries) to drop both tables when `delete_data_on_uninstall` is on.

## Step 2 · Domain layer

`src/Domain/Forms/`:

- `Form.php`: value object, `public readonly` promoted props (`id`, `uuid`,
  `title`, `status`, `config` as `array`, `created_at`, `updated_at`),
  `from_row(array $row): self` (json_decode config with `[]` fallback),
  `to_array(): array` (JS-friendly).
- `FormRepository.php`: `use HasInstance`. Methods: `find( int $id ): ?Form`,
  `find_by_uuid( string $uuid ): ?Form`, `all( array $args ): array` (search
  by title, status filter, paged, orderby updated_at desc; returns
  `['items' => Form[], 'total' => int]`), `create( string $title, array
  $config ): int` (uuid via `wp_generate_uuid4()`), `update( int $id, array
  $fields ): bool`, `delete( int $id ): bool` (also deletes its entries),
  `duplicate( int $id ): int`, `count(): int`. All SQL `$wpdb->prepare()`;
  class-level scoped `// phpcs:disable WordPress.DB` with a why-comment.
- `FieldTypes.php`: the single registry both PHP validation and REST expose.
  Types: `text`, `email`, `textarea`, `select`, `radio`, `checkbox`,
  `number`, `date`, `hidden`. Per type: label, `has_options` (select, radio,
  checkbox), sanitizer. Sanitize map: text/hidden `sanitize_text_field`,
  email `sanitize_email` + `is_email` validation, textarea
  `sanitize_textarea_field`, number numeric check + float cast, date
  `Y-m-d` format check, select/radio whitelist against the field's options,
  checkbox array-of-whitelisted-options.

`src/Domain/Entries/`:

- `Entry.php`: value object (`id`, `form_id`, `status`, `data`, `meta`,
  `created_at`), `from_row`, `to_array`.
- `EntryRepository.php`: `find`, `all( array $args )` (filter form_id +
  status, paged, newest first, returns items + total), `create( int
  $form_id, array $data, array $meta ): int`, `set_status( int $id, string
  $status ): bool`, `delete( int $id ): bool`,
  `counts(): array` (total, unread, last_7_days) for the dashboard.

### Form `config` JSON shape (contract with the admin app)

```json
{
    "fields": [
        {
            "id": "f_x7k2m9",
            "type": "text",
            "label": "Your name",
            "required": true,
            "placeholder": "",
            "options": [],
            "width": "full"
        }
    ],
    "settings": {
        "submit_label": "Send",
        "success_message": "Thanks, we got your message."
    },
    "notifications": {
        "admin": {
            "enabled": true,
            "to": "",
            "subject": ""
        },
        "confirmation": {
            "enabled": false,
            "email_field": "",
            "subject": "",
            "message": ""
        }
    }
}
```

Field `id` is generated client-side (`f_` + 6 random chars), stable for the
field's lifetime, used as the key in entry `data`. `width` is `full` or
`half`. Empty `notifications.admin.to` means the site admin email; empty
subjects get sensible defaults at send time. Sanitize `config` server-side
on save: drop unknown field types and unknown keys, coerce booleans,
`sanitize_text_field` labels/options.

## Step 3 · REST endpoints

All extend `Api\Endpoint`, all registered in `Api\Router`.

- `FormsEndpoint` (`manage_permission`): `GET /forms` (args: `search`,
  `status`, `page`, `per_page` with sanitizers), `POST /forms` (title +
  optional config, returns the created form), `GET /forms/{id}`,
  `PUT /forms/{id}` (partial: title, status, config), `DELETE /forms/{id}`,
  `POST /forms/{id}/duplicate`.
- `EntriesEndpoint` (`manage_permission`): `GET /entries` (args: `form_id`,
  `status`, `page`, `per_page`), `GET /entries/{id}` (marks unread → read
  on fetch), `PUT /entries/{id}` (status only), `DELETE /entries/{id}`.
- `StatsEndpoint` (`manage_permission`): `GET /stats` returns
  `{ forms, entries, unread, entries_last_7_days }`.
- `SubmitEndpoint` (public): `POST /submit/{uuid}`,
  `permission_callback => '__return_true'`. Validation chain, in order:
  form exists and `status === 'published'`; honeypot field `ff_website`
  must be empty; `_ff_ts` render timestamp must be more than 3 seconds old;
  each field sanitized/validated via `FieldTypes` (missing required →
  per-field error map). On failure return `WP_Error` 400 with
  `{ errors: { field_id: message } }`. On success: `EntryRepository::create`,
  fire `do_action( 'flexa_formflow.entry.created', $entry_id, $form )`,
  return `{ message: success_message }`. Filter seam:
  `flexa_formflow.submission.validate` on the error map before deciding.

Router additions: `FormsEndpoint`, `EntriesEndpoint`, `StatsEndpoint`,
`SubmitEndpoint`.

## Step 4 · Frontend render

No React on the frontend; server-rendered form + small vanilla JS.

- `src/Frontend/Shortcode.php` (`use HasInstance`, `register()` from
  `Plugin::boot()`, outside the `is_admin()` branch): shortcode
  `[flexa_formflow id="123"]`. Renders `templates/form.php` with the Form;
  unpublished/missing form renders nothing (or an admin-only notice for
  logged-in managers). Enqueues assets only when rendering.
- `templates/form.php`: semantic markup, wrapper
  `.flexa-formflow-form[data-uuid]`, labels bound to inputs, required
  markers, honeypot `ff_website` (visually hidden, `autocomplete="off"`,
  `tabindex="-1"`), hidden `_ff_ts` with server timestamp, inline error
  slots, success region `aria-live="polite"`. All output escaped
  (`esc_html`, `esc_attr`).
- `assets/frontend/form.js` (plain ES module, no build): intercept submit,
  POST JSON to `{restUrl}flexa-formflow/v1/submit/{uuid}`, disable button
  while pending, render per-field errors or swap the form for the success
  message. Multi-instance safe (loop over all `.flexa-formflow-form`).
- `assets/frontend/form.css`: minimal neutral styles scoped under
  `.flexa-formflow-form`, brand color from Settings via inline CSS custom
  property `--ff-brand` on the wrapper.
- `src/Frontend/Block.php` + `assets/blocks/form/block.json` (apiVersion 3,
  dynamic): attribute `formId`; `render_callback` delegates to the
  shortcode renderer. Editor script `assets/blocks/form/editor.js` is plain
  JS (`wp.blocks`, `wp.serverSideRender`, `wp.components.SelectControl`
  fed by `GET /forms`), no build step. Editor preview is static
  server-side render, never submits.

## Step 5 · Notification emails (the M1 slice)

`src/Emails/Notifications.php` (`use HasInstance`): hooks
`flexa_formflow.entry.created`.

- Admin notification (when `notifications.admin.enabled`): to
  `to` or `get_option( 'admin_email' )`, subject default
  `[{site_name}] New submission: {form_title}`, HTML body: simple wrapper
  (600px table, brand-color header band from `Settings::get('brand_color')`,
  footer from `footer_text`) containing a two-column table of
  field label → submitted value (arrays joined with ", ";
  `esc_html` everything). Send via `wp_mail()` with
  `Content-Type: text/html`, so any SMTP/bridge plugin (flexa-mailbridge)
  handles delivery. No delivery UI in M1.
- Confirmation (when enabled and `email_field` points to a valid submitted
  email): subject + plain paragraph `message`, same HTML wrapper.
- Fire `do_action( 'flexa_formflow.notification.sent', $type, $entry_id )`
  after each send. Failures: `error_log` and continue, never block the
  submission response.

## Step 6 · Admin app

Re-add deps first: `pnpm add @dnd-kit/core @dnd-kit/sortable
@dnd-kit/utilities` in `apps/admin/`.

### Router upgrade (`main.tsx`)

Extend the hash router to support params: parse `#/forms/123/edit` and
`#/entries/45`. Keep it dependency-free: split on `/`, route table with
simple matchers. Builder route renders WITHOUT the sidebar (full-area
takeover per DESIGN.md Part 5.4); all other routes keep the shell.

### Screens

- **Forms list** (`features/forms/FormsListPage.tsx`): replaces the
  placeholder. Table rows: title, status pill, entries count, updated; row
  actions Edit / Duplicate / Delete (Dialog confirm). Header: search input
  + "Create Form" button (creates a draft via POST, navigates to builder).
  Keep the designed empty state for zero forms with the CTA wired to
  create. Query keys: `["forms", params]`.
- **Form builder** (`features/forms/builder/`): DESIGN.md Part 5.4 reduced
  to M1. Layout: top bar (back arrow, inline-editable title, autosave
  status dot "Saving… / Saved", publish Switch, Share button) · left
  palette (the 9 field types, click-to-add and draggable) · center canvas
  (dnd-kit sortable field cards, click selects, drag reorders, delete on
  card) · right inspector (bound to selection: label, required, placeholder,
  options editor for option types, width). Tabs under the top bar:
  **Build** · **Notifications** (admin toggle + to + subject; confirmation
  toggle + email-field Select + subject + message) · **Share** (copy
  shortcode snippet, block hint). Autosave: single debounced (800ms)
  mutation `PUT /forms/{id}` sending the whole `config` (the config is one
  document owned by one editor screen; partial-merge applies to Settings,
  not here). Zustand for builder UI state (selection), Query for the form
  document.
- **Entries** (`features/entries/`): list with form filter Select + status
  filter, unread rows bold, row click opens peek panel (right-side sheet
  built from Dialog primitives) showing the data table + "Open full view".
  Full view route `#/entries/{id}`: field table, meta (submitted date,
  referer), Delete with confirm. Fetching detail marks it read
  (server-side); invalidate `["entries"]` and `["stats"]`.
- **Dashboard**: wire the 4 stat cards to `GET /stats`
  (`["stats"]`); Quick actions stay. Recent activity card: latest 5
  entries (reuse `["entries", {per_page: 5}]`), each linking to detail.
- **Nav visibility**: add `const UPCOMING_ROUTES` gating in `main.tsx`;
  hide Emails, Workflows, Integrations entries and routes behind a
  `SHOW_UPCOMING = false` flag. Placeholder pages/files stay for later
  milestones, they are just unreachable. This is a WP.org gate (`ROADMAP.md`).

### Shared

- `features/forms/types.ts`: TS mirror of the `config` JSON shape and
  `FormSummary`/`FormDetail`/`EntryRow` interfaces. Field-type metadata
  array mirrors `FieldTypes.php` (keys, labels, icons via lucide,
  has_options).
- New primitives only if needed: a `Sheet` (side panel) can be composed
  from the existing Dialog primitive with side-slide classes; vendor
  nothing else. Every utility carries `ff:`. Mark every Input/Select with
  `.flexa-formflow-control`.

## Step 7 · Wiring + polish

- `Plugin::boot()`: register `Database\Schema::maybe_upgrade`, `Frontend\
  Shortcode`, `Frontend\Block`, `Emails\Notifications` (all outside
  `is_admin()`).
- `Admin\Enqueue`: nothing new needed (single admin bundle).
- Dashboard "Getting started" is NOT in M1; skip.

## Verification (run all, in order)

1. `find src -name '*.php' -exec php -l {} \;` and `php -l` on bootstrap +
   `uninstall.php`.
2. `composer install` (if vendor missing) then
   `vendor/bin/phpstan analyse --no-progress --memory-limit=1G` → must be
   `[OK] No errors`.
3. `cd apps/admin && pnpm install && pnpm type-check && pnpm build` → clean,
   manifest at `assets/dist/.vite/manifest.json`.
4. `./makepot.sh` → regenerated `i18n/languages/flexa-formflow.pot`.
5. Manual smoke test in wp-admin (host WP-CLI cannot reach the DB): re-run
   activation (deactivate + activate to trigger `Schema::migrate`), create
   a form with each field type, publish, drop the shortcode on a page,
   submit valid + invalid + honeypot-filled, confirm entry appears, unread
   badge clears on open, notification email fires (check with a mail
   logger), duplicate + delete a form, stats update.

## Definition of done

- A visitor can submit a published form and get inline validation errors or
  the success message.
- Every submission stores an entry and (when enabled) sends the admin
  notification and confirmation email.
- Forms and entries are fully manageable from the admin app; the builder
  autosaves; reordering and options editing work.
- Emails, Workflows, Integrations are invisible in the UI.
- phpstan L6, type-check, build, makepot all clean. Nothing committed until
  the user asks.
