<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;

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
		$elements   = [];
		$elements[] = self::el( 'logo' );
		$elements[] = self::el( 'heading', [ 'text' => __( 'Order {order_number}', 'flexa-formflow' ) ] );
		$elements[] = self::el(
			'text',
			[ 'html' => __( 'Hi {customer_first_name}, thanks for your order. Here are the details.', 'flexa-formflow' ) ]
		);

		if ( Catalog::has_order( $email_id ) ) {
			$elements[] = self::el( 'order_details', [ 'title' => __( 'Order summary', 'flexa-formflow' ) ] );
		}

		$elements[] = self::el( 'divider' );
		$elements[] = self::el( 'footer_text' );

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
