<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Library\LibraryRepository;
use Flexa\FormFlow\Library\Catalog;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * The Library REST surface: the discoverable catalog (read-only) and My Library
 * (the user's saved reusable assets). Save-from-builder posts the payload the
 * builder already holds client-side, so there is one generic create primitive
 * rather than one endpoint per source type.
 */
final class LibraryEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/library/catalog',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'catalog' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/mine',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'create' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/mine/(?P<id>\d+)',
			[
				[
					'methods'             => 'DELETE',
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);
	}

	public function catalog(): WP_REST_Response {
		return new WP_REST_Response( [ 'items' => Catalog::items() ], 200 );
	}

	public function index(): WP_REST_Response {
		$items = array_map(
			static fn( $asset ) => $asset->to_array(),
			LibraryRepository::instance()->all()
		);

		return new WP_REST_Response( [ 'items' => $items ], 200 );
	}

	public function create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params  = (array) $request->get_json_params();
		$type    = sanitize_text_field( (string) ( $params['type'] ?? 'pattern' ) );
		$kind    = sanitize_text_field( (string) ( $params['kind'] ?? 'form' ) );
		$name    = sanitize_text_field( (string) ( $params['name'] ?? '' ) );
		$payload = is_array( $params['payload'] ?? null ) ? $params['payload'] : [];
		$source  = is_array( $params['source'] ?? null ) ? $params['source'] : [];

		if ( '' === $name ) {
			$name = __( 'Untitled', 'flexa-formflow' );
		}
		if ( [] === $payload ) {
			return new WP_Error( 'flexa_formflow_empty_payload', __( 'There is nothing to save.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$id = LibraryRepository::instance()->create( $type, $name, $kind, $payload, $source );
		if ( $id <= 0 ) {
			return new WP_Error( 'flexa_formflow_create_failed', __( 'The item could not be saved.', 'flexa-formflow' ), [ 'status' => 500 ] );
		}

		$asset = LibraryRepository::instance()->find( $id );

		return new WP_REST_Response( [ 'asset' => $asset?->to_array() ], 201 );
	}

	public function destroy( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = LibraryRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Item not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$repo->delete( $id );

		return new WP_REST_Response( [ 'deleted' => true ], 200 );
	}
}
