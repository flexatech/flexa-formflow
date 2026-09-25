<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * Adds WooCommerce order tokens to the shared token resolver. When a render
 * context carries an order, `{order_number}`, `{customer_first_name}`, etc.
 * resolve against it; in editor preview with no order, they resolve to sample
 * values so the design never renders blank.
 */
final class OrderTokens {
	use HasInstance;

	public function register(): void {
		add_filter( 'flexa_formflow.emails.tokens', [ $this, 'add_tokens' ], 10, 2 );
	}

	/**
	 * @param array<string, string> $values
	 * @return array<string, string>
	 */
	public function add_tokens( array $values, RenderContext $ctx ): array {
		$order = $ctx->order;

		if ( $order instanceof \WC_Order ) {
			$values['order_number']        = (string) $order->get_order_number();
			$values['order_date']          = $order->get_date_created() ? wc_format_datetime( $order->get_date_created() ) : '';
			$values['order_total']         = wp_strip_all_tags( $order->get_formatted_order_total() );
			$values['order_status']        = wc_get_order_status_name( $order->get_status() );
			$values['order_url']           = $order->get_view_order_url();
			$values['payment_method']      = $order->get_payment_method_title();
			$values['shipping_method']     = wp_strip_all_tags( $order->get_shipping_method() );
			$values['customer_first_name'] = $order->get_billing_first_name();
			$values['customer_last_name']  = $order->get_billing_last_name();
			$values['customer_full_name']  = trim( $order->get_formatted_billing_full_name() );
			$values['customer_email']      = $order->get_billing_email();
			$values['shop_url']            = wc_get_page_permalink( 'shop' );
			$values['my_account_url']      = wc_get_page_permalink( 'myaccount' );
		}

		$note = $ctx->extra( 'customer_note' );
		if ( is_string( $note ) && '' !== $note ) {
			$values['customer_note'] = $note;
		}

		if ( $ctx->is_preview ) {
			$values += self::sample_values();
		}

		return $values;
	}

	/**
	 * Token metadata for the editor hint list (WooCommerce-only tokens).
	 *
	 * @return list<array{token: string, label: string}>
	 */
	public static function catalog(): array {
		return [
			[
				'token' => '{order_number}',
				'label' => __( 'Order number', 'flexa-formflow' ),
			],
			[
				'token' => '{order_date}',
				'label' => __( 'Order date', 'flexa-formflow' ),
			],
			[
				'token' => '{order_total}',
				'label' => __( 'Order total', 'flexa-formflow' ),
			],
			[
				'token' => '{order_status}',
				'label' => __( 'Order status', 'flexa-formflow' ),
			],
			[
				'token' => '{order_url}',
				'label' => __( 'Order URL', 'flexa-formflow' ),
			],
			[
				'token' => '{payment_method}',
				'label' => __( 'Payment method', 'flexa-formflow' ),
			],
			[
				'token' => '{shipping_method}',
				'label' => __( 'Shipping method', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_first_name}',
				'label' => __( 'Customer first name', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_last_name}',
				'label' => __( 'Customer last name', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_full_name}',
				'label' => __( 'Customer full name', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_email}',
				'label' => __( 'Customer email', 'flexa-formflow' ),
			],
		];
	}

	/**
	 * @return array<string, string>
	 */
	private static function sample_values(): array {
		return [
			'order_number'        => '1234',
			'order_date'          => date_i18n( get_option( 'date_format' ) ),
			'order_total'         => wp_strip_all_tags( wc_price( 128.5 ) ),
			'order_status'        => __( 'Processing', 'flexa-formflow' ),
			'order_url'           => home_url( '/my-account/view-order/1234/' ),
			'payment_method'      => __( 'Credit card', 'flexa-formflow' ),
			'shipping_method'     => __( 'Flat rate', 'flexa-formflow' ),
			'customer_first_name' => 'Alex',
			'customer_last_name'  => 'Nguyen',
			'customer_full_name'  => 'Alex Nguyen',
			'customer_email'      => 'alex@example.com',
			'shop_url'            => home_url( '/shop/' ),
			'my_account_url'      => home_url( '/my-account/' ),
			'customer_note'       => __( 'Thanks, please leave the parcel at the door.', 'flexa-formflow' ),
		];
	}
}
