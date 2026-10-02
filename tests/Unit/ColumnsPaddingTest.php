<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Emails\Patterns\Registry;
use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\TreeSanitizer;
use PHPUnit\Framework\TestCase;

/**
 * Side padding is held once: 40px on a top-level block, or on the Columns
 * wrapper with none on the blocks inside it, and the column gap only between
 * columns. So a header's logo and menu line up with the email's content.
 */
final class ColumnsPaddingTest extends TestCase {
	private const NO_LAYOUT = [
		'header' => [],
		'footer' => [],
	];

	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	/**
	 * @param list<array<string, mixed>> $elements
	 */
	private function render( array $elements, string $dir = 'ltr', bool $editor = false ): string {
		$n   = 0;
		$tag = static function ( array $b ) use ( &$tag, &$n ): array {
			$b['id'] ??= 'b' . ( ++$n );
			if ( isset( $b['columns'] ) ) {
				$b['columns'] = array_map( static fn( array $c ): array => array_map( $tag, $c ), $b['columns'] );
			}
			return $b;
		};
		$tree = TreeSanitizer::sanitize(
			[
				'settings' => [ 'direction' => $dir ],
				'elements' => array_map( $tag, $elements ),
			]
		);

		return Renderer::instance()->render_tree( $tree, new RenderContext( is_preview: true, editor: $editor ), self::NO_LAYOUT );
	}

	private static function xpath( string $html ): \DOMXPath {
		$doc = new \DOMDocument();
		libxml_use_internal_errors( true );
		$doc->loadHTML( '<?xml encoding="utf-8"?>' . $html );
		libxml_clear_errors();

		return new \DOMXPath( $doc );
	}

	/**
	 * [top, right, bottom, left] in px from an inline `padding:` shorthand.
	 *
	 * @return array{0: int, 1: int, 2: int, 3: int}
	 */
	private static function padding( \DOMElement $el ): array {
		$found = preg_match( '/(?:^|;)padding:([^;]+)/', $el->getAttribute( 'style' ), $m );
		self::assertSame( 1, $found, 'no padding on ' . $el->getAttribute( 'style' ) );
		$v = array_map( static fn( string $p ): int => (int) $p, preg_split( '/\s+/', trim( $m[1] ) ) ?: [] );

		return match ( count( $v ) ) {
			1 => [ $v[0], $v[0], $v[0], $v[0] ],
			2 => [ $v[0], $v[1], $v[0], $v[1] ],
			3 => [ $v[0], $v[1], $v[2], $v[1] ],
			default => [ $v[0], $v[1], $v[2], $v[3] ],
		};
	}

	/** The block cells at the email's top level. @return list<\DOMElement> */
	private static function top_cells( \DOMXPath $x ): array {
		$list = $x->query( '//table[contains(@class,"ff-container")]/tr/td | //table[contains(@class,"ff-container")]/tbody/tr/td' );

		return $list ? array_values( array_filter( iterator_to_array( $list ), static fn( $n ): bool => $n instanceof \DOMElement ) ) : [];
	}

	/** The column cells. @return list<\DOMElement> */
	private static function columns( \DOMXPath $x ): array {
		$list = $x->query( '//td[contains(concat(" ", @class, " "), " ff-col ")]' );

		return $list ? array_values( array_filter( iterator_to_array( $list ), static fn( $n ): bool => $n instanceof \DOMElement ) ) : [];
	}

	/** The block cells inside one column. @return list<\DOMElement> */
	private static function cells_in( \DOMXPath $x, \DOMElement $col ): array {
		$list = $x->query( './table/tr/td | ./table/tbody/tr/td', $col );

		return $list ? array_values( array_filter( iterator_to_array( $list ), static fn( $n ): bool => $n instanceof \DOMElement ) ) : [];
	}

