<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Order sections. They need WooCommerce (the Order details block and the order
 * tokens), so the registry only offers them on a store.
 */
final class OrderPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		$label = static fn( string $text ): string => '<span style="color:' . B::MUTED . ';">' . $text . '</span>';

		return [
			Registry::define(
				'order-summary',
				'order',
				__( 'Order summary', 'flexa-formflow' ),
				__( 'A heading over the full list of items and totals.', 'flexa-formflow' ),
				[ 'items', 'products', 'totals', 'receipt' ],
				[
					B::heading( __( 'Order summary', 'flexa-formflow' ), 20 ),
					B::block(
						'order_details',
						[
							'title'       => __( 'Your order', 'flexa-formflow' ),
							'borderColor' => '#e6e6e6',
						]
					),
				],
				null,
				'woocommerce'
			),
			Registry::define(
				'order-receipt-compact',
				'order',
				__( 'Compact receipt', 'flexa-formflow' ),
				__( 'Order number and date above a tight item list.', 'flexa-formflow' ),
				[ 'compact', 'receipt', 'number', 'date' ],
				[
					B::text( '<strong>' . __( 'Order #{order_number}', 'flexa-formflow' ) . '</strong> · {order_date}', 'left', 14 ),
					B::block(
						'order_details',
						[
							'title'    => '',
							'fontSize' => 13,
							'paddingY' => 4,
						]
					),
				],
				null,
				'woocommerce'
			),
			Registry::define(
				'order-totals',
				'order',
				__( 'Totals breakdown', 'flexa-formflow' ),
				__( 'Subtotal, shipping, discount and tax on a grey card.', 'flexa-formflow' ),
				[ 'totals', 'subtotal', 'tax', 'discount', 'shipping' ],
				B::band(
					B::SOFT,
					[
						B::spacer( 8 ),
						B::columns(
							[
								[ B::text( $label( __( 'Subtotal', 'flexa-formflow' ) ) . '<br>' . $label( __( 'Shipping', 'flexa-formflow' ) ) . '<br>' . $label( __( 'Discount', 'flexa-formflow' ) ) . '<br>' . $label( __( 'Tax', 'flexa-formflow' ) ), 'left', 14 ) ],
								[ B::text( '{order_subtotal}<br>{order_shipping_total}<br>{order_discount}<br>{order_tax_total}', 'right', 14 ) ],
							]
						),
						B::divider( '#d0d5dd', 1, 4 ),
						B::columns(
							[
								[ B::text( '<strong>' . __( 'Total', 'flexa-formflow' ) . '</strong>', 'left', 16 ) ],
								[ B::text( '<strong>{order_total}</strong>', 'right', 16 ) ],
							]
						),
						B::spacer( 8 ),
					]
				),
				null,
				'woocommerce'
			),
			Registry::define(
				'order-addresses',
				'order',
				__( 'Billing and shipping', 'flexa-formflow' ),
				__( 'The two addresses side by side.', 'flexa-formflow' ),
				[ 'address', 'billing', 'shipping', 'customer' ],
				[
					B::columns(
						[
							[ B::text( '<strong>' . __( 'Billing address', 'flexa-formflow' ) . '</strong><br>{billing_address}', 'left', 14 ) ],
							[ B::text( '<strong>' . __( 'Shipping address', 'flexa-formflow' ) . '</strong><br>{shipping_address}', 'left', 14 ) ],
						]
					),
				],
				null,
				'woocommerce'
			),
			Registry::define(
				'order-payment',
				'order',
				__( 'Payment confirmation', 'flexa-formflow' ),
				__( 'Payment method and amount, with a link to the order.', 'flexa-formflow' ),
				[ 'payment', 'paid', 'method', 'confirmation' ],
				B::band(
					B::TINT,
					[
						B::spacer( 8 ),
						B::heading( __( 'Payment received', 'flexa-formflow' ), 18 ),
						B::text( __( 'We received {order_total} by {payment_method} for order #{order_number}.', 'flexa-formflow' ), 'left', 14 ),
						B::button( __( 'View order', 'flexa-formflow' ), '{order_url}', 'left' ),
						B::spacer( 8 ),
					]
				),
				null,
				'woocommerce'
			),
			Registry::define(
				'order-detailed',
				'order',
				__( 'Detailed item list', 'flexa-formflow' ),
				__( 'Items with pictures, SKUs and a header row.', 'flexa-formflow' ),
				[ 'images', 'sku', 'detailed', 'table' ],
				[
					B::block(
						'order_details',
						[
							'title'      => __( 'What you ordered', 'flexa-formflow' ),
							'showImage'  => true,
							'showSku'    => true,
							'showMeta'   => true,
							'showHeader' => true,
						]
					),
					B::button( __( 'View your order', 'flexa-formflow' ), '{order_url}' ),
				],
				null,
				'woocommerce'
			),
		];
	}
}
