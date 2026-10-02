<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\GlobalLayout;
use Flexa\FormFlow\Emails\LayoutShadow;
use Flexa\FormFlow\Support\Css;
use Flexa\FormFlow\Support\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Walks an element tree and produces the complete email HTML document:
 * table-based layout, inline styles, one small <style> block for the mobile
 * media query (the only thing that cannot be inlined).
 */
final class Renderer {
	use HasInstance;

	/** Side inset of a colored band inside a column (its blocks have no side padding there). */
	private const CARD_INSET_X = 16;

	/**
	 * The template's blocks wrapped in the global header and footer. `$layout`
	 * overrides which header/footer blocks to use (the layout editor previews an
	 * unsaved draft); by default they come from {@see GlobalLayout}, which
	 * already accounts for scope and a template's opt-out.
	 *
	 * @param array<string, mixed> $tree
	 * @param array{header: list<array<string, mixed>>, footer: list<array<string, mixed>>}|null $layout
	 */
	public function render_tree( array $tree, RenderContext $ctx, ?array $layout = null ): string {
		$design   = $this->design_tokens( $tree );
		$elements = isset( $tree['elements'] ) && is_array( $tree['elements'] ) ? $tree['elements'] : [];
		$parts    = $layout ?? GlobalLayout::instance()->parts_for( $tree, $ctx );

		$rows = $this->render_global( 'header', $parts['header'], $ctx, $design )
			. $this->render_elements( $elements, $ctx, $design, true, LayoutShadow::ids( $elements, $parts ) )
			. $this->render_global( 'footer', $parts['footer'], $ctx, $design );

		return $this->document( $rows, $design );
	}

	/**
	 * Render one part of the global layout. In the editor preview it sits in its
	 * own marked <tbody> instead of the per-block ones, so the canvas shows it
	 * but can neither select nor drop into it.
	 *
	 * @param 'header'|'footer'         $part
	 * @param list<array<string, mixed>> $nodes
	 * @param array<string, string|int> $design
	 */
	private function render_global( string $part, array $nodes, RenderContext $ctx, array $design ): string {
		$html = $this->render_elements( $nodes, $ctx, $design, false );
		if ( '' === $html || ! $ctx->editor ) {
			return $html;
		}

		$title = 'header' === $part
			? __( 'Global header. Edit it under Emails > Global header & footer.', 'flexa-formflow' )
			: __( 'Global footer. Edit it under Emails > Global header & footer.', 'flexa-formflow' );

		return '<tbody data-ff-global="' . esc_attr( $part ) . '" title="' . esc_attr( $title ) . '">' . $html . '</tbody>';
	}

	/**
	 * Render a list of nodes into table rows. Used for the top level and, one
	 * level down, for each column of a layout block. `$mark` is off for the
	 * global header/footer, which the canvas must not treat as editable blocks.
	 *
	 * `$shadowed` lists ids of the template's own blocks the global layout
	 * replaces: dropped from delivered mail, shown dimmed in the editor preview.
	 *
	 * @param array<int, mixed> $nodes
	 * @param array<string, string|int> $design
	 * @param list<string> $shadowed
	 */
	private function render_elements( array $nodes, RenderContext $ctx, array $design, bool $mark = true, array $shadowed = [] ): string {
		$registry = ElementRegistry::instance();
		$out      = '';
		// Consecutive blocks with the same section background share one colored
		// cell, so a band has no seams between its blocks in any client.
		$band    = '';
		$band_bg = '';

		foreach ( $nodes as $node ) {
			if ( ! is_array( $node ) || ! isset( $node['type'] ) || ! is_string( $node['type'] ) ) {
				continue;
			}

			$is_shadowed = isset( $node['id'] ) && in_array( $node['id'], $shadowed, true );
			if ( $is_shadowed && ! $ctx->editor ) {
				continue;
			}

			// Conditional visibility. Core is condition-agnostic; the WooCommerce
			// takeover hooks this filter to hide nodes whose conditions the order
			// fails. Preview always shows everything (handled by the evaluator).
			if ( ! (bool) apply_filters( 'flexa_formflow.emails.node_visible', true, $node, $ctx ) ) {
				continue;
			}

			if ( 'columns' === $node['type'] ) {
				$html = $this->render_columns( $node, $ctx, $design, $mark );
			} else {
				$element = $registry->get( $node['type'] );
				if ( null === $element ) {
					continue;
				}
				$props = isset( $node['props'] ) && is_array( $node['props'] ) ? $node['props'] : [];
				$html  = $element->render( $element->merge_props( $props ), $ctx, $design );
			}

			$bg = self::background( $node );

			// In the editor preview only, wrap each block in an identifiable
			// tbody so the drag-and-drop canvas can measure block boundaries. A
			// tbody only groups rows: it adds no box, so the editor shows exactly
			// the markup that is sent (see RenderParityTest).
			if ( $mark && $ctx->editor && isset( $node['id'] ) && is_string( $node['id'] ) ) {
				$note = $is_shadowed ? ' data-ff-shadowed="1" title="' . esc_attr__( 'Replaced by the global header/footer while it is on.', 'flexa-formflow' ) . '"' : '';
				$html = '<tbody data-ff-el="' . esc_attr( $node['id'] ) . '"' . $note . '>' . $html . '</tbody>';
			}

			if ( $bg !== $band_bg ) {
				$out    .= $this->with_background( $band, $band_bg, $ctx );
				$band    = '';
				$band_bg = $bg;
			}
			$band .= $html;
		}

		return $out . $this->with_background( $band, $band_bg, $ctx );
	}