	/**
	 * @param list<list<array<string, mixed>>> $columns
	 * @return array<string, mixed>
	 */
	private static function columns_block( array $columns, int $gap = 16 ): array {
		return [
			'type'    => 'columns',
			'props'   => [ 'gap' => $gap ],
			'columns' => $columns,
		];
	}

	/** @return array<string, array<string, mixed>> */
	private static function blocks(): array {
		return [
			'logo'        => [ 'type' => 'logo', 'props' => [] ],
			'navigation'  => [
				'type'  => 'navigation',
				'props' => [ 'items' => [ [ 'id' => 'h', 'label' => 'Home', 'url' => 'https://example.test' ] ] ],
			],
			'text'        => [ 'type' => 'text', 'props' => [ 'html' => 'Hello' ] ],
			'heading'     => [ 'type' => 'heading', 'props' => [ 'text' => 'Title' ] ],
			'image'       => [ 'type' => 'image', 'props' => [ 'url' => 'https://example.test/a.png' ] ],
			'button'      => [ 'type' => 'button', 'props' => [ 'text' => 'Go', 'url' => 'https://example.test' ] ],
			'social'      => [ 'type' => 'social', 'props' => [ 'facebook' => 'https://facebook.com/x' ] ],
			'divider'     => [ 'type' => 'divider', 'props' => [] ],
			'html'        => [ 'type' => 'html', 'props' => [ 'code' => '<p>x</p>' ] ],
			'footer_text' => [ 'type' => 'footer_text', 'props' => [ 'html' => 'Footer' ] ],
		];
	}

	public function test_top_level_blocks_keep_40px_side_padding(): void {
		foreach ( self::blocks() as $type => $block ) {
			$cells = self::top_cells( self::xpath( $this->render( [ $block ] ) ) );
			$this->assertCount( 1, $cells, $type );
			$p = self::padding( $cells[0] );
			$this->assertSame( [ 40, 40 ], [ $p[3], $p[1] ], $type . ' at the top level' );
		}
	}

	public function test_blocks_inside_columns_add_no_side_padding(): void {
		foreach ( self::blocks() as $type => $block ) {
			$x    = self::xpath( $this->render( [ self::columns_block( [ [ $block ], [ self::blocks()['text'] ] ] ) ] ) );
			$cols = self::columns( $x );
			$this->assertCount( 2, $cols, $type );
			$cells = self::cells_in( $x, $cols[0] );
			$this->assertCount( 1, $cells, $type );
			$p = self::padding( $cells[0] );
			$this->assertSame( [ 0, 0 ], [ $p[3], $p[1] ], $type . ' inside Columns' );
		}
	}

	public function test_the_columns_wrapper_keeps_the_40px_side_padding(): void {
		$x     = self::xpath( $this->render( [ self::columns_block( [ [ self::blocks()['logo'] ], [ self::blocks()['navigation'] ] ] ) ] ) );
		$cells = self::top_cells( $x );
		$this->assertCount( 1, $cells );
		$this->assertSame( [ 8, 40, 8, 40 ], self::padding( $cells[0] ) );
	}

	public function test_two_columns_put_the_gap_between_them_only(): void {
		$x    = self::xpath( $this->render( [ self::columns_block( [ [ self::blocks()['logo'] ], [ self::blocks()['navigation'] ] ], 16 ) ] ) );
		$cols = self::columns( $x );
		[ , $r0, , $l0 ] = self::padding( $cols[0] );
		[ , $r1, , $l1 ] = self::padding( $cols[1] );

		$this->assertSame( 0, $l0, 'first column, outer edge' );
		$this->assertSame( 0, $r1, 'last column, outer edge' );
		$this->assertSame( 16, $r0 + $l1, 'space between the columns equals the gap' );
		$this->assertSame( $r0 + $l0, $r1 + $l1, 'equal content widths' );
	}

