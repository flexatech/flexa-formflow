# Flexa FormFlow

Form builder + visual email builder for WordPress. Add a field to a form and it
becomes a token you can drop into the notification email, so the message people
receive matches the data they sent. Runs on any WordPress site; WooCommerce is
not required.

- Public repository: https://github.com/flexatech/flexa-formflow
- Distribution readme (WordPress.org): [`readme.txt`](readme.txt)

## Requirements

| Tool | Version |
| --- | --- |
| PHP | 8.1+ |
| WordPress | 6.2+ |
| Node | 20+ |
| pnpm | 9+ |

The admin interface is a React + TypeScript app compiled with Vite. Its source
lives in `apps/admin/src/` and compiles to `assets/dist/`. PHP has no runtime
Composer dependencies (the bootstrap ships a fallback autoloader); Composer is
dev-only, for the static-analysis toolchain.

## Build from source

```bash
pnpm install      # install the admin app dependencies (pnpm is enforced)
pnpm build        # type-check, then build the production bundle to assets/dist/
```

`pnpm build` runs `tsc --noEmit` against `apps/admin/tsconfig.json` and then
`vite build`. The output, including `assets/dist/.vite/manifest.json`, is what
`src/Enqueue.php` reads to resolve the hashed bundle at runtime. A checkout with
`assets/dist/` present runs in WordPress without a build step.

## Develop

```bash
pnpm dev          # Vite dev server with HMR for the admin app
pnpm type-check   # tsc --noEmit only
pnpm format       # prettier over apps/**/*.{ts,tsx,css}
```

## Package a release

```bash
./release.sh
```

`release.sh` reads `Version:` from `flexa-formflow.php`, runs `pnpm install
--frozen-lockfile && pnpm build`, stages a copy with the `.distignore` patterns
applied, and writes `build/flexa-formflow-<version>.zip` with `flexa-formflow`
as the top-level folder. The zip is the only artifact a WordPress.org SVN tag
should be built from; never copy the working tree directly.

Regenerate translations after changing UI strings:

```bash
./makepot.sh      # WP-CLI make-pot + the TSX string extraction
```

## Static analysis

```bash
vendor/bin/phpstan analyse --no-progress --memory-limit=1G
vendor/bin/phpcs --standard=phpcs.xml.dist
```

Before a WordPress.org submission, also run the official
[Plugin Check](https://wordpress.org/plugins/plugin-check/) (`wp plugin check
flexa-formflow`, or the Plugin Check admin screen) and confirm a clean run.

## Layout

```
flexa-formflow.php        Plugin header + bootstrap
uninstall.php             Optional data teardown (opt-in only)
readme.txt                WordPress.org distribution readme
src/                      PHP: Api, Domain, Database, Emails, Support, Frontend
templates/                Frontend PHP templates (form render)
apps/admin/src/           React + TypeScript admin app (source)
assets/dist/              Compiled admin bundle (build output)
i18n/languages/           .pot and translations
docs/                     Internal design, roadmap, and build plans
```

## License

GPL v2 or later. See the header in `flexa-formflow.php`.
