<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Emails\Notifications;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\TemplateOrigin;
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

		// Registered before the `{id}` route so "orders" is never read as an email id.
		register_rest_route(
			self::NAMESPACE,
			'/woo-emails/orders',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'orders' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'search' => [ 'sanitize_callback' => 'sanitize_text_field' ] ],
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
			'/woo-emails/(?P<id>[a-z0-9_]+)/customize',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'customize' ],
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

		register_rest_route(
			self::NAMESPACE,
			'/woo-emails/(?P<id>[a-z0-9_]+)/test',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'test' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);
	}

	public function index(): WP_REST_Response {
		$repo      = WooEmailRepository::instance();
		$wc_states = $this->wc_email_states();
		$items     = [];
		foreach ( Catalog::emails() as $id => $meta ) {
			$settings = $repo->find( $id );
			$items[]  = [
				'id'            => $id,
				'title'         => $meta['title'],
				'description'   => $meta['description'],
				'recipient'     => $meta['recipient'],
				'hasOrder'      => $meta['has_order'],
				'enabled'       => $settings['enabled'],
				'subject'       => $settings['subject'],
				'templateId'    => $settings['template_id'],
				'wcEnabled'     => $wc_states[ $id ]['enabled'] ?? true,
				'wcSettingsUrl' => $wc_states[ $id ]['url'] ?? admin_url( 'admin.php?page=wc-settings&tab=email' ),
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
				'orders'            => $this->find_orders( '' ),
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

	/**
	 * Turn an email's built-in design into a template the editor can open:
	 * copy the default tree (stamped so it can be reset to it later) and assign
	 * the new template to the email.
	 */
	public function customize( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$origin = [
			'kind' => 'woo',
			'ref'  => $id,
		];
		$title  = (string) ( Catalog::emails()[ $id ]['title'] ?? $id );
		$new_id = EmailTemplateRepository::instance()->create( $title, TemplateOrigin::stamp( WooTemplates::default_tree( $id ), $origin ) );
		if ( $new_id <= 0 ) {
			return new WP_Error( 'flexa_formflow_create_failed', __( 'The template could not be created.', 'flexa-formflow' ), [ 'status' => 500 ] );
		}
		WooEmailRepository::instance()->save( $id, [ 'template_id' => $new_id ] );

		return new WP_REST_Response( [ 'templateId' => $new_id ], 201 );
	}

	public function preview( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		// order_id 0 (or an unknown id) renders sample data; a positive id
		// renders that specific order so previews can be checked against real data.
		$params   = (array) $request->get_json_params();
		$order_id = isset( $params['order_id'] ) ? absint( $params['order_id'] ) : 0;
		$order    = $order_id > 0 ? self::load_order( $order_id ) : null;

		$ctx = new RenderContext(
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

	/**
	 * Send this Woo email once to a chosen address, rendered with the same data
	 * source as the preview (order_id 0 = sample data). Lets an admin confirm the
	 * template lands well in a real inbox before taking the email over.
	 */
	public function test( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$params = (array) $request->get_json_params();
		$to     = sanitize_email( (string) ( $params['to'] ?? '' ) );
		if ( ! is_email( $to ) ) {
			return new WP_Error( 'flexa_formflow_invalid_email', __( 'Please enter a valid email address.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$order_id = isset( $params['order_id'] ) ? absint( $params['order_id'] ) : 0;
		$order    = $order_id > 0 ? self::load_order( $order_id ) : null;

		$ctx  = new RenderContext( type: $id, is_preview: true, order: $order );
		$tree = WooTemplates::tree_for( $id );
		$html = Renderer::instance()->render_tree( $tree, $ctx );

		$title = (string) ( Catalog::emails()[ $id ]['title'] ?? $id );
		/* translators: %s: email name. */
		$subject = sprintf( __( '[Test] %s', 'flexa-formflow' ), $title );

		$sent = Notifications::instance()->send( $to, $subject, $html, $id );

		return new WP_REST_Response( [ 'sent' => $sent ], 200 );
	}

	/**
	 * Orders for the preview data-source picker: the latest ones, or those
	 * matching a search by order number, customer name, email or address.
	 */
	public function orders( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response( [ 'orders' => $this->find_orders( (string) $request->get_param( 'search' ) ) ], 200 );
	}

	/**
	 * A real order (never a refund) by id, or null. Shared with the email
	 * editor's preview, which can also render against an order.
	 */
	public static function load_order( int $order_id ): ?\WC_Order {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return null;
		}

		$order = wc_get_order( $order_id );

		return $order instanceof \WC_Order ? $order : null;
	}

	/**
	 * WooCommerce's own on/off switch for each email. Takeover only restyles an
	 * email WooCommerce actually sends, and some (the customer cancelled copy)
	 * ship disabled, so the screen warns instead of silently sending nothing.
	 *
	 * @return array<string, array{enabled: bool, url: string}>
	 */
	private function wc_email_states(): array {
		if ( ! function_exists( 'WC' ) ) {
			return [];
		}

		$states = [];
		foreach ( WC()->mailer()->get_emails() as $email ) {
			if ( ! $email instanceof \WC_Email ) {
				continue;
			}
			// Manual emails (customer invoice) skip the enabled check when sent
			// from an order action, so they are never "off" in practice.
			$states[ (string) $email->id ] = [
				'enabled' => $email->is_manual() || $email->is_enabled(),
				'url'     => admin_url( 'admin.php?page=wc-settings&tab=email&section=' . strtolower( get_class( $email ) ) ),
			];
		}

		return $states;
	}

	/**
	 * Orders offered in the preview data-source picker, newest first. An empty
	 * search lists the latest orders; otherwise WooCommerce's own order search
	 * (the one the Orders screen uses, HPOS or not) matches the order number,
	 * customer name, email and address. The client always prepends a "Sample
	 * order" option, so an empty list still previews fine.
	 *
	 * @return list<array{id: int, label: string}>
	 */
	private function find_orders( string $search, int $limit = 20 ): array {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return [];
		}

		$search = ltrim( trim( $search ), '#' );
		if ( '' === $search ) {
			$orders = wc_get_orders(
				[
					'type'    => 'shop_order',
					'limit'   => $limit,
					'orderby' => 'date',
					'order'   => 'DESC',
				]
			);
		} else {
			$ids = function_exists( 'wc_order_search' ) ? array_map( 'absint', (array) wc_order_search( $search ) ) : [];
			rsort( $ids );
			$orders = array_map( 'wc_get_order', array_slice( array_unique( $ids ), 0, $limit ) );
		}

		$out = [];
		foreach ( is_array( $orders ) ? $orders : [] as $order ) {
			// Refunds share the order tables but are not WC_Order.
			if ( $order instanceof \WC_Order ) {
				$out[] = [
					'id'    => $order->get_id(),
					'label' => self::order_label( $order ),
				];
			}
		}

		return $out;
	}

	/**
	 * "#1234 · Alex Nguyen · alex@example.com · $128.50 · Processing", leaving
	 * out whatever the order does not have.
	 */
	private static function order_label( \WC_Order $order ): string {
		$parts = [
			/* translators: %s: order number. */
			sprintf( __( '#%s', 'flexa-formflow' ), $order->get_order_number() ),
			trim( $order->get_formatted_billing_full_name() ),
			$order->get_billing_email(),
			html_entity_decode( wp_strip_all_tags( $order->get_formatted_order_total() ), ENT_QUOTES, 'UTF-8' ),
			wc_get_order_status_name( $order->get_status() ),
		];

		return implode( ' · ', array_filter( $parts, static fn( string $part ): bool => '' !== $part ) );
	}
}
