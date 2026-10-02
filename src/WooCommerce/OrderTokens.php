<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Tokens;

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
		add_filter( 'flexa_formflow.emails.token_fallbacks', [ self::class, 'add_fallbacks' ] );
		add_filter( 'flexa_formflow.emails.html_tokens', [ self::class, 'add_html_tokens' ] );
	}

	/**
	 * A greeting like "Hi {customer_first_name}," still reads naturally when a
	 * real send has no name to fill in.
	 *
	 * @param array<string, string> $fallbacks
	 * @return array<string, string>
	 */
	public static function add_fallbacks( array $fallbacks ): array {
		$fallbacks['customer_first_name'] = __( 'there', 'flexa-formflow' );

		return $fallbacks;
	}

	/**
	 * Formatted addresses are WooCommerce markup (lines joined with <br>).
	 *
	 * @param list<string> $tokens
	 * @return list<string>
	 */
	public static function add_html_tokens( array $tokens ): array {
		return array_merge( $tokens, [ 'billing_address', 'shipping_address' ] );
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
			$values['order_subtotal']       = self::plain_price( wc_price( (float) $order->get_subtotal(), [ 'currency' => $order->get_currency() ] ) );
			$values['order_discount']       = self::plain_price( wc_price( (float) $order->get_total_discount(), [ 'currency' => $order->get_currency() ] ) );
			$values['order_shipping_total'] = self::plain_price( wc_price( (float) $order->get_shipping_total(), [ 'currency' => $order->get_currency() ] ) );
			$values['order_tax_total']      = self::plain_price( wc_price( (float) $order->get_total_tax(), [ 'currency' => $order->get_currency() ] ) );
			$values['billing_address']      = (string) $order->get_formatted_billing_address();
			$values['shipping_address']     = (string) $order->get_formatted_shipping_address();
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
	 * @return list<array<string, mixed>>
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
			'{order_subtotal}'       => __( 'Order subtotal', 'flexa-formflow' ),
			'{order_discount}'       => __( 'Order discount', 'flexa-formflow' ),
			'{order_shipping_total}' => __( 'Shipping cost', 'flexa-formflow' ),
			'{order_tax_total}'      => __( 'Tax total', 'flexa-formflow' ),
			'{billing_address}'      => __( 'Billing address', 'flexa-formflow' ),
			'{shipping_address}'     => __( 'Shipping address', 'flexa-formflow' ),
			'{customer_note}'        => __( 'Customer note', 'flexa-formflow' ),
			'{shop_url}'             => __( 'Shop page URL', 'flexa-formflow' ),
			'{my_account_url}'       => __( 'My account page URL', 'flexa-formflow' ),
		];

		$fallbacks = self::add_fallbacks( [] );
		$catalog   = [];
		foreach ( $labels as $token => $label ) {
			$name = trim( $token, '{}' );
			$type = str_ends_with( $name, '_url' ) ? 'url' : ( str_ends_with( $name, '_address' ) ? 'html' : ( 'customer_email' === $name ? 'email' : 'text' ) );

			$catalog[] = Tokens::meta( $token, $label, $type, [ 'woo' ], $fallbacks[ $name ] ?? '' );
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
			'order_subtotal'       => self::plain_price( wc_price( 120 ) ),
			'order_discount'       => self::plain_price( wc_price( 10 ) ),
			'order_shipping_total' => self::plain_price( wc_price( 8 ) ),
			'order_tax_total'      => self::plain_price( wc_price( 10.5 ) ),
			'billing_address'      => 'Alex Nguyen<br>21 Market Street<br>Portland, OR 97201',
			'shipping_address'     => 'Alex Nguyen<br>21 Market Street<br>Portland, OR 97201',
		];
	}
}
