<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\WooCommerce\Catalog;
use Flexa\FormFlow\WooCommerce\Conditions;
use Flexa\FormFlow\WooCommerce\OrderTokens;
use Flexa\FormFlow\WooCommerce\WooEmailRepository;
use Flexa\FormFlow\WooCommerce\WooTemplates;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Drives the WooCommerce email settings screen: the catalog with per-email
 * takeover state, the assignable templates, the WooCommerce tokens/conditions
 * for the editor, and a live preview against a recent order (or sample data).
 */
final class WooEmailsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/woo-emails',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/woo-emails/(?P<id>[a-z0-9_]+)',
			[
				[
					'methods'             => 'PUT',
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/woo-emails/(?P<id>[a-z0-9_]+)/preview',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'preview' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);
	}

	public function index(): WP_REST_Response {
		$repo  = WooEmailRepository::instance();
		$items = [];
		foreach ( Catalog::emails() as $id => $meta ) {
			$settings = $repo->find( $id );
			$items[]  = [
				'id'          => $id,
				'title'       => $meta['title'],
				'description' => $meta['description'],
				'recipient'   => $meta['recipient'],
				'hasOrder'    => $meta['has_order'],
				'enabled'     => $settings['enabled'],
				'subject'     => $settings['subject'],
				'templateId'  => $settings['template_id'],
			];
		}

		$templates = array_map(
			static fn( $template ) => [
				'id'    => $template->id,
				'title' => $template->title,
			],
			EmailTemplateRepository::instance()->all()
		);

		return new WP_REST_Response(
			[
				'emails'            => $items,
				'templates'         => $templates,
				'tokens'            => OrderTokens::catalog(),
				'conditionSubjects' => Conditions::subjects(),
				'conditionOps'      => Conditions::operators(),
				'hasWooCommerce'    => class_exists( \WooCommerce::class ),
			],
			200
		);
	}

	public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$params = (array) $request->get_json_params();
		$fields = array_intersect_key( $params, array_flip( [ 'enabled', 'subject', 'template_id' ] ) );
		$row    = WooEmailRepository::instance()->save( $id, $fields );

		return new WP_REST_Response(
			[
				'email' => [
					'id'         => $id,
					'enabled'    => $row['enabled'],
					'subject'    => $row['subject'],
					'templateId' => $row['template_id'],
				],
			],
			200
		);
	}

	public function preview( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$order = $this->recent_order();
		$ctx   = new RenderContext(
			type: $id,
			is_preview: true,
			order: $order,
		);

		$tree = WooTemplates::tree_for( $id );
		$html = Renderer::instance()->render_tree( $tree, $ctx );

		return new WP_REST_Response(
			[
				'html'    => $html,
				'orderId' => $order instanceof \WC_Order ? $order->get_id() : 0,
			],
			200
		);
	}

	private function recent_order(): ?\WC_Order {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return null;
		}

		$orders = wc_get_orders(
			[
				'limit'   => 1,
				'orderby' => 'date',
				'order'   => 'DESC',
			]
		);

		$order = is_array( $orders ) ? ( $orders[0] ?? null ) : null;

		return $order instanceof \WC_Order ? $order : null;
	}
}
