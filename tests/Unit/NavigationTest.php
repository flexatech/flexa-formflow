<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use PHPUnit\Framework\TestCase;

final class NavigationTest extends TestCase {
	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	/**
	 * @param list<array<string, string>> $items
	 * @param array<string, mixed>        $props
	 */
	private function render( array $items, array $props = [], bool $preview = false ): string {
		$tree = [
			'settings' => [],
			'elements' => [ [ 'id' => 'n', 'type' => 'navigation', 'props' => array_merge( [ 'items' => $items ], $props ) ] ],
		];

		return Renderer::instance()->render_tree( $tree, new RenderContext( is_preview: $preview ), [ 'header' => [], 'footer' => [] ] );
	}

	public function test_renders_each_item_as_an_email_safe_anchor(): void {
		$html = $this->render(
			[
				[ 'id' => 'a', 'label' => 'Home', 'url' => '{site_url}' ],
				[ 'id' => 'b', 'label' => 'Help', 'url' => 'mailto:help@example.test', 'target' => '_blank' ],
			],
			[ 'align' => 'right', 'separator' => 'pipe', 'gap' => 20, 'color' => '#ff0000' ]
		);
		$this->assertStringContainsString( '<a href="https://example.test"', $html );
		$this->assertStringContainsString( 'href="mailto:help@example.test" target="_blank" rel="noopener"', $html );
		$this->assertStringContainsString( 'align="right"', $html );
		$this->assertStringContainsString( 'padding:0 10px', $html );
		$this->assertStringContainsString( 'color:#ff0000', $html );
		$this->assertStringContainsString( '>|</span>', $html );
	}

	public function test_labels_are_escaped_and_unsafe_urls_dropped(): void {
		$html = $this->render(
			[
				[ 'id' => 'a', 'label' => '<b>Shop</b> & "more"', 'url' => 'https://example.test/?a=1&b=2' ],
				[ 'id' => 'b', 'label' => 'Evil', 'url' => 'javascript:alert(1)' ],
				[ 'id' => 'c', 'label' => '', 'url' => 'https://example.test' ],
				[ 'id' => 'd', 'label' => 'Bad" onmouseover="x', 'url' => 'https://example.test/" onclick="x' ],
			]
		);
		$this->assertStringContainsString( '&lt;b&gt;Shop&lt;/b&gt; &amp; &quot;more&quot;', $html );
		$this->assertStringContainsString( 'a=1&amp;b=2', $html );
		$this->assertStringNotContainsString( 'javascript', $html );
		$this->assertStringNotContainsString( 'Evil', $html );
		$this->assertStringNotContainsString( '" onclick="', $html );
		$this->assertStringNotContainsString( '" onmouseover="', $html );
	}

	public function test_invalid_color_and_separator_fall_back(): void {
		$html = $this->render( [ [ 'id' => 'a', 'label' => 'A', 'url' => 'https://x.test' ] ], [ 'color' => 'red;x', 'separator' => '<script>' ] );
		$this->assertStringNotContainsString( 'red;x', $html );
		$this->assertStringNotContainsString( '<script>', $html );
	}

	public function test_empty_menu_shows_a_hint_only_in_preview(): void {
		$this->assertStringContainsString( 'Add links', $this->render( [], [], true ) );
		$this->assertStringNotContainsString( 'Add links', $this->render( [] ) );
	}
}
