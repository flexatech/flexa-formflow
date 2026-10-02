<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Emails\GlobalLayout;
use Flexa\FormFlow\Emails\LayoutParts;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\TreeSanitizer;
use PHPUnit\Framework\TestCase;

final class LayoutPartsTest extends TestCase {
	protected function setUp(): void {
		\WP_Test_State::reset();
		\WP_Test_State::$options[ GlobalLayout::OPTION_KEY ] = [
			'enabled' => true,
			'scope'   => 'all',
			'default' => 'main',
			'sets'    => [
				[
					'id'     => 'main',
					'name'   => 'Main',
					'header' => [ self::text( 'h1', 'MAIN HEADER' ) ],
					'footer' => [ self::text( 'f1', 'MAIN FOOTER' ) ],
				],
				[
					'id'     => 'alt',
					'name'   => 'Alt',
					'header' => [ self::text( 'h2', 'ALT HEADER' ) ],
					'footer' => [],
				],
			],
		];
		$this->reset_layout_cache();
	}

	private function reset_layout_cache(): void {
		$ref = new \ReflectionProperty( GlobalLayout::class, 'cache' );
		$ref->setValue( GlobalLayout::instance(), null );
	}

	/**
	 * @return array{id: string, type: string, props: array<string, mixed>}
	 */
	private static function text( string $id, string $text ): array {
		return [
			'id'    => $id,
			'type'  => 'text',
			'props' => [ 'html' => $text ],
		];
	}

	/**
	 * @param array<string, mixed> $settings
	 */
	private function parts( array $settings ): string {
		$parts = GlobalLayout::instance()->parts_for( [ 'settings' => $settings ], new RenderContext() );

		return json_encode( $parts ) ?: '';
	}

	public function test_modes(): void {
		$this->assertSame( 'global', LayoutParts::mode( [], 'header' ) );
		$this->assertSame( 'disabled', LayoutParts::mode( [ 'hideGlobalHeader' => true, 'headerOverride' => [] ], 'header' ) );
		$this->assertSame( 'override', LayoutParts::mode( [ 'footerOverride' => [] ], 'footer' ) );
		$this->assertSame( 'global', LayoutParts::mode( [ 'footerOverride' => [] ], 'header' ) );
	}

	public function test_global_mode_follows_the_set_by_reference(): void {
		$this->assertStringContainsString( 'MAIN HEADER', $this->parts( [] ) );

		// Editing the set changes every email that references it.
		\WP_Test_State::$options[ GlobalLayout::OPTION_KEY ]['sets'][0]['header'] = [ self::text( 'h1', 'EDITED' ) ];
		$this->reset_layout_cache();
		$this->assertStringContainsString( 'EDITED', $this->parts( [] ) );
	}

	public function test_override_is_a_snapshot_untouched_by_set_edits(): void {
		$settings = [ 'headerOverride' => [ self::text( 'o1', 'MY HEADER' ) ] ];
		\WP_Test_State::$options[ GlobalLayout::OPTION_KEY ]['sets'][0]['header'] = [ self::text( 'h1', 'EDITED' ) ];
		$this->reset_layout_cache();

		$parts = $this->parts( $settings );
		$this->assertStringContainsString( 'MY HEADER', $parts );
		$this->assertStringNotContainsString( 'EDITED', $parts );
		$this->assertStringContainsString( 'MAIN FOOTER', $parts, 'the footer still follows the set' );
	}

	public function test_disabled_part_renders_nothing(): void {
		$parts = $this->parts( [ 'hideGlobalFooter' => true ] );
		$this->assertStringContainsString( 'MAIN HEADER', $parts );
		$this->assertStringNotContainsString( 'MAIN FOOTER', $parts );
	}

	public function test_missing_set_falls_back_to_the_default_and_none_shows_only_overrides(): void {
		$this->assertStringContainsString( 'MAIN HEADER', $this->parts( [ 'layoutSet' => 'deleted-set' ] ) );
		$this->assertStringContainsString( 'ALT HEADER', $this->parts( [ 'layoutSet' => 'alt' ] ) );

		$none = $this->parts( [ 'layoutSet' => 'none', 'footerOverride' => [ self::text( 'o2', 'OWN FOOTER' ) ] ] );
		$this->assertStringNotContainsString( 'MAIN', $none );
		$this->assertStringContainsString( 'OWN FOOTER', $none );
	}

	public function test_layout_off_renders_no_parts_even_with_an_override(): void {
		\WP_Test_State::$options[ GlobalLayout::OPTION_KEY ]['enabled'] = false;
		$this->reset_layout_cache();
		$this->assertSame( '{"header":[],"footer":[]}', $this->parts( [ 'headerOverride' => [ self::text( 'o', 'X' ) ] ] ) );
	}

	public function test_sanitizer_keeps_overrides_and_old_trees_unchanged(): void {
		$tree = TreeSanitizer::sanitize(
			[
				'settings' => [
					'headerOverride' => [ [ 'id' => 'x', 'type' => 'text', 'props' => [ 'html' => '<script>a</script>Hi' ] ] ],
					'footerOverride' => [],
				],
				'elements' => [],
			]
		);
		$this->assertSame( 'Hi', $tree['settings']['headerOverride'][0]['props']['html'] );
		$this->assertSame( [], $tree['settings']['footerOverride'] );

		// A tree saved before 1.2 gains no new keys.
		$old = TreeSanitizer::sanitize( [ 'settings' => [ 'hideGlobalHeader' => true ], 'elements' => [] ] );
		$this->assertSame( [ 'hideGlobalHeader' => true ], $old['settings'] );
	}
}
