<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * The order's billing and/or shipping address. One block with a `mode`
 * (billing, shipping, or both) rather than three blocks, so the choice can
 * change without removing and re-adding it. With both, `layout` puts the two
 * cards side by side (stacking on mobile) or one under the other.
 *
 * Follows WooCommerce's own email-addresses template: the shipping address is
 * shown only when the order needs one and the store does not force shipping to
 * the billing address. In "both" mode the billing card then takes the full
 * width. In preview with no order it shows a sample address; on a real send
 * with no order (account emails) it renders nothing. Registered only when
 * WooCommerce is active.
 */
final class OrderAddress extends BaseElement {
	private const MODES = [ 'both', 'billing', 'shipping' ];

	private const LAYOUTS = [ 'columns', 'stacked' ];

	public function type(): string {
		return 'order_address';
	}

	public function defaults(): array {
		return [
			'mode'            => 'both',
			'layout'          => 'columns',
			'billingTitle'    => __( 'Billing address', 'flexa-formflow' ),
			'shippingTitle'   => __( 'Shipping address', 'flexa-formflow' ),
			'showPhone'       => true,
			'showEmail'       => true,
			'borderColor'     => '#e6e6e6',
			'titleColor'      => '',
			'textColor'       => '',
			'backgroundColor' => '',
			'fontSize'        => 14,
			'paddingY'        => 12,
			'paddingX'        => 40,
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$mode = in_array( $props['mode'] ?? '', self::MODES, true ) ? (string) $props['mode'] : 'both';

		if ( $ctx->order instanceof \WC_Order ) {
			$billing  = $this->billing_lines( $ctx->order, $props );
			$shipping = $this->shipping_lines( $ctx->order, $props );
		} elseif ( $ctx->is_preview ) {
			[ $billing, $shipping ] = $this->sample_lines( $props );
		} else {
			return '';
		}

		$cards = [];
		if ( 'shipping' !== $mode && [] !== $billing ) {
			$cards[] = [ $this->str( $props, 'billingTitle' ), $billing ];
		}
		if ( 'billing' !== $mode && [] !== $shipping ) {
			$cards[] = [ $this->str( $props, 'shippingTitle' ), $shipping ];
		}
		if ( [] === $cards ) {
			return '';
		}

		$align   = 'rtl' === ( $design['direction'] ?? 'ltr' ) ? 'right' : 'left';
		$bg = $this->str( $props, 'backgroundColor' );
		// Side padding: the author's paddingX at the top level. Inside Columns it
		// is padding of a visible box when the block has a background; without
		// one, the Columns wrapper already holds the email's 40px.
		$padding_x = $this->bounded( $props, 'paddingX', 0, 80, 40 );
		$padding_x = '' !== $bg ? $padding_x : $this->horizontal_padding( $ctx, $padding_x );
		$padding   = 'padding:' . $this->bounded( $props, 'paddingY', 0, 80, 12 ) . 'px ' . $padding_x . 'px;';
		$box     = $padding . ( '' !== $bg ? 'background-color:' . esc_attr( $bg ) . ';' : '' );

		if ( 1 === count( $cards ) ) {
			return '<tr><td align="' . $align . '" style="' . $box . '">' . $this->card( $cards[0][0], $cards[0][1], $props, $design, $align ) . '</td></tr>';
		}

		// One card under the other, full width.
		$layout = in_array( $props['layout'] ?? '', self::LAYOUTS, true ) ? (string) $props['layout'] : 'columns';
		if ( 'stacked' === $layout ) {
			$gap = '<div style="height:12px;line-height:12px;font-size:12px;">&nbsp;</div>';

			return '<tr><td align="' . $align . '" style="' . $box . '">'
				. $this->card( $cards[0][0], $cards[0][1], $props, $design, $align )
				. $gap
				. $this->card( $cards[1][0], $cards[1][1], $props, $design, $align )
				. '</td></tr>';
		}

		// Two cards side by side; the shared `.ff-col` media query stacks them
		// on narrow screens, the same way the Columns block does. Even side
		// padding keeps the stacked cards aligned; `.ff-addr` adds the gap
		// between them once stacked (see Renderer::document()).
		$cells = '';
		foreach ( $cards as [ $title, $lines ] ) {
			$cells .= '<td class="ff-col ff-addr" valign="top" width="50%" style="width:50%;vertical-align:top;padding:0 4px;">'
				. $this->card( $title, $lines, $props, $design, $align )
				. '</td>';
		}

		return '<tr><td style="' . $box . '">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' . $cells . '</tr></table>'
			. '</td></tr>';
	}

	/**
	 * One bordered address card. `$lines` are already-escaped HTML lines.
	 *
	 * @param list<string>              $lines
	 * @param array<string, mixed>      $props
	 * @param array<string, string|int> $design
	 */
	private function card( string $title, array $lines, array $props, array $design, string $align ): string {
		$text   = esc_attr( '' !== $this->str( $props, 'textColor' ) ? $this->str( $props, 'textColor' ) : (string) $design['textColor'] );
		$head   = '' !== $this->str( $props, 'titleColor' ) ? esc_attr( $this->str( $props, 'titleColor' ) ) : $text;
		$border = esc_attr( $this->str( $props, 'borderColor', '#e6e6e6' ) );
		$size   = $this->bounded( $props, 'fontSize', 11, 22, 14 );

		$title_html = '' !== $title
			? '<p style="margin:0 0 6px;font-size:' . ( $size + 1 ) . 'px;font-weight:600;color:' . $head . ';">' . esc_html( $title ) . '</p>'
			: '';

		return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border:1px solid ' . $border . ';border-radius:6px;">'
			. '<tr><td align="' . $align . '" valign="top" style="padding:12px 14px;font-size:' . $size . 'px;line-height:1.6;color:' . $text . ';">'
			. $title_html
			. implode( '<br>', $lines )
			. '</td></tr></table>';
	}

	/**
	 * @param array<string, mixed> $props
	 * @return list<string>
	 */
	private function billing_lines( \WC_Order $order, array $props ): array {
		$lines = $this->address_lines( $order->get_formatted_billing_address() );
		if ( [] === $lines ) {
			return [];
		}
		if ( ! empty( $props['showPhone'] ) && '' !== $order->get_billing_phone() ) {
			$lines[] = esc_html( $order->get_billing_phone() );
		}
		if ( ! empty( $props['showEmail'] ) && '' !== $order->get_billing_email() ) {
			$lines[] = esc_html( $order->get_billing_email() );
		}

		return $lines;
	}

	/**
	 * @param array<string, mixed> $props
	 * @return list<string>
	 */
	private function shipping_lines( \WC_Order $order, array $props ): array {
		if ( wc_ship_to_billing_address_only() || ! $order->needs_shipping_address() ) {
			return [];
		}
		$lines = $this->address_lines( $order->get_formatted_shipping_address() );
		if ( [] !== $lines && ! empty( $props['showPhone'] ) && '' !== $order->get_shipping_phone() ) {
			$lines[] = esc_html( $order->get_shipping_phone() );
		}

		return $lines;
	}

	/**
	 * A WooCommerce formatted address (lines joined by `<br/>`) as escaped lines.
	 *
	 * @return list<string>
	 */
	private function address_lines( string $formatted ): array {
		$lines = [];
		foreach ( preg_split( '/<br\s*\/?>/i', $formatted ) ?: [] as $line ) {
			$line = trim( wp_strip_all_tags( $line ) );
			if ( '' !== $line ) {
				$lines[] = esc_html( html_entity_decode( $line, ENT_QUOTES, 'UTF-8' ) );
			}
		}

		return $lines;
	}

	/**
	 * Sample addresses for the editor preview, matching the sample customer the
	 * order tokens use.
	 *
	 * @param array<string, mixed> $props
	 * @return array{0: list<string>, 1: list<string>}
	 */
	private function sample_lines( array $props ): array {
		$billing = [ 'Alex Nguyen', '123 Main Street', 'Springfield, IL 62701', __( 'United States (US)', 'flexa-formflow' ) ];
		if ( ! empty( $props['showPhone'] ) ) {
			$billing[] = '(555) 010-0123';
		}
		if ( ! empty( $props['showEmail'] ) ) {
			$billing[] = 'alex@example.com';
		}
		$shipping = [ 'Alex Nguyen', '45 Market Road', 'Shelbyville, IL 62565', __( 'United States (US)', 'flexa-formflow' ) ];

		return [ array_map( 'esc_html', $billing ), array_map( 'esc_html', $shipping ) ];
	}

	/**
	 * A whole number from the props, kept within `$min`..`$max`.
	 *
	 * @param array<string, mixed> $props
	 */
	private function bounded( array $props, string $key, int $min, int $max, int $fallback ): int {
		return isset( $props[ $key ] ) && is_numeric( $props[ $key ] ) ? max( $min, min( $max, (int) $props[ $key ] ) ) : $fallback;
	}
}
