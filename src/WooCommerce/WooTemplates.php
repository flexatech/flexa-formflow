<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Emails\GlobalLayout;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves the block tree that renders a given WooCommerce email: the template
 * assigned in settings, or a sensible default built from the catalog metadata
 * (order emails get an order-details block, account emails do not).
 */
final class WooTemplates {
	/**
	 * @return array<string, mixed>
	 */
	public static function tree_for( string $email_id ): array {
		$settings    = WooEmailRepository::instance()->find( $email_id );
		$template_id = $settings['template_id'];

		if ( $template_id > 0 ) {
			$template = EmailTemplateRepository::instance()->find( $template_id );
			if ( null !== $template ) {
				return $template->tree;
			}
		}

		return self::default_tree( $email_id );
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_tree( string $email_id ): array {
		$copy = self::copy_for( $email_id );

		// A logo or footer the global layout already supplies is left out, so a
		// starter email does not show it twice.
		$layout   = GlobalLayout::instance();
		$elements = [];
		if ( ! $layout->owns( 'header', 'logo', 'woo' ) ) {
			$elements[] = self::el( 'logo' );
		}
		$elements[] = self::el( 'heading', [ 'text' => $copy['heading'] ] );
		$elements[] = self::el( 'text', [ 'html' => $copy['text'] ] );

		if ( Catalog::has_order( $email_id ) ) {
			$elements[] = self::el( 'order_details', [ 'title' => __( 'Order summary', 'flexa-formflow' ) ] );
		}

		$button = self::button_for( $email_id );
		if ( null !== $button ) {
			$elements[] = self::el( 'button', $button );
		}

		$closing = self::closing_for( $email_id );
		if ( null !== $closing ) {
			$elements[] = self::el( 'text', [ 'html' => $closing ] );
		}

		if ( ! $layout->owns( 'footer', 'footer_text', 'woo' ) ) {
			$elements[] = self::el( 'divider' );
			$elements[] = self::el( 'footer_text' );
		}

		$tree = [
			'version'  => 1,
			'settings' => [],
			'elements' => $elements,
		];

		/**
		 * Filter the default WooCommerce tree per email id.
		 *
		 * @param array<string, mixed> $tree
		 * @param string               $email_id
		 */
		return apply_filters( 'flexa_formflow.woo.default_tree', $tree, $email_id );
	}

	/**
	 * The heading/body copy for each WooCommerce email in the catalog, so an
	 * un-assigned (template_id 0) email still reads right for its own event
	 * instead of the generic "thanks for your order" line every id used to
	 * share, regardless of whether it even had an order.
	 *
	 * @return array{heading: string, text: string}
	 */
	private static function copy_for( string $email_id ): array {
		return match ( $email_id ) {
			'new_order'                 => [
				'heading' => __( 'New order {order_number}', 'flexa-formflow' ),
				'text'    => __( 'The store just received a new order from {customer_full_name} ({customer_email}).', 'flexa-formflow' ),
			],
			'cancelled_order'           => [
				'heading' => __( 'Order {order_number} has been cancelled', 'flexa-formflow' ),
				'text'    => __( 'The order from {customer_full_name} was just marked as Cancelled. Please check inventory and payment if needed.', 'flexa-formflow' ),
			],
			'customer_cancelled_order'  => [
				'heading' => __( 'Order {order_number} has been cancelled', 'flexa-formflow' ),
				'text'    => __( 'Hi {customer_first_name}, your order has been cancelled. If you have any questions or this was a mistake, please contact us.', 'flexa-formflow' ),
			],
			'failed_order'              => [
				'heading' => __( 'Payment failed – order {order_number}', 'flexa-formflow' ),
				'text'    => __( 'Payment for the order from {customer_full_name} failed via {payment_method}.', 'flexa-formflow' ),
			],
			'customer_failed_order'     => [
				'heading' => __( 'Your order {order_number} was unsuccessful', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, unfortunately we couldn't complete your order due to an issue with your payment method. If you'd like to continue, use the button below to try again with a different payment method.", 'flexa-formflow' ),
			],
			'customer_on_hold_order'    => [
				'heading' => __( 'Order {order_number} is on hold', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, your order is awaiting payment confirmation. We'll process it as soon as payment is received.", 'flexa-formflow' ),
			],
			'customer_processing_order' => [
				'heading' => __( 'Thank you for your order {order_number}', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, your order is being processed. We'll let you know once it ships.", 'flexa-formflow' ),
			],
			'customer_completed_order'  => [
				'heading' => __( 'Order {order_number} is complete', 'flexa-formflow' ),
				'text'    => __( 'Hi {customer_first_name}, your order has been delivered successfully. Thank you for shopping with us!', 'flexa-formflow' ),
			],
			'customer_pos_completed_order' => [
				'heading' => __( 'Thank you for your in-store purchase', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, here's a reminder of what you've bought at {pos_store_name}.", 'flexa-formflow' ),
			],
			'customer_refunded_order'   => [
				'heading' => __( 'Order {order_number} has been refunded', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, we've refunded {refund_amount} for your order. The funds should appear in your account within a few business days.", 'flexa-formflow' ),
			],
			'customer_pos_refunded_order' => [
				'heading' => __( 'Your in-store order {order_number} has been refunded', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, we've refunded {refund_amount} for your order from {pos_store_name}.", 'flexa-formflow' ),
			],
			'customer_invoice'          => [
				'heading' => __( 'Details for order {order_number}', 'flexa-formflow' ),
				'text'    => __( 'Hi {customer_first_name}, here are the details for the order you requested.', 'flexa-formflow' ),
			],
			'customer_note'             => [
				'heading' => __( 'An update on your order {order_number}', 'flexa-formflow' ),
				'text'    => __( 'Hi {customer_first_name}, the store just added a new note to your order.', 'flexa-formflow' ),
			],
			'customer_reset_password'   => [
				'heading' => __( 'Reset your password', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, someone (hopefully you) requested a password reset for your account at {site_title}. If this wasn't you, you can safely ignore this email.", 'flexa-formflow' ),
			],
			'customer_new_account'      => [
				'heading' => __( 'Welcome to {site_title}', 'flexa-formflow' ),
				'text'    => __( 'Hi {customer_first_name}, your account has been created successfully at {site_title}. Use the button below to set your password and sign in.', 'flexa-formflow' ),
			],
			'customer_verify_email'     => [
				'heading' => __( 'Confirm your email address', 'flexa-formflow' ),
				'text'    => __( "Hi {customer_first_name}, once you've confirmed that {customer_email} is your email address, we'll link any past orders to your account.", 'flexa-formflow' ),
			],
			'admin_payment_gateway_enabled' => [
				'heading' => __( 'Payment gateway "{gateway_title}" enabled', 'flexa-formflow' ),
				'text'    => __( "The payment gateway \"{gateway_title}\" was just enabled on {site_title}. If you didn't enable it, log in and disable it right away.", 'flexa-formflow' ),
			],
			default                     => [
				'heading' => __( 'Order {order_number}', 'flexa-formflow' ),
				'text'    => __( 'Hi {customer_first_name}, thanks for your order. Here are the details.', 'flexa-formflow' ),
			],
		};
	}

	/**
	 * The default call-to-action button for the emails that need one (retry a
	 * failed payment, reset or set a password); every other email has nothing
	 * to click through to.
	 *
	 * @return array{text: string, url: string}|null
	 */
	private static function button_for( string $email_id ): ?array {
		return match ( $email_id ) {
			'customer_failed_order'   => [
				'text' => __( 'Try again', 'flexa-formflow' ),
				'url'  => '{payment_url}',
			],
			'customer_verify_email'   => [
				'text' => __( 'Confirm email address', 'flexa-formflow' ),
				'url'  => '{verify_email_url}',
			],
			'admin_payment_gateway_enabled' => [
				'text' => __( 'Review gateway settings', 'flexa-formflow' ),
				'url'  => '{gateway_settings_url}',
			],
			'customer_reset_password' => [
				'text' => __( 'Reset password', 'flexa-formflow' ),
				'url'  => '{reset_password_url}',
			],
			'customer_new_account'    => [
				'text' => __( 'Set your password', 'flexa-formflow' ),
				'url'  => '{set_password_url}',
			],
			default                   => null,
		};
	}

	/**
	 * A closing line under the order summary. POS receipts point the customer
	 * at the store they bought from; name and email are used because both
	 * always resolve (WooCommerce falls back to the site name and admin email),
	 * whereas phone, address and refund policy may be blank and are left as
	 * tokens for the user to place.
	 */
	private static function closing_for( string $email_id ): ?string {
		return match ( $email_id ) {
			'customer_pos_completed_order',
			'customer_pos_refunded_order' => __( 'Questions about your purchase? Contact {pos_store_name} at {pos_store_email}.', 'flexa-formflow' ),
			'customer_verify_email'       => __( "If you didn't request this email, you can safely ignore it.", 'flexa-formflow' ),
			default                       => null,
		};
	}

	/**
	 * @param array<string, mixed> $props
	 * @return array<string, mixed>
	 */
	private static function el( string $type, array $props = [] ): array {
		return [
			'id'    => 'el_' . substr( md5( uniqid( $type, true ) ), 0, 10 ),
			'type'  => $type,
			'props' => $props,
		];
	}
}
