<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Emails\GlobalLayout;
use Flexa\FormFlow\Emails\LayoutOverlap;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * The global email header and footer: read and update the layout.
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
	}

	public function show(): WP_REST_Response {
		return new WP_REST_Response( $this->payload(), 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response {
		GlobalLayout::instance()->save( (array) $request->get_json_params() );

		return new WP_REST_Response( $this->payload(), 200 );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function payload(): array {
		return array_merge(
			GlobalLayout::instance()->get(),
			[ 'overlap' => LayoutOverlap::find() ]
		);
	}
}
