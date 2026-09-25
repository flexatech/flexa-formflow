# Flexa FormFlow: Implementation Plan

Design spec: `DESIGN.md` (plugin root). Release milestones and the WP.org
launch gate: `docs/ROADMAP.md`. Architecture and naming mirror `flexa-mail` (new-generation Flexa scaffold). Substitution vocabulary is locked in project memory; the short version: namespace `Flexa\FormFlow\`, constants `FLEXA_FORMFLOW_*`, hooks `flexa_formflow.*` (dot-separated), REST `flexa-formflow/v1`, Tailwind prefix `ff`, mount `#flexa-formflow-admin-root`.

## Status

- [x] Phase 0: Scaffold. Bootstrap, Plugin, Api\Router + Endpoint, Settings (schema + partial-merge save), Onboarding state + endpoint, ActivationRedirect, Eraser, uninstall, Menu + Enqueue, admin shell (sidebar, dashboard, empty states, working Settings page), tooling (phpstan L6 clean, phpcs config, makepot, release.sh, .distignore).
- [x] Phase 1: Forms domain. Custom tables via `Database\Schema`, Forms list, dnd-kit form builder (palette/canvas/inspector, autosave), shortcode + block render, public submit endpoint (honeypot + time trap).
- [x] Phase 2: Entries. Storage, list + peek panel, entry detail. (Activity timeline arrives with workflows.)
- Phases 1 + 2 plus the notification-email slice of Phase 3 shipped together as milestone M1 (build plan: `docs/M1_PLAN.md`). Static checks green; the manual wp-admin smoke test from M1_PLAN step 5 is still pending.
- [ ] Phase 3: Emails. Builder (port the flexa-mail editor as the starting point), field tokens, template library, Global Styles backed by `Support\Settings`.
- [ ] Phase 4: WooCommerce email takeover. Port flexa-mail's `Emails\Interceptor`, `Render`, `Conditions`, `Placeholders`; Emails → WooCommerce tab; flexa-mail template importer + deactivation handover (DESIGN.md Part 8.2).
- [ ] Phase 5: Workflows. Vertical node canvas, trigger/action/logic nodes, test run.
- [ ] Phase 6: Delivery bridge surfaces. Detect flexa-mailbridge (or other SMTP plugin); Settings delivery card, timeline engagement rows, Flow Rail delivery segment (DESIGN.md Part 8.1). Health only, never duplicate bridge settings.
- [ ] Phase 7: AI (form generation + writing assistant, port flexa-mail's `Support\Encryption` + AiEndpoint), onboarding wizard, integrations.

## Known toolchain notes

- phpstan needs `--memory-limit=1G`; `assets/dist (?)` stays optional in phpstan.neon.
- phpcs carries the deliberate lineage style (slash-free dot hooks, short arrays, minimal docblocks); reconcile codebase-wide before a release tag, not per file.
- WP-CLI from the host cannot reach this Local site's MySQL; activate and smoke-test through wp-admin or Local's site shell.
- Woo email work must gate on `class_exists( \WooCommerce::class )` at feature level; the plugin itself must keep working without WooCommerce.
