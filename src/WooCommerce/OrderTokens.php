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
 * values so the design never renders blank. Tokens that come from the email
 * rather than an order live in {@see ContextTokens}.
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

		// Independent of any order: every WooCommerce email (account emails
		// included) can link back to the shop or the customer's account.
		$values['shop_url']       = wc_get_page_permalink( 'shop' );
		$values['my_account_url'] = wc_get_page_permalink( 'myaccount' );

		if ( $order instanceof \WC_Order ) {
			$values['order_number']        = (string) $order->get_order_number();
			$values['order_date']          = $order->get_date_created() ? wc_format_datetime( $order->get_date_created() ) : '';
			$values['order_total']         = self::plain_price( $order->get_formatted_order_total() );
			$values['order_status']        = wc_get_order_status_name( $order->get_status() );
			$values['order_url']           = $order->get_view_order_url();
			$values['payment_url']         = $order->get_checkout_payment_url();
			$values['refund_amount']       = self::refund_amount( $order, $ctx );
			$values['payment_method']      = $order->get_payment_method_title();
			$values['shipping_method']     = wp_strip_all_tags( $order->get_shipping_method() );
			$values['customer_first_name'] = $order->get_billing_first_name();
			$values['customer_last_name']  = $order->get_billing_last_name();
			$values['customer_full_name']  = trim( $order->get_formatted_billing_full_name() );
			$values['customer_email']      = $order->get_billing_email();
		} else {
			// Account emails (reset password, new account, confirm email) have no
			// order, but WooCommerce still hands us the account holder's name,
			// and the confirm-email email the address being confirmed.
			$display_name                  = (string) $ctx->extra( 'user_display_name' );
			$values['customer_first_name'] = $display_name;
			$values['customer_full_name']  = $display_name;
			$values['customer_email']      = (string) $ctx->extra( 'user_email' );
		}

		$note = $ctx->extra( 'customer_note' );
		if ( is_string( $note ) && '' !== $note ) {
			$values['customer_note'] = $note;
		}

		if ( $ctx->is_preview ) {
			// `+=` alone would not do: customer_first_name/full_name are now
			// always set (possibly to '' when there is no order or account
			// context), so an empty string already "fills" the key and blocks
			// the sample from ever showing. Only truly-empty values fall back.
			foreach ( self::sample_values() as $key => $sample ) {
				if ( ! isset( $values[ $key ] ) || '' === $values[ $key ] ) {
					$values[ $key ] = $sample;
				}
			}
		}

		return $values;
	}

	/**
	 * Token metadata for the editor hint list: the order tokens, then the
	 * email-context ones, so callers get every WooCommerce token in one list.
	 *
	 * @return list<array{token: string, label: string}>
	 */
	public static function catalog(): array {
		$labels = [
			'{order_number}'        => __( 'Order number', 'flexa-formflow' ),
			'{order_date}'          => __( 'Order date', 'flexa-formflow' ),
			'{order_total}'         => __( 'Order total', 'flexa-formflow' ),
			'{order_status}'        => __( 'Order status', 'flexa-formflow' ),
			'{order_url}'           => __( 'Order URL', 'flexa-formflow' ),
			'{payment_url}'         => __( 'Pay for order link (retry a failed or pending payment)', 'flexa-formflow' ),
			'{refund_amount}'       => __( 'Refund amount (this refund, or the total refunded so far)', 'flexa-formflow' ),
			'{payment_method}'      => __( 'Payment method', 'flexa-formflow' ),
			'{shipping_method}'     => __( 'Shipping method', 'flexa-formflow' ),
			'{customer_first_name}' => __( 'Customer first name', 'flexa-formflow' ),
			'{customer_last_name}'  => __( 'Customer last name', 'flexa-formflow' ),
			'{customer_full_name}'  => __( 'Customer full name', 'flexa-formflow' ),
			'{customer_email}'      => __( 'Customer email', 'flexa-formflow' ),
		];

		$catalog = [];
		foreach ( $labels as $token => $label ) {
			$catalog[] = [
				'token' => $token,
				'label' => $label,
			];
		}

		return array_merge( $catalog, ContextTokens::catalog() );
	}

	/**
	 * The amount of the refund this email is about. The refunded-order emails
	 * hand the template the refund just made, which is what a partial refund
	 * needs; the subject line has no template args, so it reads the same refund
	 * off the email object. Without one (a manual resend) it falls back to
	 * everything refunded on the order so far.
	 */
	private static function refund_amount( \WC_Order $order, RenderContext $ctx ): string {
		$refund_id = (int) $ctx->extra( 'refund_id' );
		$refund    = $refund_id > 0 ? wc_get_order( $refund_id ) : null;
		if ( ! $refund instanceof \WC_Order_Refund && null !== $ctx->email && isset( $ctx->email->refund ) ) {
			$refund = $ctx->email->refund;
		}
		$amount = $refund instanceof \WC_Order_Refund ? (float) $refund->get_amount() : (float) $order->get_total_refunded();

		return self::plain_price( wc_price( $amount, [ 'currency' => $order->get_currency() ] ) );
	}

	/**
	 * A wc_price() string as plain text. Prices also land in the plain-text
	 * subject line, where the currency entity (`&#36;`) would show raw.
	 */
	private static function plain_price( string $html ): string {
		return html_entity_decode( wp_strip_all_tags( $html ), ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * @return array<string, string>
	 */
	private static function sample_values(): array {
		return [
			'order_number'        => '1234',
			'order_date'          => date_i18n( get_option( 'date_format' ) ),
			'order_total'         => self::plain_price( wc_price( 128.5 ) ),
			'order_status'        => __( 'Processing', 'flexa-formflow' ),
			'order_url'           => home_url( '/my-account/view-order/1234/' ),
			'payment_url'         => home_url( '/checkout/order-pay/1234/?pay_for_order=true&key=wc_order_sample' ),
			'refund_amount'       => self::plain_price( wc_price( 32.5 ) ),
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