	public function test_three_columns_keep_the_gap_and_equal_widths(): void {
		$cols = self::columns( self::xpath( $this->render( [ self::columns_block( [ [ self::blocks()['text'] ], [ self::blocks()['text'] ], [ self::blocks()['text'] ] ], 24 ) ] ) ) );
		$p    = array_map( [ self::class, 'padding' ], $cols );

		$this->assertSame( 0, $p[0][3] );
		$this->assertSame( 0, $p[2][1] );
		$this->assertSame( 24, $p[0][1] + $p[1][3] );
		$this->assertSame( 24, $p[1][1] + $p[2][3] );
		$this->assertSame( 16, $p[0][1] + $p[0][3] );
		$this->assertSame( 16, $p[1][1] + $p[1][3] );
		$this->assertSame( 16, $p[2][1] + $p[2][3] );
	}

	public function test_gap_split_holds_for_any_count_and_gap(): void {
		foreach ( range( 1, 4 ) as $count ) {
			foreach ( [ 0, 1, 7, 16, 25, 40 ] as $gap ) {
				$sides = array_map( static fn( int $i ): array => Renderer::column_gap( $i, $count, $gap ), range( 0, $count - 1 ) );
				$this->assertSame( 0, $sides[0][0], "count $count gap $gap: first start" );
				$this->assertSame( 0, $sides[ $count - 1 ][1], "count $count gap $gap: last end" );
				for ( $i = 0; $i < $count - 1; $i++ ) {
					$this->assertSame( $gap, $sides[ $i ][1] + $sides[ $i + 1 ][0], "count $count gap $gap: between $i and " . ( $i + 1 ) );
				}
				$totals = array_map( static fn( array $s ): int => $s[0] + $s[1], $sides );
				$this->assertLessThanOrEqual( 1, max( $totals ) - min( $totals ), "count $count gap $gap: widths" );
			}
		}
	}

	public function test_a_single_column_has_no_cell_padding(): void {
		$cols = self::columns( self::xpath( $this->render( [ self::columns_block( [ [ self::blocks()['text'] ] ], 16 ) ] ) ) );
		$this->assertCount( 1, $cols );
		$this->assertSame( [ 0, 0, 0, 0 ], self::padding( $cols[0] ) );
	}

	public function test_rtl_mirrors_the_gap(): void {
		$cols = self::columns( self::xpath( $this->render( [ self::columns_block( [ [ self::blocks()['logo'] ], [ self::blocks()['navigation'] ] ], 16 ) ], 'rtl' ) ) );
		// The first column sits on the right in RTL: its outer edge is the right one.
		[ , $r0, , $l0 ] = self::padding( $cols[0] );
		[ , $r1, , $l1 ] = self::padding( $cols[1] );
		$this->assertSame( 0, $r0 );
		$this->assertSame( 0, $l1 );
		$this->assertSame( 16, $l0 + $r1 );
	}

	public function test_blocks_after_columns_are_back_to_40px(): void {
		$x     = self::xpath( $this->render( [ self::columns_block( [ [ self::blocks()['text'] ], [ self::blocks()['text'] ] ] ), self::blocks()['heading'] ] ) );
		$cells = self::top_cells( $x );
		$this->assertCount( 2, $cells );
		$p = self::padding( $cells[1] );
		$this->assertSame( [ 40, 40 ], [ $p[3], $p[1] ] );
	}

	public function test_column_context_is_a_copy(): void {
		$ctx    = new RenderContext( type: 'confirmation', is_preview: true, extras: [ 'k' => 'v' ], editor: true );
		$column = $ctx->for_column();

		$this->assertNotSame( $ctx, $column );
		$this->assertFalse( $ctx->inside_column );
		$this->assertTrue( $column->inside_column );
		$this->assertSame( [ 'confirmation', true, true, 'v' ], [ $column->type, $column->is_preview, $column->editor, $column->extra( 'k' ) ] );
		$this->assertSame( $column, $column->for_column() );
	}

