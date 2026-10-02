<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Emails\Patterns\Registry;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\TreeSanitizer;
use PHPUnit\Framework\TestCase;

/**
 * The editor canvas, the preview endpoint, Send test and the sent email all
 * come from Renderer::render_tree(). The canvas may only add markers (data-ff-*
 * attributes, tbody wrappers that group rows, hover titles) and its own
 * placeholders; strip those and the markup must be identical to the email.
 */
final class RenderParityTest extends TestCase {
	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	/**
	 * Remove editor-only markers: unwrap marked tbodies, drop data-ff-* and the
	 * hover titles, drop placeholder rows.
	 */
	private static function strip_editor( string $html ): string {
		$doc = new \DOMDocument();
		libxml_use_internal_errors( true );
		$doc->loadHTML( '<?xml encoding="utf-8"?>' . $html );
		libxml_clear_errors();
		$xpath = new \DOMXPath( $doc );

		foreach ( iterator_to_array( $xpath->query( '//*[@data-ff-placeholder]' ) ?: [] ) as $node ) {
			$node->parentNode?->removeChild( $node );
		}
		foreach ( iterator_to_array( $xpath->query( '//tbody[@data-ff-el or @data-ff-global]' ) ?: [] ) as $tbody ) {
			while ( $tbody->firstChild ) {
				$tbody->parentNode?->insertBefore( $tbody->firstChild, $tbody );
			}
			$tbody->parentNode?->removeChild( $tbody );
		}
		foreach ( iterator_to_array( $xpath->query( '//*[@*[starts-with(name(), "data-ff-")]]' ) ?: [] ) as $el ) {
			/** @var \DOMElement $el */
			foreach ( iterator_to_array( $el->attributes ) as $attr ) {
				if ( str_starts_with( $attr->name, 'data-ff-' ) || 'title' === $attr->name ) {
					$el->removeAttribute( $attr->name );
				}
			}
		}

		return (string) $doc->saveHTML();
	}

	private static function normalize( string $html ): string {
		// An empty Image block's placeholder box is the same in both; only its
		// label adds "Click to" in the editor, where a click opens the library.
		return str_replace( 'Click to choose an image', 'Choose an image', self::strip_editor( $html ) );
	}

	/**
	 * @param list<array<string, mixed>> $blocks
	 * @param array{header: list<array<string, mixed>>, footer: list<array<string, mixed>>} $layout
	 */
	private function assert_parity( array $blocks, array $layout = [ 'header' => [], 'footer' => [] ], string $label = '' ): void {
		$n   = 0;
		$tag = static function ( array $b ) use ( &$tag, &$n ): array {
			$b['id'] = 'b' . ( ++$n );
			if ( isset( $b['columns'] ) ) {
				$b['columns'] = array_map( static fn( array $c ): array => array_map( $tag, $c ), $b['columns'] );
			}
			return $b;
		};
		$tree = TreeSanitizer::sanitize( [ 'elements' => array_map( $tag, $blocks ) ] );

		$editor = Renderer::instance()->render_tree( $tree, new RenderContext( is_preview: true, editor: true ), $layout );
		$sent   = Renderer::instance()->render_tree( $tree, new RenderContext( is_preview: true ), $layout );

		// The editor really did add its markers; parity is not vacuous.
		$this->assertStringContainsString( 'data-ff-el=', $editor, $label );
		$this->assertStringNotContainsString( 'data-ff-', $sent, $label );
		$this->assertSame( self::normalize( $sent ), self::normalize( $editor ), $label );
	}

	public function test_every_pattern_renders_the_same_in_the_editor_and_the_email(): void {
		foreach ( Registry::all() as $pattern ) {
			if ( str_contains( (string) json_encode( $pattern['blocks'] ), '"columns":[[]' ) ) {
				continue; // An empty column shows a drop zone in the editor only.
			}
			$this->assert_parity( $pattern['blocks'], [ 'header' => [], 'footer' => [] ], $pattern['id'] );
		}
	}

	public function test_global_header_and_footer_render_the_same(): void {
		$header = Registry::find( 'header-logo-nav' );
		$footer = Registry::find( 'footer-dark' );
		$this->assertNotNull( $header );
		$this->assertNotNull( $footer );
		$this->assert_parity(
			[ [ 'type' => 'text', 'props' => [ 'html' => 'Body' ] ] ],
			[
				'header' => $header['blocks'],
				'footer' => $footer['blocks'],
			]
		);
	}

	public function test_logo_and_menu_share_a_vertically_centred_row(): void {
		$pattern = Registry::find( 'header-logo-nav' );
		$this->assertNotNull( $pattern );
		$tree = TreeSanitizer::sanitize( [ 'elements' => $pattern['blocks'] ] );
		$html = Renderer::instance()->render_tree( $tree, new RenderContext(), [ 'header' => [], 'footer' => [] ] );

		// Two cells in one row, both middle-aligned.
		$this->assertSame( 2, substr_count( $html, 'class="ff-col" valign="middle"' ) );
		// Even padding above and below in both, so their centres line up; no side
		// padding of their own inside Columns (the wrapper holds the 40px).
		$this->assertStringContainsString( 'padding:16px 0px 16px;', $html );
		$this->assertStringContainsString( 'padding:16px 0px;font-size:13px', $html );
		// Columns stack on narrow screens instead of overflowing.
		$this->assertStringContainsString( '.ff-col{display:block!important;width:100%!important;', $html );
	}

	public function test_logo_image_and_long_menu_render(): void {
		\WP_Test_State::$logo = 'https://example.test/logo.png';
		$pattern = Registry::find( 'header-logo-nav' );
		$this->assertNotNull( $pattern );
		$blocks                                   = $pattern['blocks'];
		$blocks[0]['columns'][1][0]['props']['items'] = array_map(
			static fn( int $i ): array => [ 'id' => 'n' . $i, 'label' => 'Section ' . $i, 'url' => '/s' . $i ],
			range( 1, 8 )
		);
		$this->assert_parity( $blocks );
		$html = Renderer::instance()->render_tree( TreeSanitizer::sanitize( [ 'elements' => $blocks ] ), new RenderContext(), [ 'header' => [], 'footer' => [] ] );
		$this->assertStringContainsString( '<img src="https://example.test/logo.png"', $html );
		$this->assertSame( 8, substr_count( $html, 'href="/s' ) );
	}
}