	/**
	 * A block's optional section background (`props.background`): a hex color,
	 * or '' for none or an invalid value.
	 *
	 * @param array<string, mixed> $node
	 */
	private static function background( array $node ): string {
		$props = isset( $node['props'] ) && is_array( $node['props'] ) ? $node['props'] : [];

		return Css::hex_color( $props['background'] ?? '', '' );
	}

	/**
	 * Paint a section background behind rows. They sit in a nested full-width
	 * table inside one colored cell: `bgcolor` for Outlook, the inline style for
	 * everyone else. Without a color the rows are returned untouched, so emails
	 * saved before the prop existed render byte-identically.
	 *
	 * At the top level the band spans the email edge to edge and its blocks keep
	 * their own 40px side padding. Inside a column the blocks have none, so the
	 * band is a card and holds a small inset itself: text never touches its edge.
	 */
	private function with_background( string $html, string $color, RenderContext $ctx ): string {
		if ( '' === $color || '' === $html ) {
			return $html;
		}
		$color = esc_attr( $color );
		// The canvas finds a band's blocks through this marker; it is an
		// attribute only, never a style.
		$mark    = $ctx->editor ? ' data-ff-band="1"' : '';
		$padding = $ctx->inside_column ? '0 ' . self::CARD_INSET_X . 'px' : '0';

		return '<tr' . $mark . '><td bgcolor="' . $color . '" style="padding:' . $padding . ';background-color:' . $color . ';">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $html . '</table>'
			. '</td></tr>';
	}

	/**
	 * Render a layout block: a single row split into equal-width columns that
	 * stack on mobile (the `.ff-col` media query in {@see document()}).
	 *
	 * @param array<string, mixed> $node
	 * @param array<string, string|int> $design
	 */
	private function render_columns( array $node, RenderContext $ctx, array $design, bool $mark = true ): string {
		$columns = isset( $node['columns'] ) && is_array( $node['columns'] ) ? array_values( $node['columns'] ) : [];
		$count   = max( 1, count( $columns ) );
		$props   = isset( $node['props'] ) && is_array( $node['props'] ) ? $node['props'] : [];
		$gap     = isset( $props['gap'] ) && is_numeric( $props['gap'] ) ? max( 0, min( 40, (int) $props['gap'] ) ) : 16;
		$valigns = isset( $props['valign'] ) && is_array( $props['valign'] ) ? array_values( $props['valign'] ) : [];
		$id      = isset( $node['id'] ) && is_string( $node['id'] ) ? $node['id'] : '';
		$pct     = (int) floor( 100 / $count );
		$rtl     = 'rtl' === ( $design['direction'] ?? 'ltr' );
		// The blocks inside sit flush with the cell: the wrapper below holds the
		// email's side padding once, the gap only separates the columns.
		$inner_ctx = $ctx->for_column();

		$cells = '';
		foreach ( $columns as $i => $col ) {
			$children = is_array( $col ) ? $col : [];
			$inner    = $this->render_elements( $children, $inner_ctx, $design, $mark );
			$valign   = isset( $valigns[ $i ] ) && in_array( $valigns[ $i ], [ 'top', 'middle', 'bottom' ], true ) ? $valigns[ $i ] : 'top';

			// Editor preview: give an empty column a visible drop area.
			if ( '' === $inner && $ctx->editor && $mark ) {
				$inner = '<tr data-ff-placeholder="1"><td style="padding:18px 8px;text-align:center;color:#b6b6b6;font-size:12px;border:1px dashed #d8d8d8;border-radius:6px;">'
					. esc_html__( 'Drop here', 'flexa-formflow' )
					. '</td></tr>';
			}

			$marker = ( $mark && $ctx->editor && '' !== $id )
				? ' data-ff-col="' . (int) $i . '" data-ff-parent="' . esc_attr( $id ) . '"'
				: '';

			[ $start, $end ] = self::column_gap( (int) $i, $count, $gap );
			// Cells follow the text direction: in RTL the first column is on the right.
			$left  = $rtl ? $end : $start;
			$right = $rtl ? $start : $end;

			$cells .= '<td class="ff-col" valign="' . $valign . '" width="' . $pct . '%" style="width:' . $pct . '%;vertical-align:' . $valign . ';padding:0 ' . $right . 'px 0 ' . $left . 'px;"' . $marker . '>'
				. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $inner . '</table>'
				. '</td>';
		}

		// Columns nested in a column add no second side padding either.
		$side = $ctx->inside_column ? 0 : BaseElement::SECTION_PADDING_X;

		return '<tr><td style="padding:8px ' . $side . 'px;">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' . $cells . '</tr></table>'
			. '</td></tr>';
	}

