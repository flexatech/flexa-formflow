<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\WooCommerce\Catalog;

defined( 'ABSPATH' ) || exit;

/**
 * The global email header and footer: named sets of a header and a footer block
 * list, wrapped around every email the renderer produces so a brand banner or
 * legal footer is edited in one place instead of copied into each template.
 *
 * It is opt-in and applies to either every email FormFlow renders or only the
 * WooCommerce ones (`scope`). One set is the default; a template picks another
 * with `layoutSet` (or `none`) and can hide either part with `hideGlobalHeader`
 * / `hideGlobalFooter` in its design settings. Stored as one option, like the
 * other small site-wide records, so it never appears in the template list.
 *
 * @phpstan-type Set array{id: string, name: string, header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
 * @phpstan-type Layout array{enabled: bool, scope: string, default: string, sets: list<Set>, header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
 */
final class GlobalLayout {
	use HasInstance;
	use LayoutSetOperations;

	public const OPTION_KEY = 'flexa_formflow_email_layout';

	/** Which emails the layout wraps. */
	public const SCOPES = [ 'all', 'woocommerce' ];

	/** Id of the set every site starts with (and where a pre-sets layout is migrated to). */
	public const DEFAULT_SET = 'default';

	/**
	 * `header` / `footer` mirror the default set for callers that only care about it.
	 *
	 * @var Layout|null
	 */
	private ?array $cache = null;

	/**
	 * @return Layout
	 */
	public function get(): array {
		if ( null !== $this->cache ) {
			return $this->cache;
		}

		$stored = get_option( self::OPTION_KEY, [] );
		$stored = is_array( $stored ) ? $stored : [];
		$scope  = $stored['scope'] ?? '';
		$sets   = $this->stored_sets( $stored );
		$ids    = array_column( $sets, 'id' );

		$this->cache = $this->shape(
			[
				'enabled' => ! empty( $stored['enabled'] ),
				'scope'   => in_array( $scope, self::SCOPES, true ) ? (string) $scope : 'all',
				'default' => isset( $stored['default'] ) && in_array( $stored['default'], $ids, true ) ? (string) $stored['default'] : (string) $ids[0],
				'sets'    => $sets,
			]
		);

		return $this->cache;
	}

	/**
	 * Partial update of the switch, scope and default set. `header` / `footer`
	 * edit the default set, as they did before there were several.
	 *
	 * @param array<string, mixed> $fields
	 * @return Layout
	 */
	public function save( array $fields ): array {
		$next = $this->get();

		if ( array_key_exists( 'enabled', $fields ) ) {
			$next['enabled'] = (bool) $fields['enabled'];
		}
		if ( isset( $fields['scope'] ) && in_array( $fields['scope'], self::SCOPES, true ) ) {
			$next['scope'] = (string) $fields['scope'];
		}
		if ( isset( $fields['default'] ) && is_string( $fields['default'] ) && null !== $this->find_set( $fields['default'] ) ) {
			$next['default'] = $fields['default'];
		}
		foreach ( [ 'header', 'footer' ] as $part ) {
			if ( isset( $fields[ $part ] ) && is_array( $fields[ $part ] ) ) {
				foreach ( $next['sets'] as $i => $set ) {
					if ( $set['id'] === $next['default'] ) {
						$next['sets'][ $i ][ $part ] = self::clean( $fields[ $part ] );
					}
				}
			}
		}

		return $this->persist( $next );
	}

	/**
	 * The set a template uses: its own pick, else the default. Null when it
	 * chose `none`.
	 *
	 * @param array<string, mixed> $settings A template tree's `settings`.
	 * @return Set|null
	 */
	public function set_for( array $settings ): ?array {
		$pick = isset( $settings['layoutSet'] ) && is_string( $settings['layoutSet'] ) ? $settings['layoutSet'] : '';
		if ( 'none' === $pick ) {
			return null;
		}

		return ( '' !== $pick ? $this->find_set( $pick ) : null ) ?? $this->find_set( $this->get()['default'] );
	}

	public function is_enabled(): bool {
		return $this->get()['enabled'];
	}

	/**
	 * Whether the layout wraps this email. WooCommerce emails are recognised by
	 * their context (an order, the live WC_Email, or a known Woo email id); every
	 * other render is a form email.
	 */
	public function applies_to( RenderContext $ctx ): bool {
		$is_woo = null !== $ctx->order || null !== $ctx->email || Catalog::exists( $ctx->type );

		return $this->applies_to_kind( $is_woo ? 'woo' : 'form' );
	}

	/**
	 * @param 'woo'|'form' $kind
	 */
	public function applies_to_kind( string $kind ): bool {
		$layout = $this->get();

		return $layout['enabled'] && ( 'all' === $layout['scope'] || 'woo' === $kind );
	}

