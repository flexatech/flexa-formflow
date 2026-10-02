<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Domain\Packs\PackContent;
use Flexa\FormFlow\Emails\Render\DefaultTemplates;
use Flexa\FormFlow\Packs\Registry as Packs;
use Flexa\FormFlow\WooCommerce\Catalog as WooCatalog;
use Flexa\FormFlow\WooCommerce\WooTemplates;

defined( 'ABSPATH' ) || exit;

/**
 * Where an email template's design came from, so "Reset to default" knows
 * what default means for it. Stored on the tree as `origin: {kind, ref}`:
 *
 * - `form`  ref `admin` | `confirmation`: the built-in form notification.
 * - `woo`   ref = a WooCommerce email id: that email's built-in design.
 * - `pack`  ref = `<pack id>:<content ref>`: the design the pack ships.
 * - `blank` an empty template.
 *
 * Templates made before origins existed have none; the reset screen then lets
 * the user pick a starting design from {@see self::choices()}.
 */
final class TemplateOrigin {
	private const KINDS = [ 'form', 'woo', 'pack', 'blank' ];

	/**
	 * A clean origin from untrusted input, or null.
	 *
	 * @return array{kind: string, ref: string}|null
	 */
	public static function sanitize( mixed $origin ): ?array {
		if ( ! is_array( $origin ) || ! in_array( $origin['kind'] ?? '', self::KINDS, true ) ) {
			return null;
		}
		$ref = is_string( $origin['ref'] ?? null ) ? $origin['ref'] : '';
		if ( '' !== $ref && ! preg_match( '/^[a-z0-9_:-]{1,120}$/', $ref ) ) {
			return null;
		}

		return [
			'kind' => (string) $origin['kind'],
			'ref'  => $ref,
		];
	}

	/**
	 * Parse the `kind:ref` form the REST API and the reset screen use.
	 *
	 * @return array{kind: string, ref: string}|null
	 */
	public static function parse( string $value ): ?array {
		$parts = explode( ':', $value, 2 );

		return self::sanitize(
			[
				'kind' => $parts[0],
				'ref'  => $parts[1] ?? '',
			]
		);
	}

	/**
	 * @param array<string, mixed>          $tree
	 * @param array{kind: string, ref: string} $origin
	 * @return array<string, mixed>
	 */
	public static function stamp( array $tree, array $origin ): array {
		$tree['origin'] = $origin;

		return $tree;
	}

	/**
	 * A pack email's payload stamped with where it came from.
	 *
	 * @return array<string, mixed>
	 */
	public static function pack_tree( string $pack_id, PackContent $content ): array {
		return self::stamp(
			$content->payload,
			[
				'kind' => 'pack',
				'ref'  => $pack_id . ':' . $content->ref,
			]
		);
	}

	/**
	 * The default design for an origin, stamped with it, or null when it
	 * cannot be built here (WooCommerce off, a pack or email that is gone).
	 *
	 * @param array{kind: string, ref: string} $origin
	 * @return array<string, mixed>|null
	 */
	public static function default_tree( array $origin ): ?array {
		$tree = match ( $origin['kind'] ) {
			'form'  => ( in_array( $origin['ref'], [ 'admin', 'confirmation' ], true ) ? DefaultTemplates::tree_for( $origin['ref'] ) : null ),
			'woo'   => ( class_exists( \WooCommerce::class ) && WooCatalog::exists( $origin['ref'] ) ? WooTemplates::default_tree( $origin['ref'] ) : null ),
			'pack'  => self::pack_payload( $origin['ref'] ),
			'blank' => [
				'version'  => 1,
				'settings' => [],
				'elements' => [],
			],
			default => null,
		};

		return null === $tree ? null : self::stamp( $tree, $origin );
	}

	/**
	 * A readable name for an origin ("WooCommerce: Processing order").
	 *
	 * @param array{kind: string, ref: string} $origin
	 */
	public static function label( array $origin ): string {
		foreach ( self::choices() as $choice ) {
			if ( $choice['value'] === $origin['kind'] . ':' . $origin['ref'] ) {
				return $choice['label'];
			}
		}
		if ( 'pack' === $origin['kind'] ) {
			$pack = Packs::find( explode( ':', $origin['ref'], 2 )[0] );
			/* translators: %s: pack name. */
			return null !== $pack ? sprintf( __( 'Pack: %s', 'flexa-formflow' ), $pack->name ) : __( 'A pack design', 'flexa-formflow' );
		}

		return __( 'Default design', 'flexa-formflow' );
	}

	/**
	 * The starting designs a template without an origin can be reset to.
	 *
	 * @return list<array{value: string, label: string}>
	 */
	public static function choices(): array {
		$choices = [
			[
				'value' => 'form:admin',
				'label' => __( 'Form: admin notification', 'flexa-formflow' ),
			],
			[
				'value' => 'form:confirmation',
				'label' => __( 'Form: confirmation to the submitter', 'flexa-formflow' ),
			],
		];

		if ( class_exists( \WooCommerce::class ) ) {
			foreach ( WooCatalog::emails() as $id => $meta ) {
				// Some titles repeat (admin and customer "Cancelled order"), so say who gets it.
				$choices[] = [
					'value' => 'woo:' . $id,
					'label' => 'admin' === $meta['recipient']
						/* translators: %s: WooCommerce email name. */
						? sprintf( __( 'WooCommerce: %s (to admin)', 'flexa-formflow' ), $meta['title'] )
						/* translators: %s: WooCommerce email name. */
						: sprintf( __( 'WooCommerce: %s (to customer)', 'flexa-formflow' ), $meta['title'] ),
				];
			}
		}

		$choices[] = [
			'value' => 'blank:',
			'label' => __( 'Blank template', 'flexa-formflow' ),
		];

		return $choices;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private static function pack_payload( string $ref ): ?array {
		[ $pack_id, $content_ref ] = array_pad( explode( ':', $ref, 2 ), 2, '' );
		$pack                      = Packs::find( $pack_id );
		foreach ( null !== $pack ? $pack->emails : [] as $content ) {
			if ( $content->ref === $content_ref ) {
				return $content->payload;
			}
		}

		return null;
	}
}
