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

## [1.0.0]

First release, prepared for the WordPress.org directory.

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
