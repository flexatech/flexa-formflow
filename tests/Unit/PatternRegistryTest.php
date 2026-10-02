<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Emails\Patterns\Registry;
use Flexa\FormFlow\Emails\Tokens;
use PHPUnit\Framework\TestCase;

final class PatternRegistryTest extends TestCase {
	private const TARGET = [ 'header', 'intro', 'banner', 'cta', 'gallery', 'social', 'divider', 'shipping', 'order', 'offer', 'footer' ];

	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	/**
	 * Every pattern including the WooCommerce-only ones (the registry hides
	 * those on a site without WooCommerce).
	 *
	 * @return list<array<string, mixed>>
	 */
	private function all_patterns(): array {
		$patterns = [];
		foreach ( glob( dirname( __DIR__, 2 ) . '/src/Emails/Patterns/Library/*.php' ) ?: [] as $file ) {
			$class    = 'Flexa\\FormFlow\\Emails\\Patterns\\Library\\' . basename( $file, '.php' );
			$patterns = array_merge( $patterns, array_map( [ Registry::class, 'normalize' ], $class::all() ) );
		}

		return array_values( array_filter( $patterns ) );
	}

	public function test_each_target_category_has_five_to_seven_patterns(): void {
		$counts = array_count_values( array_column( $this->all_patterns(), 'category' ) );
		foreach ( self::TARGET as $category ) {
			$this->assertArrayHasKey( $category, $counts, $category );
			$this->assertGreaterThanOrEqual( 5, $counts[ $category ], $category );
			$this->assertLessThanOrEqual( 7, $counts[ $category ], $category );
		}
	}

	public function test_ids_are_unique_and_stable_slugs(): void {
		$ids = array_column( $this->all_patterns(), 'id' );
		$this->assertCount( count( $ids ), array_unique( $ids ) );
		foreach ( $ids as $id ) {
			$this->assertSame( 1, preg_match( '/^[a-z0-9-]+$/', $id ), $id );
		}
	}

	public function test_patterns_within_a_category_differ_in_structure(): void {
		$shapes = [];
		foreach ( $this->all_patterns() as $pattern ) {
			$shape = json_encode( self::shape( $pattern['blocks'] ) );
			$key   = $pattern['category'] . '|' . $shape;
			$this->assertArrayHasKey( 'id', $pattern );
			$this->assertFalse( isset( $shapes[ $key ] ), $pattern['id'] . ' repeats the structure of ' . ( $shapes[ $key ] ?? '' ) );
			$shapes[ $key ] = $pattern['id'];
		}
	}

	/**
	 * Block types plus the props that change the layout (not just colors/text).
	 *
	 * @param list<array<string, mixed>> $blocks
	 * @return list<mixed>
	 */
	private static function shape( array $blocks ): array {
		return array_map(
			static fn( array $b ): array => [
				$b['type'],
				$b['props']['align'] ?? '',
				isset( $b['props']['background'] ),
				isset( $b['columns'] ) ? array_map( [ self::class, 'shape' ], $b['columns'] ) : null,
			],
			$blocks
		);
	}

	public function test_region_contexts_per_category(): void {
		foreach ( $this->all_patterns() as $pattern ) {
			$expected = match ( $pattern['category'] ) {
				'header' => [ 'email', 'global-header' ],
				'footer' => [ 'email', 'global-footer' ],
				default  => [ 'email', 'global-header', 'global-footer' ],
			};
			$this->assertSame( $expected, $pattern['contexts'], $pattern['id'] );
		}
	}

	public function test_global_header_offers_everything_but_footers_and_vice_versa(): void {
		$header = array_unique( array_column( Registry::for_context( 'global-header' ), 'category' ) );
		$footer = array_unique( array_column( Registry::for_context( 'global-footer' ), 'category' ) );
		$this->assertNotContains( 'footer', $header );
		$this->assertNotContains( 'header', $footer );
		foreach ( [ 'intro', 'banner', 'cta', 'gallery', 'offer', 'social', 'divider' ] as $content ) {
			$this->assertContains( $content, $header, $content );
			$this->assertContains( $content, $footer, $content );
		}
		$this->assertContains( 'header', $header );
		$this->assertContains( 'footer', $footer );
	}

	public function test_legacy_patterns_without_contexts_get_a_safe_fallback(): void {
		$block = [ [ 'type' => 'text' ] ];
		$this->assertSame( [ 'email', 'global-header' ], Registry::normalize( [ 'id' => 'a', 'name' => 'A', 'category' => 'Header', 'blocks' => $block ] )['contexts'] ?? null );
		$this->assertSame( [ 'email', 'global-footer' ], Registry::normalize( [ 'id' => 'b', 'name' => 'B', 'category' => 'footer', 'blocks' => $block ] )['contexts'] ?? null );
		// Email content is not assumed to fit a global region.
		$this->assertSame( [ 'email' ], Registry::normalize( [ 'id' => 'c', 'name' => 'C', 'category' => 'banner', 'blocks' => $block ] )['contexts'] ?? null );
	}

