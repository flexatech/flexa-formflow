<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Delivery sections for order emails (WooCommerce only). WooCommerce has no
 * built-in tracking number, so tracking patterns link to the order page, where
 * shipment-tracking extensions show their details.
 */
final class ShippingPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return [
			Registry::define(
				'shipping-status',
				'shipping',
				__( 'On its way', 'flexa-formflow' ),
				__( 'A tinted status card with the shipping method.', 'flexa-formflow' ),
				[ 'status', 'shipped', 'transit', 'delivery' ],
				B::band(
					B::TINT,
					[
						B::spacer( 8 ),
						B::heading( __( 'Your order is on its way', 'flexa-formflow' ), 20 ),
						B::text( __( 'Order #{order_number} · {shipping_method}', 'flexa-formflow' ), 'left', 14 ),
						B::spacer( 8 ),
					]
				),
				null,
				'woocommerce'
			),
			Registry::define(
				'shipping-progress',
				'shipping',
				__( 'Delivery progress', 'flexa-formflow' ),
				__( 'Three steps from confirmed to delivered.', 'flexa-formflow' ),
				[ 'progress', 'steps', 'timeline', 'tracker' ],
				[
					B::columns(
						[
							[ B::text( '<strong>✓</strong><br>' . __( 'Confirmed', 'flexa-formflow' ), 'center', 13 ) ],
							[ B::text( '<strong style="color:#0076d7;">●</strong><br><strong>' . __( 'On the way', 'flexa-formflow' ) . '</strong>', 'center', 13 ) ],
							[ B::text( '<span style="color:#98a2b3;">○</span><br>' . __( 'Delivered', 'flexa-formflow' ), 'center', 13, [ 'color' => '#98a2b3' ] ) ],
						],
						[ 'gap' => 8 ]
					),
				],
				null,
				'woocommerce'
			),
			Registry::define(
				'shipping-details',
				'shipping',
				__( 'Delivery details', 'flexa-formflow' ),
				__( 'Where it is going and how.', 'flexa-formflow' ),
				[ 'address', 'method', 'details', 'shipping' ],
				[
					B::columns(
						[
							[ B::text( '<strong>' . __( 'Delivering to', 'flexa-formflow' ) . '</strong><br>{shipping_address}', 'left', 14 ) ],
							[ B::text( '<strong>' . __( 'Method', 'flexa-formflow' ) . '</strong><br>{shipping_method}', 'left', 14 ) ],
						]
					),
				],
				null,
				'woocommerce'
			),
			Registry::define(
				'shipping-tracking',
				'shipping',
				__( 'Track your package', 'flexa-formflow' ),
				__( 'A grey card with a button to the order page.', 'flexa-formflow' ),
				[ 'tracking', 'track', 'courier', 'package' ],
				B::band(
					B::SOFT,
					[
						B::spacer( 8 ),
						B::heading( __( 'Track your package', 'flexa-formflow' ), 18 ),
						B::text( __( 'Follow your delivery from your order page.', 'flexa-formflow' ), 'left', 14 ),
						B::button( __( 'Track order', 'flexa-formflow' ), '{order_url}', 'left' ),
						B::spacer( 8 ),
					]
				),
				null,
				'woocommerce'
			),
			Registry::define(
				'shipping-pickup',
				'shipping',
				__( 'Ready for pickup', 'flexa-formflow' ),
				__( 'Pickup instructions with the order number.', 'flexa-formflow' ),
				[ 'pickup', 'collect', 'store', 'local' ],
				[
					B::heading( __( 'Ready for pickup', 'flexa-formflow' ), 22 ),
					B::text( __( 'Show order number <strong>#{order_number}</strong> when you collect it. Questions? Reply to this email.', 'flexa-formflow' ) ),
					B::divider(),
				],
				null,
				'woocommerce'
			),
			Registry::define(
				'shipping-delivered',
				'shipping',
				__( 'Delivered', 'flexa-formflow' ),
				__( 'A centered delivered message and a link to shop again.', 'flexa-formflow' ),
				[ 'delivered', 'arrived', 'complete', 'shop again' ],
				B::band(
					B::TINT,
					[
						B::spacer( 12 ),
						B::heading( __( 'Your order was delivered', 'flexa-formflow' ), 22, 'center' ),
						B::text( __( 'We hope you love it. Thanks for shopping with {site_title}.', 'flexa-formflow' ), 'center' ),
						B::button( __( 'Shop again', 'flexa-formflow' ), '{shop_url}' ),
						B::spacer( 12 ),
					]
				),
				null,
				'woocommerce'
			),
		];
	}
}
