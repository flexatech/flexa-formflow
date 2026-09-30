<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce tokens that come from the email itself rather than an order:
 * account links (reset/set password, email verification), the Point of Sale
 * store details, and the gateway a "payment gateway enabled" alert is about.
 * Order values live in {@see OrderTokens}; both feed the same token filter,
 * and in preview each fills its own blanks with sample values.
 */
final class ContextTokens {
	use HasInstance;

	public function register(): void {
		add_filter( 'flexa_formflow.emails.tokens', [ $this, 'add_tokens' ], 10, 2 );
	}

	/**
	 * @param array<string, string> $values
	 * @return array<string, string>
	 */
	public function add_tokens( array $values, RenderContext $ctx ): array {
		$values['reset_password_url'] = self::reset_password_url( $ctx );
		$values['set_password_url']   = (string) $ctx->extra( 'set_password_url' );
		$values['verify_email_url']   = self::from_extra_or_email( $ctx, 'verify_url', 'verify_url' );

		$values = array_merge( $values, self::pos_store_values( $ctx ), self::gateway_values( $ctx ) );

		if ( $ctx->is_preview ) {
			foreach ( self::sample_values() as $key => $sample ) {
				if ( ! isset( $values[ $key ] ) || '' === $values[ $key ] ) {
					$values[ $key ] = $sample;
				}
			}
		}

		return $values;
	}

	/**
	 * Token metadata for the editor hint list.
	 *
	 * @return list<array{token: string, label: string}>
	 */
	public static function catalog(): array {
		$labels = [
			'{reset_password_url}'   => __( 'Reset password link (Reset password email only)', 'flexa-formflow' ),
			'{set_password_url}'     => __( 'Set password link (New account email only)', 'flexa-formflow' ),
			'{verify_email_url}'     => __( 'Confirm email link (Confirm email address email only)', 'flexa-formflow' ),
			'{pos_store_name}'       => __( 'POS store name', 'flexa-formflow' ),
			'{pos_store_email}'      => __( 'POS store email', 'flexa-formflow' ),
			'{pos_store_phone}'      => __( 'POS store phone', 'flexa-formflow' ),
			'{pos_store_address}'    => __( 'POS store address', 'flexa-formflow' ),
			'{pos_refund_policy}'    => __( 'POS refund & returns policy', 'flexa-formflow' ),
			'{gateway_title}'        => __( 'Payment gateway name (Payment gateway enabled email only)', 'flexa-formflow' ),
			'{gateway_settings_url}' => __( 'Payment gateway settings link (Payment gateway enabled email only)', 'flexa-formflow' ),
		];

		$catalog = [];
		foreach ( $labels as $token => $label ) {
			$catalog[] = [
				'token' => $token,
				'label' => $label,
			];
		}

		return $catalog;
	}

	/**
	 * A value the template hands us, or else the same value read off the email
	 * object: the subject line is filtered with no template args, but
	 * WooCommerce fills the email's own properties before rendering either.
	 */
	private static function from_extra_or_email( RenderContext $ctx, string $extra, string $property ): string {
		$value = (string) $ctx->extra( $extra );
		if ( '' === $value && null !== $ctx->email && isset( $ctx->email->{$property} ) ) {
			$value = (string) $ctx->email->{$property};
		}

		return $value;
	}

	/**
	 * The gateway a "payment gateway enabled" alert is about.
	 *
	 * @return array<string, string>
	 */
	private static function gateway_values( RenderContext $ctx ): array {
		return [
			'gateway_title'        => self::from_extra_or_email( $ctx, 'gateway_title', 'gateway_title' ),
			'gateway_settings_url' => self::from_extra_or_email( $ctx, 'gateway_url', 'gateway_settings_url' ),
		];
	}

	/**
	 * The store details set under WooCommerce > Settings > Point of Sale. The
	 * POS emails hand them to the template already resolved (with WooCommerce's
	 * own fallbacks); any other email reads the saved options directly, so the
	 * tokens still work outside a POS receipt.
	 *
	 * @return array<string, string>
	 */
	private static function pos_store_values( RenderContext $ctx ): array {
		$pick = static function ( string $extra, string $option, string $fallback = '' ) use ( $ctx ): string {
			$given = (string) $ctx->extra( $extra );
			if ( '' !== $given ) {
				return $given;
			}
			$saved = (string) get_option( $option, '' );

			return '' !== $saved ? $saved : $fallback;
		};

		return [
			'pos_store_name'    => $pick( 'pos_store_name', 'woocommerce_pos_store_name', (string) get_bloginfo( 'name' ) ),
			'pos_store_email'   => $pick( 'pos_store_email', 'woocommerce_pos_store_email', (string) get_option( 'admin_email' ) ),
			'pos_store_phone'   => $pick( 'pos_store_phone', 'woocommerce_pos_store_phone' ),
			'pos_store_address' => $pick( 'pos_store_address', 'woocommerce_pos_store_address' ),
			'pos_refund_policy' => $pick( 'pos_refund_policy', 'woocommerce_pos_refund_returns_policy' ),
		];
	}

	/**
	 * The exact link WooCommerce's own reset-password email builds, from the
	 * reset key/user id the core email class hands the template
	 * (see WC_Email_Customer_Reset_Password::get_content_html()). Empty when
	 * those extras are absent (any email other than customer_reset_password).
	 */
	private static function reset_password_url( RenderContext $ctx ): string {
		$reset_key  = (string) $ctx->extra( 'reset_key' );
		$user_login = (string) $ctx->extra( 'user_login' );
		if ( '' === $reset_key || '' === $user_login || ! function_exists( 'wc_get_endpoint_url' ) ) {
			return '';
		}

		return add_query_arg(
			[
				'key'   => $reset_key,
				'id'    => (string) $ctx->extra( 'user_id' ),
				'login' => rawurlencode( $user_login ),
			],
			wc_get_endpoint_url( 'lost-password', '', wc_get_page_permalink( 'myaccount' ) )
		);
	}

	/**
	 * @return array<string, string>
	 */
	private static function sample_values(): array {
		return [
			'reset_password_url'   => home_url( '/my-account/lost-password/?key=sample&id=1&login=alex' ),
			'set_password_url'     => home_url( '/my-account/lost-password/?action=newaccount&key=sample&login=alex' ),
			'verify_email_url'     => home_url( '/my-account/?wc_verify_email_key=sample&wc_verify_email_user=1' ),
			'pos_store_phone'      => '(555) 010-0199',
			'pos_store_address'    => '123 Main Street, Springfield',
			'pos_refund_policy'    => __( 'Returns accepted within 30 days with receipt.', 'flexa-formflow' ),
			'gateway_title'        => __( 'Check payments', 'flexa-formflow' ),
			'gateway_settings_url' => admin_url( 'admin.php?page=wc-settings&tab=checkout&section=cheque' ),
		];
	}
}
