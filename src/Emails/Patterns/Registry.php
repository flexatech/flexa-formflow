<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns;

use Flexa\FormFlow\Emails\Patterns\Library\BannerPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\CtaPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\DividerPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\FooterPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\GalleryPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\HeaderPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\IntroPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\OfferPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\OrderPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\ShippingPatterns;
use Flexa\FormFlow\Emails\Patterns\Library\SocialPatterns;

defined( 'ABSPATH' ) || exit;

/**
 * The email pattern library: ready-made groups of ordinary email blocks, kept
 * as versioned, typed data (never HTML). Inserting a pattern copies its blocks
 * into the email, so a later change to a pattern here never touches an email
 * that already used it.
 *
 * Every pattern, built-in or added through `flexa_formflow.emails.patterns`,
 * passes {@see normalize()}: a malformed one is dropped instead of reaching the
 * editor, and an older shape (no contexts, a translated category label) is
 * upgraded in place.
 *
 * @phpstan-type Pattern array{id: string, version: int, name: string, description: string, category: string, keywords: list<string>, contexts: list<string>, tier: string, requires: string, blocks: list<array<string, mixed>>}
 */
final class Registry {
	/** Bump when the pattern shape changes; {@see normalize()} migrates older entries. */
	public const SCHEMA_VERSION = 1;

	public const CONTEXTS = [ 'email', 'global-header', 'global-footer' ];

	/**
	 * Where a built-in pattern of each kind may be used. Header patterns belong
	 * at the top (an email or the global header), footer patterns at the bottom;
	 * everything else is content that fits an email or either global region.
	 */
	public const REGION_CONTEXTS = [
		'header' => [ 'email', 'global-header' ],
		'footer' => [ 'email', 'global-footer' ],
	];

	public const CONTENT_CONTEXTS = [ 'email', 'global-header', 'global-footer' ];

	private const TIERS = [ 'free', 'pro' ];

	/** Integrations a pattern can depend on. */
	private const REQUIREMENTS = [ '', 'woocommerce' ];

	/**
	 * Category keys in display order, with their labels. Keys are stable ids;
	 * only labels are translated.
	 *
	 * @return array<string, string>
	 */
	public static function categories(): array {
		$categories = [
			'header'   => __( 'Header', 'flexa-formflow' ),
			'intro'    => __( 'Intro', 'flexa-formflow' ),
			'banner'   => __( 'Banner', 'flexa-formflow' ),
			'cta'      => __( 'Call to action', 'flexa-formflow' ),
			'gallery'  => __( 'Gallery', 'flexa-formflow' ),
			'social'   => __( 'Social', 'flexa-formflow' ),
			'divider'  => __( 'Divider & spacing', 'flexa-formflow' ),
			'order'    => __( 'Order', 'flexa-formflow' ),
			'shipping' => __( 'Shipping', 'flexa-formflow' ),
			'offer'    => __( 'Offer', 'flexa-formflow' ),
			'footer'   => __( 'Footer', 'flexa-formflow' ),
		];

		/**
		 * Add or relabel pattern categories. Keys are stable ids.
		 *
		 * @param array<string, string> $categories
		 */
		$filtered = apply_filters( 'flexa_formflow.emails.pattern_categories', $categories );

		return is_array( $filtered ) ? array_filter( $filtered, 'is_string' ) : $categories;
	}

	/**
	 * Every valid pattern this site can show. Patterns that need an integration
	 * the site lacks (WooCommerce order blocks on a plain WordPress site) are left
	 * out rather than offered broken.
	 *
	 * @return list<Pattern>
	 */
	public static function all(): array {
		$builtin = array_merge(
			HeaderPatterns::all(),
			IntroPatterns::all(),
			BannerPatterns::all(),
			CtaPatterns::all(),
			GalleryPatterns::all(),
			SocialPatterns::all(),
			DividerPatterns::all(),
			OrderPatterns::all(),
			ShippingPatterns::all(),
			OfferPatterns::all(),
			FooterPatterns::all()
		);

		/**
		 * Register more email patterns (add-on sections, pack content). Each
		 * entry is `{id, name, category, blocks}` plus optional `version`,
		 * `description`, `keywords`, `contexts`, `tier` and `requires`. A
		 * `columns` block carries a `columns` list of block lists.
		 *
		 * @param list<array<string, mixed>> $patterns
		 */
		$raw = apply_filters( 'flexa_formflow.emails.patterns', $builtin );

		$patterns = [];
		$seen     = [];
		foreach ( is_array( $raw ) ? $raw : [] as $entry ) {
			$pattern = is_array( $entry ) ? self::normalize( $entry ) : null;
			if ( null === $pattern || isset( $seen[ $pattern['id'] ] ) || ! self::requirement_met( $pattern['requires'] ) ) {
				continue;
			}
			$seen[ $pattern['id'] ] = true;
			$patterns[]             = $pattern;
		}

		return $patterns;
	}

	/**
	 * Patterns offered in one editing context: the one filter every caller uses
	 * (the editor's Patterns tab, the global header/footer editor, thumbnails).
	 *
	 * @return list<Pattern>
	 */
	public static function for_context( string $context ): array {
		return array_values( array_filter( self::all(), static fn( array $p ): bool => self::allows( $p, $context ) ) );
	}

	/**
	 * @param Pattern $pattern
	 */
	public static function allows( array $pattern, string $context ): bool {
		return in_array( $context, $pattern['contexts'], true );
	}

	/**
	 * @return Pattern|null
	 */
	public static function find( string $id ): ?array {
		foreach ( self::all() as $pattern ) {
			if ( $pattern['id'] === $id ) {
				return $pattern;
			}
		}

		return null;
	}

