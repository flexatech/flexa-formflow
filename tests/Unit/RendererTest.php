<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use PHPUnit\Framework\TestCase;

final class RendererTest extends TestCase {
	private const NO_LAYOUT = [
		'header' => [],
		'footer' => [],
	];

	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	/**
	 * @param array<string, mixed> $props
	 */
	private function render( string $type, array $props ): string {
		$tree = [
			'settings' => [],
			'elements' => [
				[
					'id'    => 'a',
					'type'  => $type,
					'props' => $props,
				],
			],
		];

		return Renderer::instance()->render_tree( $tree, new RenderContext(), self::NO_LAYOUT );
	}

	public function test_section_background_wraps_the_block_for_every_client(): void {
		$html = $this->render( 'text', [ 'html' => 'Hello', 'background' => '#14213a' ] );
		$this->assertStringContainsString( 'bgcolor="#14213a"', $html );
		$this->assertStringContainsString( 'background-color:#14213a', $html );
	}

	public function test_consecutive_blocks_of_one_band_share_a_single_cell(): void {
		$tree = [
			'settings' => [],
			'elements' => [
				[ 'id' => 'a', 'type' => 'heading', 'props' => [ 'text' => 'A', 'background' => '#14213a' ] ],
				[ 'id' => 'b', 'type' => 'text', 'props' => [ 'html' => 'B', 'background' => '#14213a' ] ],
				[ 'id' => 'c', 'type' => 'text', 'props' => [ 'html' => 'C' ] ],
				[ 'id' => 'd', 'type' => 'text', 'props' => [ 'html' => 'D', 'background' => '#14213a' ] ],
			],
		];
		$sent = Renderer::instance()->render_tree( $tree, new RenderContext(), self::NO_LAYOUT );
		$this->assertSame( 2, substr_count( $sent, 'bgcolor="#14213a"' ), 'A+B form one band, D another' );

		// The editor canvas shows the same bands, with each block still marked.
		$editor = Renderer::instance()->render_tree( $tree, new RenderContext( is_preview: true, editor: true ), self::NO_LAYOUT );
		$this->assertSame( 2, substr_count( $editor, 'bgcolor="#14213a"' ) );
		$this->assertSame( 4, substr_count( $editor, 'data-ff-el=' ) );
	}

	public function test_no_or_invalid_background_leaves_output_unchanged(): void {
		$plain   = $this->render( 'text', [ 'html' => 'Hello' ] );
		$invalid = $this->render( 'text', [ 'html' => 'Hello', 'background' => 'red;position:fixed' ] );
		$this->assertSame( $plain, $invalid );
		$this->assertStringNotContainsString( '<tr><td bgcolor=', $plain );
	}

	public function test_logo_without_a_site_logo_falls_back_to_the_site_name(): void {
		$html = $this->render( 'logo', [ 'image' => '{site_logo_url}', 'color' => '#ffffff' ] );
		$this->assertStringContainsString( 'Acme &amp; Co', $html );
		$this->assertStringContainsString( 'color:#ffffff', $html );
		$this->assertStringNotContainsString( '<img', $html );

		\WP_Test_State::$logo = 'https://example.test/logo.png';
		$this->assertStringContainsString( '<img src="https://example.test/logo.png"', $this->render( 'logo', [ 'image' => '{site_logo_url}' ] ) );
	}

	public function test_rich_text_never_renders_a_raw_token_in_a_real_send(): void {
		$html = $this->render( 'heading', [ 'text' => 'Hello {not_a_token}' ] );
		$this->assertStringNotContainsString( '{not_a_token}', $html );
	}

	public function test_global_parts_wrap_the_content(): void {
		$tree = [
			'settings' => [],
			'elements' => [ [ 'id' => 'body', 'type' => 'text', 'props' => [ 'html' => 'BODY' ] ] ],
		];
		$html = Renderer::instance()->render_tree(
			$tree,
			new RenderContext(),
			[
				'header' => [ [ 'type' => 'text', 'props' => [ 'html' => 'HEAD' ] ] ],
				'footer' => [ [ 'type' => 'text', 'props' => [ 'html' => 'FOOT' ] ] ],
			]
		);
		$this->assertSame( 1, preg_match( '/HEAD.*BODY.*FOOT/s', $html ) );
	}
}
