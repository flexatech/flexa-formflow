<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\GlobalLayout;
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
			. $this->render_elements( $elements, $ctx, $design, true, GlobalLayout::shadowed( $elements, $parts ) )
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

			// In the editor preview only, wrap each block in an identifiable
			// tbody so the drag-and-drop canvas can measure block boundaries.
			// Delivered mail (editor off) stays byte-identical to before.
			if ( $mark && $ctx->editor && isset( $node['id'] ) && is_string( $node['id'] ) ) {
				$note = $is_shadowed ? ' data-ff-shadowed="1" title="' . esc_attr__( 'Replaced by the global header/footer while it is on.', 'flexa-formflow' ) . '"' : '';
				$html = '<tbody data-ff-el="' . esc_attr( $node['id'] ) . '"' . $note . '>' . $html . '</tbody>';
			}

			$out .= $html;
		}

		return $out;
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
		$half    = (int) round( $gap / 2 );

		$cells = '';
		foreach ( $columns as $i => $col ) {
			$children = is_array( $col ) ? $col : [];
			$inner    = $this->render_elements( $children, $ctx, $design, $mark );
			$valign   = isset( $valigns[ $i ] ) && in_array( $valigns[ $i ], [ 'top', 'middle', 'bottom' ], true ) ? $valigns[ $i ] : 'top';

			// Editor preview: give an empty column a visible drop area.
			if ( '' === $inner && $ctx->editor && $mark ) {
				$inner = '<tr><td style="padding:18px 8px;text-align:center;color:#b6b6b6;font-size:12px;border:1px dashed #d8d8d8;border-radius:6px;">'
					. esc_html__( 'Drop here', 'flexa-formflow' )
					. '</td></tr>';
			}

			$marker = ( $mark && $ctx->editor && '' !== $id )
				? ' data-ff-col="' . (int) $i . '" data-ff-parent="' . esc_attr( $id ) . '"'
				: '';

			$cells .= '<td class="ff-col" valign="' . $valign . '" width="' . $pct . '%" style="width:' . $pct . '%;vertical-align:' . $valign . ';padding:0 ' . $half . 'px;"' . $marker . '>'
				. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $inner . '</table>'
				. '</td>';
		}

		return '<tr><td style="padding:8px 40px;">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' . $cells . '</tr></table>'
			. '</td></tr>';
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
			. '<style>@media only screen and (max-width:' . ( $width + 20 ) . 'px){.ff-container{width:100%!important}.ff-col{display:block!important;width:100%!important}}</style>'
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