	/**
	 * The header and footer blocks to wrap this email in: empty when the layout
	 * is off or out of scope, otherwise each part as its mode says (see
	 * {@see LayoutParts}).
	 *
	 * @param array<string, mixed> $tree
	 * @return array{header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
	 */
	public function parts_for( array $tree, RenderContext $ctx ): array {
		if ( ! $this->applies_to( $ctx ) ) {
			return [
				'header' => [],
				'footer' => [],
			];
		}

		$settings = isset( $tree['settings'] ) && is_array( $tree['settings'] ) ? $tree['settings'] : [];

		return [
			'header' => LayoutParts::nodes( $settings, 'header' ),
			'footer' => LayoutParts::nodes( $settings, 'footer' ),
		];
	}

	/**
	 * Whether the default set already supplies a block type in one part, so a
	 * starter template can leave its own copy out instead of doubling it (two
	 * logos, two footers).
	 *
	 * @param 'header'|'footer' $part
	 * @param 'woo'|'form'      $kind
	 */
	public function owns( string $part, string $block_type, string $kind ): bool {
		if ( ! $this->applies_to_kind( $kind ) ) {
			return false;
		}

		return self::has_type( $this->get()[ $part ], $block_type );
	}

	/**
	 * @param list<array<string, mixed>> $nodes
	 */
	public static function has_type( array $nodes, string $type ): bool {
		foreach ( $nodes as $node ) {
			if ( ( $node['type'] ?? '' ) === $type ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Sets from the stored option, or the one a layout saved before there were
	 * several holds (its header and footer become the default set).
	 *
	 * @param array<string, mixed> $stored
	 * @return non-empty-list<Set>
	 */
	private function stored_sets( array $stored ): array {
		$sets = [];
		foreach ( is_array( $stored['sets'] ?? null ) ? $stored['sets'] : [] as $raw ) {
			if ( is_array( $raw ) && isset( $raw['id'] ) && is_string( $raw['id'] ) && '' !== $raw['id'] ) {
				$sets[] = [
					'id'     => $raw['id'],
					'name'   => self::name( is_string( $raw['name'] ?? null ) ? $raw['name'] : '' ),
					'header' => is_array( $raw['header'] ?? null ) ? self::nodes( $raw['header'] ) : [],
					'footer' => is_array( $raw['footer'] ?? null ) ? self::nodes( $raw['footer'] ) : [],
				];
			}
		}
		if ( [] !== $sets ) {
			return $sets;
		}

		$starter = LayoutPresets::build( 'classic' );

		return [
			[
				'id'     => self::DEFAULT_SET,
				'name'   => __( 'Main', 'flexa-formflow' ),
				'header' => isset( $stored['header'] ) && is_array( $stored['header'] ) ? self::nodes( $stored['header'] ) : $starter['header'],
				'footer' => isset( $stored['footer'] ) && is_array( $stored['footer'] ) ? self::nodes( $stored['footer'] ) : $starter['footer'],
			],
		];
	}

	/**
	 * Store the layout (without the mirrored header/footer) and refresh the cache.
	 *
	 * @param Layout $layout
	 * @return Layout
	 */
	private function persist( array $layout ): array {
		update_option(
			self::OPTION_KEY,
			[
				'enabled' => $layout['enabled'],
				'scope'   => $layout['scope'],
				'default' => $layout['default'],
				'sets'    => $layout['sets'],
			]
		);

		$this->cache = $this->shape( $layout );

		return $this->cache;
	}

	/**
	 * @param array<string, mixed> $layout Everything but the mirrored header/footer.
	 * @return Layout
	 */
	private function shape( array $layout ): array {
		$default = $layout['sets'][0];
		foreach ( $layout['sets'] as $set ) {
			if ( $set['id'] === $layout['default'] ) {
				$default = $set;
			}
		}

		return [
			'enabled' => $layout['enabled'],
			'scope'   => $layout['scope'],
			'default' => $layout['default'],
			'sets'    => $layout['sets'],
			'header'  => $default['header'],
			'footer'  => $default['footer'],
		];
	}

	/**
	 * @param array<int|string, mixed> $raw
	 * @return list<array<string, mixed>>
	 */
	private static function clean( array $raw ): array {
		return TreeSanitizer::sanitize( [ 'elements' => $raw ] )['elements'];
	}

	/**
	 * @param array<int|string, mixed> $raw
	 * @return list<array<string, mixed>>
	 */
	private static function nodes( array $raw ): array {
		return array_values( array_filter( $raw, 'is_array' ) );
	}

	private static function name( string $name ): string {
		$name = trim( sanitize_text_field( $name ) );

		return '' !== $name ? mb_substr( $name, 0, 60 ) : __( 'Untitled set', 'flexa-formflow' );
	}
}
