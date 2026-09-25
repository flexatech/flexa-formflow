<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Library;

defined( 'ABSPATH' ) || exit;

/**
 * The Flexa Library catalog: discoverable templates, patterns, recipes and
 * packs. Free ships a small set of free, install-anywhere content here. Pro and
 * Packs extend it through the `flexa_formflow.library.catalog` filter (the same
 * describe-as-data seam the rest of the plugin uses), so no add-on code ships
 * into the Free bundle. This is a first-party feed today; the shape is kept
 * flat so it can later come from a remote store response unchanged.
 */
final class Catalog {

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function items(): array {
		$items = array_merge( self::free_content(), self::packs() );

		/**
		 * Add catalog entries (Pro recipes, paid packs). Each entry is a flat
		 * array; packs additionally carry `contents`, `version` and
		 * `compatibility`.
		 *
		 * @param list<array<string, mixed>> $items
		 */
		return apply_filters( 'flexa_formflow.library.catalog', $items );
	}

	/**
	 * Pack listings. Metadata only; the importable content and the entitlement
	 * check arrive with the Pack import pipeline. Catering deliberately needs no
	 * Pro (its workflows use only Free capabilities) so it sells on its own.
	 *
	 * @return list<array<string, mixed>>
	 */
	private static function packs(): array {
		return [
			[
				'id'            => 'pack-catering',
				'type'          => 'pack',
				'name'          => __( 'Catering Business Pack', 'flexa-formflow' ),
				'description'   => __( 'Build a complete catering inquiry and quote pipeline without starting from scratch.', 'flexa-formflow' ),
				'category'      => __( 'Hospitality', 'flexa-formflow' ),
				'kind'          => 'form',
				'ownership'     => 'paid',
				'price'         => '$29',
				'requiresPro'   => false,
				'version'       => '1.0',
				'compatibility' => 'FormFlow 1.x',
				'contents'      => [
					'forms'     => 6,
					'emails'    => 10,
					'workflows' => 5,
					'patterns'  => 18,
				],
			],
			[
				'id'            => 'pack-events',
				'type'          => 'pack',
				'name'          => __( 'Events Pack', 'flexa-formflow' ),
				'description'   => __( 'Registration, RSVP and reminder flows for events of any size.', 'flexa-formflow' ),
				'category'      => __( 'Events', 'flexa-formflow' ),
				'kind'          => 'form',
				'ownership'     => 'paid',
				'price'         => '$24',
				'requiresPro'   => false,
				'version'       => '1.0',
				'compatibility' => 'FormFlow 1.x',
				'contents'      => [
					'forms'     => 5,
					'emails'    => 8,
					'workflows' => 4,
					'patterns'  => 14,
				],
			],
		];
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private static function free_content(): array {
		return [
			[
				'id'          => 'tpl-contact',
				'type'        => 'template',
				'name'        => __( 'Contact form', 'flexa-formflow' ),
				'description' => __( 'A clean contact form with name, email and message.', 'flexa-formflow' ),
				'category'    => __( 'General', 'flexa-formflow' ),
				'kind'        => 'form',
				'ownership'   => 'free',
			],
			[
				'id'          => 'pat-customer-info',
				'type'        => 'pattern',
				'name'        => __( 'Customer information', 'flexa-formflow' ),
				'description' => __( 'Name, email, phone and company: the field group every pack reuses.', 'flexa-formflow' ),
				'category'    => __( 'General', 'flexa-formflow' ),
				'kind'        => 'form',
				'ownership'   => 'free',
			],
			[
				'id'          => 'tpl-quote-received',
				'type'        => 'template',
				'name'        => __( 'Quote request received', 'flexa-formflow' ),
				'description' => __( 'Confirmation email sent the moment a quote request lands.', 'flexa-formflow' ),
				'category'    => __( 'Sales', 'flexa-formflow' ),
				'kind'        => 'email',
				'ownership'   => 'free',
			],
		];
	}
}