	public function test_menus_are_structured_navigation_blocks(): void {
		foreach ( [ 'header-logo-nav', 'header-dark', 'footer-links' ] as $id ) {
			$json = (string) json_encode( Registry::find( $id ) );
			$this->assertStringContainsString( '"type":"navigation"', $json, $id );
			$this->assertStringNotContainsString( '&nbsp;', $json, $id );
		}
	}

	public function test_no_pattern_hard_codes_the_plugin_brand(): void {
		$json = (string) json_encode( $this->all_patterns() );
		$this->assertStringNotContainsString( 'Flexa', $json );
		$this->assertStringNotContainsString( 'http://', $json );
		$this->assertStringNotContainsString( 'https://', $json, 'no hotlinked images or fixed URLs' );
	}

	public function test_header_logos_use_the_site_logo_token(): void {
		foreach ( $this->all_patterns() as $pattern ) {
			array_walk_recursive(
				$pattern['blocks'],
				function ( $value, $key ) use ( $pattern ): void {
					if ( 'image' === $key && is_string( $value ) && '' !== $value ) {
						$this->assertSame( '{site_logo_url}', $value, $pattern['id'] );
					}
				}
			);
		}
	}

	public function test_patterns_only_use_registered_merge_tags(): void {
		$known = array_map( static fn( array $m ): string => $m['token'], Tokens::catalog() );
		$woo   = [ '{order_number}', '{order_date}', '{order_total}', '{order_url}', '{payment_method}', '{shipping_method}', '{order_subtotal}', '{order_discount}', '{order_shipping_total}', '{order_tax_total}', '{billing_address}', '{shipping_address}', '{shop_url}' ];
		foreach ( $this->all_patterns() as $pattern ) {
			preg_match_all( '/\{[a-z0-9_:]+\}/', (string) json_encode( $pattern['blocks'] ), $m );
			foreach ( array_unique( $m[0] ) as $token ) {
				$allowed = 'woocommerce' === $pattern['requires'] ? array_merge( $known, $woo ) : $known;
				$this->assertContains( $token, $allowed, $pattern['id'] . ' uses ' . $token );
			}
		}
	}

	public function test_woocommerce_patterns_are_hidden_without_woocommerce(): void {
		$ids = array_column( Registry::all(), 'id' );
		$this->assertNotContains( 'order-summary', $ids );
		$this->assertNotContains( 'shipping-status', $ids );
		$this->assertContains( 'header-logo', $ids );
	}

	public function test_normalize_upgrades_a_pre_1_2_pattern(): void {
		$pattern = Registry::normalize(
			[
				'id'       => 'addon-hero',
				'name'     => 'Add-on hero',
				'category' => 'Banner',
				'blocks'   => [
					[
						'type'  => 'heading',
						'props' => [ 'text' => 'Hi' ],
					],
				],
			]
		);
		$this->assertNotNull( $pattern );
		$this->assertSame( 'banner', $pattern['category'] );
		$this->assertSame( [ 'email' ], $pattern['contexts'] );
		$this->assertSame( 1, $pattern['version'] );
		$this->assertSame( 'free', $pattern['tier'] );
	}

	public function test_normalize_drops_unusable_entries_and_nested_columns(): void {
		$this->assertNull( Registry::normalize( [ 'id' => 'x', 'name' => 'X', 'blocks' => [] ] ) );
		$this->assertNull( Registry::normalize( [ 'name' => 'X', 'blocks' => [ [ 'type' => 'text' ] ] ] ) );

		$pattern = Registry::normalize(
			[
				'id'       => 'cols',
				'name'     => 'Cols',
				'category' => 'cta',
				'contexts' => [ 'email', 'bogus' ],
				'tier'     => 'pro',
				'blocks'   => [
					[
						'type'    => 'columns',
						'columns' => [ [ [ 'type' => 'columns' ], [ 'type' => 'text' ] ] ],
					],
				],
			]
		);
		$this->assertNotNull( $pattern );
		$this->assertSame( [ 'email' ], $pattern['contexts'] );
		$this->assertSame( 'pro', $pattern['tier'] );
		$this->assertCount( 1, $pattern['blocks'][0]['columns'][0], 'a column cannot hold columns' );
	}

	public function test_filter_added_patterns_are_normalized_and_deduplicated(): void {
		add_filter(
			'flexa_formflow.emails.patterns',
			static fn( array $list ): array => array_merge(
				$list,
				[
					[ 'id' => 'header-logo', 'name' => 'Duplicate', 'blocks' => [ [ 'type' => 'text' ] ] ],
					[ 'id' => 'broken' ],
				]
			)
		);
		$all = Registry::all();
		$ids = array_column( $all, 'id' );
		$this->assertCount( count( $ids ), array_unique( $ids ) );
		$this->assertNotContains( 'broken', $ids );
		$this->assertSame( 'Centered logo', Registry::find( 'header-logo' )['name'] ?? '' );
	}
}