	/**
	 * A column cell's padding on its start and end side (in text direction)
	 * so that `$gap` sits only between columns: none on the outer edges, and
	 * exactly `$gap` across each inner boundary. Each cell gets the same total
	 * (gap × (count − 1) / count), so the columns keep equal content widths.
	 *
	 * @return array{0: int, 1: int}
	 */
	public static function column_gap( int $index, int $count, int $gap ): array {
		if ( $count <= 1 || $gap <= 0 ) {
			return [ 0, 0 ];
		}
		$start_of = static fn( int $i ): int => (int) round( $gap * $i / $count );
		$start    = $start_of( $index );
		$end      = $index >= $count - 1 ? 0 : $gap - $start_of( $index + 1 );

		return [ $start, $end ];
	}

	/**
	 * Tree-level settings win over the global design tokens so one template
	 * can deviate from the store-wide look.
	 *
	 * @param array<string, mixed> $tree
	 * @return array<string, string|int>
	 */
	private function design_tokens( array $tree ): array {
		$global   = Settings::all();
		$settings = isset( $tree['settings'] ) && is_array( $tree['settings'] ) ? $tree['settings'] : [];

		$pick = static function ( string $key, string $global_key ) use ( $settings, $global ): string {
			$value = $settings[ $key ] ?? null;

			return is_string( $value ) && '' !== $value ? $value : (string) $global[ $global_key ];
		};

		$width = $settings['width'] ?? null;

		// Every token ends up in an inline style, so re-check the shape here too:
		// templates saved before the save-time check must not reach the CSS raw.
		$text_color  = Css::hex_color( $pick( 'textColor', 'text_color' ), (string) $global['text_color'] );
		$brand_color = Css::hex_color( $pick( 'brandColor', 'brand_color' ), (string) $global['brand_color'] );

		// Heading and link colors have no store-wide token: they fall back to the
		// resolved text and brand colors respectively when the template leaves
		// them blank.
		return [
			'backgroundColor'   => Css::hex_color( $pick( 'backgroundColor', 'background_color' ), (string) $global['background_color'] ),
			'contentBackground' => Css::hex_color( $pick( 'contentBackground', 'content_background' ), (string) $global['content_background'] ),
			'textColor'         => $text_color,
			'headingColor'      => Css::hex_color( $settings['headingColor'] ?? null, $text_color ),
			'linkColor'         => Css::hex_color( $settings['linkColor'] ?? null, $brand_color ),
			'brandColor'        => $brand_color,
			'fontFamily'        => Css::font_stack( $pick( 'fontFamily', 'font_family' ), (string) $global['font_family'] ),
			'direction'         => ( $settings['direction'] ?? '' ) === 'rtl' ? 'rtl' : 'ltr',
			'width'             => is_numeric( $width ) ? max( 320, min( 800, (int) $width ) ) : (int) $global['container_width'],
		];
	}

	/**
	 * @param array<string, string|int> $design
	 */
	private function document( string $rows, array $design ): string {
		$bg      = esc_attr( (string) $design['backgroundColor'] );
		$content = esc_attr( (string) $design['contentBackground'] );
		$text    = esc_attr( (string) $design['textColor'] );
		$font    = esc_attr( (string) $design['fontFamily'] );
		$dir     = 'rtl' === ( $design['direction'] ?? 'ltr' ) ? 'rtl' : 'ltr';
		$width   = (int) $design['width'];

		// This is a standalone email HTML document, not a WordPress page: email
		// clients have no enqueue pipeline, so the mobile media query must be an
		// inline <style> block (the only non-inline CSS an email can carry).
		return '<!DOCTYPE html>'
			. '<html lang="' . esc_attr( get_bloginfo( 'language' ) ) . '" dir="' . $dir . '">'
			. '<head>'
			. '<meta charset="utf-8">'
			. '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
			. '<meta http-equiv="X-UA-Compatible" content="IE=edge">'
			. '<style>@media only screen and (max-width:' . ( $width + 20 ) . 'px){.ff-container{width:100%!important}.ff-col{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important}.ff-addr+.ff-addr{padding-top:12px!important}}</style>'
			. '</head>'
			. '<body dir="' . $dir . '" style="margin:0;padding:0;background-color:' . $bg . ';direction:' . $dir . ';-webkit-text-size-adjust:100%;">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' . $bg . '"><tr><td align="center" style="padding:24px 12px;">'
			. '<table role="presentation" class="ff-container" dir="' . $dir . '" width="' . $width . '" cellpadding="0" cellspacing="0" border="0" style="width:' . $width . 'px;max-width:100%;background-color:' . $content . ';border-radius:8px;font-family:' . $font . ';color:' . $text . ';font-size:15px;line-height:1.6;direction:' . $dir . ';">'
			. $rows
			. '</table>'
			. '</td></tr></table>'
			. '</body></html>';
	}
}