	/**
	 * Whether a Pro pattern can be inserted. Free shows Pro patterns with a lock.
	 *
	 * No pattern bundled with this plugin is Pro. Every built-in entry is declared
	 * through self::define(), which hardcodes `tier => 'free'`, so nothing that
	 * ships here is ever locked and there is no feature to unlock. The tier exists
	 * for patterns a separately installed add-on registers through
	 * `flexa_formflow.emails.patterns`; that add-on also answers this filter.
	 */
	public static function pro_active(): bool {
		return (bool) apply_filters( 'flexa_formflow.pro_active', false );
	}

	/**
	 * Coerce one raw entry to the current pattern shape, or null when it cannot
	 * be used (no id, no name, no blocks).
	 *
	 * @param array<string, mixed> $raw
	 * @return Pattern|null
	 */
	public static function normalize( array $raw ): ?array {
		$id     = isset( $raw['id'] ) && is_string( $raw['id'] ) ? sanitize_key( $raw['id'] ) : '';
		$name   = isset( $raw['name'] ) && is_string( $raw['name'] ) ? sanitize_text_field( $raw['name'] ) : '';
		$blocks = isset( $raw['blocks'] ) && is_array( $raw['blocks'] ) ? self::blocks( $raw['blocks'], true ) : [];
		if ( '' === $id || '' === $name || [] === $blocks ) {
			return null;
		}

		$category = self::category_key( $raw['category'] ?? '' );
		$contexts = isset( $raw['contexts'] ) && is_array( $raw['contexts'] )
			? array_values( array_intersect( self::CONTEXTS, $raw['contexts'] ) )
			: [];
		if ( [] === $contexts ) {
			// Older entries named no contexts. A header or footer may also serve
			// its global region; anything else stays email-only, since content
			// built for an email body is not automatically fit for every email.
			$contexts = self::REGION_CONTEXTS[ $category ] ?? [ 'email' ];
		}
		$keywords = isset( $raw['keywords'] ) && is_array( $raw['keywords'] )
			? array_values( array_filter( array_map( static fn( $k ): string => is_string( $k ) ? sanitize_text_field( $k ) : '', $raw['keywords'] ) ) )
			: [];
		$tier     = isset( $raw['tier'] ) && in_array( $raw['tier'], self::TIERS, true ) ? (string) $raw['tier'] : 'free';
		$requires = isset( $raw['requires'] ) && in_array( $raw['requires'], self::REQUIREMENTS, true ) ? (string) $raw['requires'] : '';

		return [
			'id'          => $id,
			'version'     => isset( $raw['version'] ) && is_numeric( $raw['version'] ) ? max( 1, (int) $raw['version'] ) : 1,
			'name'        => $name,
			'description' => isset( $raw['description'] ) && is_string( $raw['description'] ) ? sanitize_text_field( $raw['description'] ) : '',
			'category'    => $category,
			'keywords'    => $keywords,
			'contexts'    => $contexts,
			'tier'        => $tier,
			'requires'    => $requires,
			'blocks'      => $blocks,
		];
	}

	/**
	 * Pre-1.2 patterns named their category with a translated label ("Header");
	 * map a label back to its key, and anything unknown to a slug of itself.
	 */
	private static function category_key( mixed $category ): string {
		if ( ! is_string( $category ) || '' === $category ) {
			return 'other';
		}
		$categories = self::categories();
		if ( isset( $categories[ $category ] ) ) {
			return $category;
		}
		$key = array_search( $category, $categories, true );
		if ( is_string( $key ) ) {
			return $key;
		}
		$slug = sanitize_key( $category );

		return '' !== $slug ? $slug : 'other';
	}

	private static function requirement_met( string $requires ): bool {
		return 'woocommerce' !== $requires || class_exists( \WooCommerce::class );
	}

	/**
	 * Keep only `{type, props, columns?}`; column children cannot hold columns.
	 *
	 * @param array<int|string, mixed> $raw
	 * @return list<array<string, mixed>>
	 */
	private static function blocks( array $raw, bool $allow_columns ): array {
		$out = [];
		foreach ( $raw as $block ) {
			if ( ! is_array( $block ) || ! isset( $block['type'] ) || ! is_string( $block['type'] ) || '' === sanitize_key( $block['type'] ) ) {
				continue;
			}
			$type = sanitize_key( $block['type'] );
			if ( 'columns' === $type && ! $allow_columns ) {
				continue;
			}
			$clean = [
				'type'  => $type,
				'props' => isset( $block['props'] ) && is_array( $block['props'] ) ? $block['props'] : [],
			];
			if ( 'columns' === $type ) {
				$columns = isset( $block['columns'] ) && is_array( $block['columns'] ) ? array_values( $block['columns'] ) : [];
				$clean['columns'] = array_map(
					fn( $col ): array => is_array( $col ) ? self::blocks( $col, false ) : [],
					array_slice( $columns, 0, 4 )
				);
			}
			$out[] = $clean;
		}

		return $out;
	}

	/**
	 * Shorthand the library classes use to declare a pattern.
	 *
	 * @param list<string>               $keywords
	 * @param list<array<string, mixed>> $blocks
	 * @param list<string>|null          $contexts Null: the category's default (see REGION_CONTEXTS).
	 * @return array<string, mixed>
	 */
	public static function define( string $id, string $category, string $name, string $description, array $keywords, array $blocks, ?array $contexts = null, string $requires = '' ): array {
		return [
			'id'          => $id,
			'version'     => 1,
			'name'        => $name,
			'description' => $description,
			'category'    => $category,
			'keywords'    => $keywords,
			'contexts'    => $contexts ?? self::REGION_CONTEXTS[ $category ] ?? self::CONTENT_CONTEXTS,
			'tier'        => 'free',
			'requires'    => $requires,
			'blocks'      => $blocks,
		];
	}
}
