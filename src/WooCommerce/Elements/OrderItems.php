<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce\Elements;

defined( 'ABSPATH' ) || exit;

/**
 * The product rows of the Order details block: each line item's name and
 * quantity, plus whatever the block is set to show under or beside it (image,
 * SKU, options, short description, unit price). With every option off a row is
 * the plain "name × qty | total" it always was.
 *
 * Built from nested tables and inline styles only, so it holds up in Outlook.
 */
final class OrderItems {
	private const IMAGE_SIZES = [
		'small'  => 48,
		'medium' => 72,
	];

	/**
	 * @param array<string, mixed> $o Normalized block options, see {@see OrderDetails::options()}.
	 */
	public function __construct(
		private readonly array $o,
		private readonly string $cell,
		private readonly string $text,
		private readonly string $link,
	) {}

	public function rows( \WC_Order $order ): string {
		$rows = '';
		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof \WC_Order_Item_Product ) {
				continue;
			}

			$product = $item->get_product();
			$product = $product instanceof \WC_Product ? $product : null;
			$total   = wp_strip_all_tags( wc_price( (float) $order->get_line_total( $item, true ), [ 'currency' => $order->get_currency() ] ) );

			$details = [];
			if ( $this->o['showSku'] && null !== $product && '' !== $product->get_sku() ) {
				/* translators: %s: product SKU. */
				$details[] = esc_html( sprintf( __( 'SKU: %s', 'flexa-formflow' ), $product->get_sku() ) );
			}
			if ( $this->o['showMeta'] ) {
				$meta = [];
				foreach ( $item->get_formatted_meta_data() as $entry ) {
					$meta[] = wp_strip_all_tags( $entry->display_key ) . ': ' . wp_strip_all_tags( (string) $entry->display_value );
				}
				if ( [] !== $meta ) {
					$details[] = esc_html( implode( ', ', $meta ) );
				}
			}
			if ( $this->o['showDescription'] && null !== $product ) {
				$short = trim( wp_strip_all_tags( $product->get_short_description() ) );
				if ( '' !== $short ) {
					$details[] = esc_html( wp_html_excerpt( $short, 140, '…' ) );
				}
			}
			if ( $this->o['showItemPrice'] ) {
				$unit    = wp_strip_all_tags( wc_price( (float) $order->get_item_total( $item, true ), [ 'currency' => $order->get_currency() ] ) );
				$regular = null !== $product ? (float) wc_get_price_to_display( $product, [ 'price' => (float) $product->get_regular_price() ] ) : 0.0;
				$was     = $this->o['showRegularPrice'] && $regular > (float) $order->get_item_total( $item, true )
					? '<del style="color:#98a2b3;">' . esc_html( wp_strip_all_tags( wc_price( $regular, [ 'currency' => $order->get_currency() ] ) ) ) . '</del> '
					: '';
				/* translators: %s: price of one unit. */
				$details[] = $was . esc_html( sprintf( __( '%s each', 'flexa-formflow' ), $unit ) );
			}

			$image = '';
			if ( $this->o['showImage'] ) {
				$id    = null !== $product ? (int) $product->get_image_id() : 0;
				$src   = $id > 0 ? (string) wp_get_attachment_image_url( $id, 'thumbnail' ) : '';
				$image = '' !== $src ? $src : (string) wc_placeholder_img_src( 'thumbnail' );
			}

			$url   = $this->o['showLink'] && null !== $product ? (string) $product->get_permalink() : '';
			$rows .= $this->row( $item->get_name(), (int) $item->get_quantity(), $url, $image, $details, $total );
		}

		return $rows;
	}

	/**
	 * Two sample lines for the editor preview, showing every option that is on.
	 */
	public function sample(): string {
		$image = (string) wc_placeholder_img_src( 'thumbnail' );
		$meta  = esc_html__( 'Size: M', 'flexa-formflow' );
		$desc  = esc_html__( 'A short description of the product.', 'flexa-formflow' );
		$lines = [
			[ __( 'Sample product', 'flexa-formflow' ), 1, '$96.00', 'SKU-1001', '$96.00', '$120.00' ],
			[ __( 'Another item', 'flexa-formflow' ), 2, '$32.50', 'SKU-2002', '$16.25', '' ],
		];

		$rows = '';
		foreach ( $lines as [ $name, $qty, $total, $sku, $unit, $regular ] ) {
			$details = [];
			if ( $this->o['showSku'] ) {
				/* translators: %s: product SKU. */
				$details[] = esc_html( sprintf( __( 'SKU: %s', 'flexa-formflow' ), $sku ) );
			}
			if ( $this->o['showMeta'] ) {
				$details[] = $meta;
			}
			if ( $this->o['showDescription'] ) {
				$details[] = $desc;
			}
			if ( $this->o['showItemPrice'] ) {
				$was = $this->o['showRegularPrice'] && '' !== $regular ? '<del style="color:#98a2b3;">' . esc_html( $regular ) . '</del> ' : '';
				/* translators: %s: price of one unit. */
				$details[] = $was . esc_html( sprintf( __( '%s each', 'flexa-formflow' ), $unit ) );
			}

			$rows .= $this->row( $name, $qty, $this->o['showLink'] ? '#' : '', $this->o['showImage'] ? $image : '', $details, $total );
		}

		return $rows;
	}

	/**
	 * @param list<string> $details Small lines under the name; already escaped HTML.
	 */
	private function row( string $name, int $qty, string $url, string $image, array $details, string $total ): string {
		$label = esc_html( $name );
		if ( '' !== $url ) {
			$label = '<a href="' . esc_url( $url ) . '" style="color:' . $this->link . ';text-decoration:none;">' . $label . '</a>';
		}
		$label .= ' &times; ' . esc_html( (string) $qty );

		$small = '';
		foreach ( $details as $line ) {
			$small .= '<span style="display:block;margin-top:2px;font-size:12px;color:#667085;white-space:normal;">' . $line . '</span>';
		}

		$product = $label . $small;
		if ( '' !== $image ) {
			$px      = self::IMAGE_SIZES[ $this->o['imageSize'] ] ?? self::IMAGE_SIZES['small'];
			$product = '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
				. '<td valign="top" style="padding-right:12px;"><img src="' . esc_url( $image ) . '" width="' . $px . '" height="' . $px . '" alt="' . esc_attr( $name ) . '" style="display:block;width:' . $px . 'px;height:' . $px . 'px;border:0;border-radius:4px;object-fit:cover;"></td>'
				. '<td valign="top" style="color:' . $this->text . ';font-size:inherit;">' . $product . '</td>'
				. '</tr></table>';
		}

		return '<tr>'
			. '<td align="left" valign="top" style="' . $this->cell . 'color:' . $this->text . ';">' . $product . '</td>'
			. '<td align="right" valign="top" style="' . $this->cell . 'color:' . $this->text . ';white-space:nowrap;">' . esc_html( $total ) . '</td>'
			. '</tr>';
	}
}