	public function test_author_side_padding_is_kept_but_never_doubled(): void {
		$element = new class() extends BaseElement {
			public function type(): string {
				return 'probe';
			}

			public function defaults(): array {
				return [];
			}

			public function render( array $props, RenderContext $ctx, array $design ): string {
				return '';
			}

			public function pad( RenderContext $ctx, int $value ): int {
				return $this->horizontal_padding( $ctx, $value );
			}
		};
		$top    = new RenderContext();
		$inside = $top->for_column();

		$this->assertSame( 60, $element->pad( $top, 60 ), 'top level: as set' );
		$this->assertSame( 20, $element->pad( $inside, 60 ), 'inside Columns: only beyond the wrapper' );
		$this->assertSame( 0, $element->pad( $inside, 40 ) );
		$this->assertSame( 0, $element->pad( $inside, 10 ) );
	}

	public function test_a_colored_band_in_a_column_keeps_its_text_off_the_edge(): void {
		$tinted = self::blocks()['text'];
		$tinted['props']['background'] = '#eef6ff';
		$x     = self::xpath( $this->render( [ self::columns_block( [ [ self::blocks()['text'] ], [ $tinted ] ] ) ] ) );
		$band  = $x->query( '//td[@bgcolor="#eef6ff"]' );
		$this->assertSame( 1, $band ? $band->length : 0 );
		$cell = $band->item( 0 );
		$this->assertTrue( $cell instanceof \DOMElement );
		$p = self::padding( $cell );
		$this->assertSame( [ 16, 16 ], [ $p[3], $p[1] ], 'card inset inside a column' );

		// At the top level a band stays edge to edge; its block keeps 40px.
		$top  = self::xpath( $this->render( [ $tinted ] ) )->query( '//td[@bgcolor="#eef6ff"]' );
		$cell = $top ? $top->item( 0 ) : null;
		$this->assertTrue( $cell instanceof \DOMElement );
		$this->assertSame( [ 0, 0, 0, 0 ], self::padding( $cell ) );
	}

	public function test_editor_and_email_have_the_same_spacing(): void {
		$pattern = Registry::find( 'header-logo-nav' );
		$this->assertNotNull( $pattern );
		$blocks = array_merge( $pattern['blocks'], [ self::blocks()['text'] ] );

		$styles = function ( bool $editor ) use ( $blocks ): array {
			$list = self::xpath( $this->render( $blocks, 'ltr', $editor ) )->query( '//td[not(@data-ff-placeholder)]' );
			$out  = [];
			foreach ( $list ?: [] as $td ) {
				if ( $td instanceof \DOMElement ) {
					$out[] = $td->getAttribute( 'style' );
				}
			}
			return $out;
		};
		$this->assertSame( $styles( false ), $styles( true ) );
	}

	public function test_stacked_columns_on_phones_drop_the_gap(): void {
		$html = $this->render( [ self::columns_block( [ [ self::blocks()['logo'] ], [ self::blocks()['navigation'] ] ] ) ] );
		// Stacked, a column spans the wrapper's content box: the wrapper's 40px is
		// the only side inset, and the blocks inside add none (checked above).
		$this->assertStringContainsString( '.ff-col{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important}', $html );
		$this->assertStringNotContainsString( '.ff-col td', $html );
	}

	public function test_emails_without_columns_render_as_before(): void {
		$fixture = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/Fixtures/legacy-no-columns.json' ), true );
		$this->assertTrue( is_array( $fixture ) );

		foreach ( $fixture['bodies'] as $key => $expected ) {
			[ $dir, $kind ] = explode( '-', (string) $key );
			$html           = Renderer::instance()->render_tree(
				[
					'settings' => [ 'direction' => $dir ],
					'elements' => $fixture['elements'],
				],
				new RenderContext( is_preview: true, editor: 'editor' === $kind ),
				self::NO_LAYOUT
			);
			$this->assertSame( $expected, substr( $html, (int) strpos( $html, '<body' ) ), (string) $key );
		}
	}
}
