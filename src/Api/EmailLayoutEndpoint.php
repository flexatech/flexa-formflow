<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Emails\GlobalLayout;
use Flexa\FormFlow\Emails\LayoutAssign;
use Flexa\FormFlow\Emails\LayoutOverlap;
use Flexa\FormFlow\Emails\LayoutPresets;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * The global email header and footer: read and update the layout (switch, scope,
 * default set) and manage its named header/footer sets.
 */
final class EmailLayoutEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/email-layout',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
				[
					'methods'             => 'PUT',
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/email-layout/apply',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'apply' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/email-layout/sets',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'add_set' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/email-layout/sets/(?P<id>[A-Za-z0-9_-]+)',
			[
				[
					'methods'             => 'PUT',
					'callback'            => [ $this, 'update_set' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
				[
					'methods'             => 'DELETE',
					'callback'            => [ $this, 'delete_set' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function show(): WP_REST_Response {
		return new WP_REST_Response( $this->payload(), 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response {
		GlobalLayout::instance()->save( (array) $request->get_json_params() );

		return new WP_REST_Response( $this->payload(), 200 );
	}

	/**
	 * Change the set (and/or un-hide the parts) of many templates at once, or
	 * put a previous change back with `restore`.
	 */
	public function apply( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();

		if ( isset( $params['restore'] ) && is_array( $params['restore'] ) ) {
			return new WP_REST_Response(
				array_merge( $this->payload(), [ 'changed' => LayoutAssign::restore( $params['restore'] ) ] ),
				200
			);
		}

		$ids    = isset( $params['ids'] ) && is_array( $params['ids'] ) ? array_map( 'intval', $params['ids'] ) : [];
		$set    = isset( $params['set'] ) && is_string( $params['set'] ) ? $params['set'] : null;
		$result = LayoutAssign::apply( $ids, $set, ! empty( $params['show_parts'] ) );
		if ( null === $result ) {
			return new WP_REST_Response( [ 'message' => __( 'That set no longer exists.', 'flexa-formflow' ) ], 404 );
		}

		return new WP_REST_Response( array_merge( $this->payload(), $result ), 200 );
	}

	/**
	 * New set from a preset (`blank`, `classic`, `modern`) or a copy of `from`.
	 */
	public function add_set( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		$layout = GlobalLayout::instance();
		$name   = (string) ( $params['name'] ?? '' );
		$source = null;

		if ( ! empty( $params['from'] ) ) {
			$source = $layout->find_set( (string) $params['from'] );
			if ( null === $source ) {
				return new WP_REST_Response( [ 'message' => __( 'That set no longer exists.', 'flexa-formflow' ) ], 404 );
			}
			/* translators: %s: the name of the set being copied. */
			$name = '' !== $name ? $name : sprintf( __( '%s copy', 'flexa-formflow' ), $source['name'] );
			$set  = $layout->add_set( $name, $source['header'], $source['footer'] );
		} else {
			$labels = LayoutPresets::labels();
			$preset = isset( $labels[ $params['preset'] ?? '' ] ) ? (string) $params['preset'] : 'blank';
			$parts  = LayoutPresets::build( $preset );
			$set    = $layout->add_set( '' !== $name ? $name : $labels[ $preset ], $parts['header'], $parts['footer'] );
		}

		return new WP_REST_Response( array_merge( $this->payload(), [ 'created' => $set['id'] ] ), 201 );
	}

	public function update_set( WP_REST_Request $request ): WP_REST_Response {
		$set = GlobalLayout::instance()->update_set( (string) $request['id'], (array) $request->get_json_params() );
		if ( null === $set ) {
			return new WP_REST_Response( [ 'message' => __( 'That set no longer exists.', 'flexa-formflow' ) ], 404 );
		}

		return new WP_REST_Response( $this->payload(), 200 );
	}

	public function delete_set( WP_REST_Request $request ): WP_REST_Response {
		if ( ! GlobalLayout::instance()->delete_set( (string) $request['id'] ) ) {
			return new WP_REST_Response( [ 'message' => __( 'The last set cannot be deleted.', 'flexa-formflow' ) ], 400 );
		}

		return new WP_REST_Response( $this->payload(), 200 );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function payload(): array {
		$labels  = LayoutPresets::labels();
		$presets = [];
		foreach ( $labels as $key => $label ) {
			$presets[] = [
				'key'   => $key,
				'label' => $label,
			];
		}

		return array_merge(
			GlobalLayout::instance()->get(),
			[
				'overlap' => LayoutOverlap::find(),
				'presets' => $presets,
			]
		);
	}
}
