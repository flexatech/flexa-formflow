# Flexa FormFlow: Free Roadmap and WP.org Launch Plan

Companion to `IMPLEMENTATION_PLAN.md` (build phases) and `DESIGN.md` (spec).
This file answers two questions: what ships in Free, and at which point the
plugin is ready to submit to WordPress.org.

## Free scope (from DESIGN.md Part 5.23)

Free is a complete product, not a demo:

- Unlimited forms, form builder, frontend render + submissions
- Entries with detail view and activity timeline
- Visual email builder with field tokens, template library, Global Styles
- WooCommerce email takeover (the flexa-mail replacement; free so existing
  flexa-mail users can migrate without paying)
- Basic workflow: linear trigger → actions, no branching
- Core integrations: webhooks, delivery-bridge health surfaces

Pro (separate plugin, absent from the Free zip): conditional logic in emails
and workflows, branches, delays, PDF attachments, CRM integrations,
repeater/signature fields, saved snippets. AI features land with Pro
consideration in Phase 7.

## Milestones

Each milestone maps to phases in `IMPLEMENTATION_PLAN.md` and ends in a
tagged, releasable state.

### M1 · "A form plugin that works" (0.5.0) — Phases 1 + 2 + email slice

The minimum version that is honestly useful and passes WP.org review.
Detailed, decision-complete build plan: `docs/M1_PLAN.md` (written so a
fresh session can build all of M1 in one run).

- Phase 1: form storage, form builder (re-add `@dnd-kit`), field types
  (text, email, textarea, select, radio, checkbox, number, date, hidden),
  frontend render (shortcode + block), submit endpoint with validation,
  honeypot, nonce
- Phase 2: entries storage, list with peek panel, entry detail
- Email slice (pulled forward from Phase 3): fixed-template notification
  email (all submitted fields as a table) to the admin, optional
  confirmation email to the submitter, sent through `wp_mail()` so any
  SMTP/bridge plugin picks it up
- Remove or hide the placeholder screens for Workflows and Integrations
  (reviewers and users must not see advertised-but-empty sections)

### M2 · "The email builder" (0.9.0) — Phase 3

The identity feature. FORM → EMAIL becomes visual.

- Block-based email builder ported from flexa-mail's editor
- Field tokens (insert form data visually, no shortcodes)
- Template library, Global Styles backed by `Support\Settings`
- Live preview with sample entry data, test send

### M3 · WP.org launch (1.0.0) — hardening, no new features

- Full `wp-plugin-review` audit: sanitize/escape/nonce/capability pass,
  uninstall behavior, prefix hygiene
- readme.txt finalized, screenshots + banner assets, "Tested up to" current
- Regenerate `.pot`; phpcs codebase-wide reconciliation
- Build zip with `release.sh`, verify `.distignore` output (no `*.md`,
  no vendor, `apps/admin/src` included as human-readable source)
- Submit to WordPress.org

### M4 · WooCommerce takeover (1.1) — Phase 4

- Port flexa-mail's Interceptor, Render, Conditions, Placeholders
- Emails → WooCommerce tab, per-email takeover toggles
- flexa-mail template importer + deactivation handover
- Gated on `class_exists( \WooCommerce::class )` at feature level

### M5 · Workflows, basic (1.2) — Phase 5 Free slice

- Vertical canvas, trigger + linear action chain, test run
- Pro nodes (condition, branch, delay) appear as explorable demos per
  DESIGN.md Part 5.23

### M6 · Integrations + bridge surfaces (1.3) — Phase 6

- Webhook action, integrations directory screen
- Delivery-bridge detection (flexa-mailbridge or other SMTP plugins),
  Settings delivery card, timeline delivery rows

### Later — Phase 7

- Onboarding wizard, AI form generation and writing assistant (needs
  `Support\Encryption` port), CRM/marketing integrations move to Pro

## When can it go on WP.org?

**Earliest allowed: end of M1.** WP.org review checks guideline compliance
(security, GPL, no trialware, readable source), not feature count. A working
form builder with entries and notification emails clears that bar. What
would fail review or invite rejection before M1: placeholder screens
advertising features that do not exist, and any unaudited input handling.

**Recommended: submit at M3, right after M2 is done.** Reasons:

1. The email builder is the reason this plugin exists. First impressions on
   the directory (screenshots, early reviews) are permanent; launching as
   "yet another form plugin" wastes the one launch you get.
2. The review queue takes weeks. Submit the M3 zip, keep building M4 while
   waiting; by approval, 1.1 (Woo takeover) is close, which is the update
   that brings flexa-mail users over.
3. M1 exists as an internal quality gate either way: if the schedule
   demands an early submission, the M1 zip (with placeholders hidden) is
   the fallback, and the builder ships as an update after approval.

## Pre-submission checklist (M3 gate)

- [x] No placeholder/"coming soon" screens in the shipped UI (audited: Workflows/Integrations gated behind `SHOW_UPCOMING = false`)
- [x] Every REST route: real `permission_callback` + per-arg sanitization (audited: 9/9 routes; public submit justified by honeypot + time-trap)
- [x] All output escaped; all frontend submits nonce-protected (audited: templates + email render escape all dynamic output; `wp_rest` nonce localized)
- [x] `uninstall.php` respects the delete-data toggle (audited: off by default, drops the three tables + options only on opt-in)
- [x] readme.txt: description, FAQ, screenshots, changelog, Stable tag (rewritten for the real 1.0.0 scope; Installation + Screenshots sections added)
- [ ] Assets for the directory: banner 1544x500, icon 256x256, screenshots (PNG files must be produced by hand; readme screenshot captions are in place)
- [x] `.pot` regenerated; all UI strings extractable (literals only)
- [x] phpstan L6 clean; phpcs reconciled once codebase-wide (25 DB false positives scoped with `phpcs:disable` + reason; `$_SERVER` unslashed; cosmetic fixes applied)
- [x] `release.sh` zip inspected: only runtime files plus `readme.txt` and
      `apps/admin/src` (build/flexa-formflow-1.0.0.zip verified: no `*.md`/vendor/docs leaks; all runtime files present)
- [ ] Fresh-install smoke test from the zip on a clean WP site, with and
      without WooCommerce active (manual; still pending, together with the M2 editor smoke test)
