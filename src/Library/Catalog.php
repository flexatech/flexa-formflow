<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Library;

use Flexa\FormFlow\Packs\Entitlement;
use Flexa\FormFlow\Packs\InstallState;
use Flexa\FormFlow\Packs\Registry;

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
		$items = array_merge( self::free_content(), self::bundles(), self::packs() );

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
	 * Bundle listings: a bundle groups member packs at a combined price. Bundles
	 * are a presentation over entitlement, so the plugin only describes them; the
	 * store owns which packs a purchase actually grants. Free ships one authored
	 * bundle over its three packs; add-ons register more through the filter.
	 *
	 * @return list<array<string, mixed>>
	 */
	private static function bundles(): array {
		$bundles = [
			[
				'id'          => 'bundle-business-starter',
				'type'        => 'bundle',
				'name'        => __( 'Business Starter Bundle', 'flexa-formflow' ),
				'description' => __( 'Three ready-made pipelines at one price: catering inquiries, lead capture and event RSVPs.', 'flexa-formflow' ),
				'category'    => __( 'Bundles', 'flexa-formflow' ),
				'kind'        => 'form',
				'ownership'   => 'paid',
				'price'       => '$59',
				'listPrice'   => '$87',
				'packs'       => [ 'pack-catering', 'pack-lead-capture', 'pack-event-rsvp' ],
			],
		];

		/**
		 * Register catalog bundles. Each entry groups member pack ids with a
		 * combined price; member names are resolved for display below.
		 *
		 * @param list<array<string, mixed>> $bundles
		 */
		$bundles = apply_filters( 'flexa_formflow.library.bundles', $bundles );

		$names = [];
		foreach ( Registry::all() as $pack ) {
			$names[ $pack->id ] = $pack->name;
		}

		$items = [];
		foreach ( $bundles as $bundle ) {
			$pack_ids       = is_array( $bundle['packs'] ?? null ) ? $bundle['packs'] : [];
			$bundle['members'] = array_values(
				array_map(
					static fn( $id ): array => [
						'id'   => (string) $id,
						'name' => (string) ( $names[ $id ] ?? $id ),
					],
					$pack_ids
				)
			);
			$bundle['memberCount'] = count( $pack_ids );
			$items[]               = $bundle;
		}

		return $items;
	}

	/**
	 * Pack listings, from the pack registry, with install state merged in so the
	 * card can show an Installed or Update chip. Content counts come straight
	 * from each manifest, so the store and the importer never disagree.
	 *
	 * @return list<array<string, mixed>>
	 */
	private static function packs(): array {
		$items = [];
		foreach ( Registry::all() as $pack ) {
			$entry              = $pack->to_catalog_array();
			$entry['purchased'] = Entitlement::purchased( $pack );
			$installed          = InstallState::is_installed( $pack->id );
			if ( $installed ) {
				$entry['installed']       = true;
				$entry['updateAvailable'] = InstallState::version_of( $pack->id ) !== $pack->version;
			}
			$items[] = $entry;
		}

		return $items;
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
