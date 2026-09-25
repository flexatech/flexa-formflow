<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Integrations\BridgeDetector;
use Flexa\FormFlow\Integrations\Catalog;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Read-only integrations status for the Integrations screen and the delivery
 * card: the directory of connectors plus the detected delivery bridge.
 */
final class IntegrationsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/integrations',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function index(): WP_REST_Response {
		$bridge = BridgeDetector::detect();

		return new WP_REST_Response(
			[
				'integrations' => Catalog::all(),
				'delivery'     => [
					'active' => $bridge['active'],
					'label'  => $bridge['label'],
				],
			],
			200
		);
	}
}
