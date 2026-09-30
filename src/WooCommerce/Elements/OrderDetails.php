<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * The order line items and totals as an email table. Reads the live order from
 * the render context; in editor preview with no order it shows sample rows so
 * the design never renders blank. Registered only when WooCommerce is active.
 *
 * What each product row shows (image, SKU, options, description, unit price),
 * an optional header row and the customer note are per-block options, all off
 * by default so existing emails keep their look. Rows are built by
 * {@see OrderItems}.
 */
final class OrderDetails extends BaseElement {
	/**
	 * Markup WooCommerce puts in total row values that carries meaning: the
	 * refund reason under the amount (`<br><small>`), the struck-through
	 * original total after a refund (`<del>`/`<ins>`), tax and shipping notes
	 * (`<small>`), and wc_price()'s own wrappers. Anything else is dropped.
	 */
	private const TOTAL_TAGS = [
		'br'    => [],
		'small' => [],
		'del'   => [],
		'ins'   => [],
		'span'  => [],
		'bdi'   => [],
	];

	public function type(): string {
		return 'order_details';
	}

	public function defaults(): array {
		return [
			'title'            => __( 'Order summary', 'flexa-formflow' ),
			'borderColor'      => '#e6e6e6',
			'fontSize'         => 14,
			'headingSize'      => 14,
			'titleColor'       => '',
			'textColor'        => '',
			'backgroundColor'  => '',
			'paddingY'         => 12,
			'paddingX'         => 40,
			'showHeader'       => false,
			'labelProduct'     => __( 'Product', 'flexa-formflow' ),
			'labelTotal'       => __( 'Price', 'flexa-formflow' ),
			'showImage'        => false,
			'imageSize'        => 'small',
			'showLink'         => false,
			'showSku'          => false,
			'showMeta'         => false,
			'showDescription'  => false,
			'showItemPrice'    => false,
			'showRegularPrice' => false,
			'showNote'         => false,
			'labelNote'        => __( 'Note', 'flexa-formflow' ),
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$o      = $this->options( $props );
		$border = esc_attr( $this->str( $props, 'borderColor', '#e6e6e6' ) );
		$text   = esc_attr( '' !== $o['textColor'] ? $o['textColor'] : (string) $design['textColor'] );
		$link   = esc_attr( (string) ( $design['linkColor'] ?? $design['brandColor'] ?? $design['textColor'] ) );
		$cell   = 'padding:10px 12px;border-bottom:1px solid ' . $border . ';font-size:' . $o['fontSize'] . 'px;';
		$items  = new OrderItems( $o, $cell, $text, $link );

		if ( $ctx->order instanceof \WC_Order ) {
			$rows = $items->rows( $ctx->order ) . $this->total_rows( $ctx->order, $cell, $text );
			$note = $o['showNote'] ? trim( (string) $ctx->order->get_customer_note() ) : '';
		} elseif ( $ctx->is_preview ) {
			$rows = $items->sample() . $this->sample_totals( $cell, $text );
			$note = $o['showNote'] ? __( 'Please leave the parcel at the door.', 'flexa-formflow' ) : '';
		} else {
			return '';
		}

		if ( '' === $rows ) {
			return '';
		}
		if ( '' !== $note ) {
			$rows .= $this->pair( $o['labelNote'], nl2br( esc_html( $note ) ), $cell, $text );
		}
		if ( $o['showHeader'] ) {
			$head = str_replace( 'font-size:' . $o['fontSize'] . 'px;', 'font-size:' . $o['headingSize'] . 'px;', $cell ) . 'font-weight:600;color:#667085;';
			$rows = '<tr><td align="left" style="' . $head . '">' . esc_html( $o['labelProduct'] ) . '</td>'
				. '<td align="right" style="' . $head . '">' . esc_html( $o['labelTotal'] ) . '</td></tr>' . $rows;
		}

		$title      = $this->resolve_text( $this->str( $props, 'title' ), $ctx );
		$title_html = '' !== $title
			? '<p style="margin:0 0 10px;font-size:16px;font-weight:600;color:' . ( '' !== $o['titleColor'] ? esc_attr( $o['titleColor'] ) : $text ) . ';">' . esc_html( $title ) . '</p>'
			: '';

		$box = 'padding:' . $o['paddingY'] . 'px ' . $o['paddingX'] . 'px;' . ( '' !== $o['backgroundColor'] ? 'background-color:' . esc_attr( $o['backgroundColor'] ) . ';' : '' );

		return '<tr><td style="' . $box . '">'
			. $title_html
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ' . $border . ';border-radius:6px;">'
			. $rows
			. '</table>'
			. '</td></tr>';
	}

	/**
	 * The block's options with types and bounds enforced.
	 *
	 * @param array<string, mixed> $props
	 * @return array<string, mixed>
	 */
	private function options( array $props ): array {
		$flag = static fn( string $key ): bool => ! empty( $props[ $key ] );
		$size = isset( $props['imageSize'] ) && 'medium' === $props['imageSize'] ? 'medium' : 'small';

		return [
			'fontSize'         => $this->bounded( $props, 'fontSize', 11, 22, 14 ),
			'headingSize'      => $this->bounded( $props, 'headingSize', 11, 22, 14 ),
			'titleColor'       => $this->str( $props, 'titleColor' ),
			'textColor'        => $this->str( $props, 'textColor' ),
			'backgroundColor'  => $this->str( $props, 'backgroundColor' ),
			'paddingY'         => $this->bounded( $props, 'paddingY', 0, 80, 12 ),
			'paddingX'         => $this->bounded( $props, 'paddingX', 0, 80, 40 ),
			'showHeader'       => $flag( 'showHeader' ),
			'labelProduct'     => $this->str( $props, 'labelProduct', __( 'Product', 'flexa-formflow' ) ),
			'labelTotal'       => $this->str( $props, 'labelTotal', __( 'Price', 'flexa-formflow' ) ),
			'showImage'        => $flag( 'showImage' ),
			'imageSize'        => $size,
			'showLink'         => $flag( 'showLink' ),
			'showSku'          => $flag( 'showSku' ),
			'showMeta'         => $flag( 'showMeta' ),
			'showDescription'  => $flag( 'showDescription' ),
			'showItemPrice'    => $flag( 'showItemPrice' ),
			'showRegularPrice' => $flag( 'showRegularPrice' ),
			'showNote'         => $flag( 'showNote' ),
			'labelNote'        => $this->str( $props, 'labelNote', __( 'Note', 'flexa-formflow' ) ),
		];
	}

	/**
	 * A whole number from the props, kept within `$min`..`$max`.
	 *
	 * @param array<string, mixed> $props
	 */
	private function bounded( array $props, string $key, int $min, int $max, int $fallback ): int {
		return isset( $props[ $key ] ) && is_numeric( $props[ $key ] ) ? max( $min, min( $max, (int) $props[ $key ] ) ) : $fallback;
	}

	/**
	 * A total row value with its meaningful markup kept and styled inline: the
	 * email ships none of WooCommerce's stylesheet, so without these `<ins>`
	 * reads as underlined and a long refund reason can't wrap out of the
	 * no-wrap amount cell.
	 */
	private function total_value( string $raw ): string {
		return strtr(
			wp_kses( $raw, self::TOTAL_TAGS ),
			[
				'<del>'   => '<del style="color:#98a2b3;">',
				'<ins>'   => '<ins style="text-decoration:none;">',
				'<small>' => '<small style="display:block;margin-top:2px;font-size:12px;color:#667085;white-space:normal;">',
			]
		);
	}

	/**
	 * A label / value row in the totals style. `$value` is already-safe HTML.
	 */
	private function pair( string $label, string $value, string $cell, string $text ): string {
		return '<tr>'
			. '<td align="left" valign="top" style="' . $cell . 'color:#667085;font-weight:600;">' . esc_html( $label ) . '</td>'
			. '<td align="right" valign="top" style="' . $cell . 'color:' . $text . ';">' . $value . '</td>'
			. '</tr>';
	}

	private function total_rows( \WC_Order $order, string $cell, string $text ): string {
		$rows = '';
		foreach ( $order->get_order_item_totals() as $total_row ) {
			if ( ! is_array( $total_row ) ) {
				continue;
			}
			$label = wp_strip_all_tags( (string) ( $total_row['label'] ?? '' ) );
			$rows .= '<tr>'
				. '<td align="left" valign="top" style="' . $cell . 'color:#667085;font-weight:600;">' . esc_html( $label ) . '</td>'
				. '<td align="right" valign="top" style="' . $cell . 'color:' . $text . ';white-space:nowrap;">' . $this->total_value( (string) ( $total_row['value'] ?? '' ) ) . '</td>'
				. '</tr>';
		}

		return $rows;
	}

	private function sample_totals( string $cell, string $text ): string {
		$rows = '';
		foreach ( [
			[ __( 'Subtotal', 'flexa-formflow' ), '$128.50' ],
			[ __( 'Total', 'flexa-formflow' ), '$128.50' ],
		] as $total ) {
			$rows .= '<tr>'
				. '<td align="left" valign="top" style="' . $cell . 'color:' . $text . ';">' . esc_html( $total[0] ) . '</td>'
				. '<td align="right" valign="top" style="' . $cell . 'color:' . $text . ';white-space:nowrap;">' . esc_html( $total[1] ) . '</td>'
				. '</tr>';
		}

		return $rows;
	}
}
