<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Emails\TemplateOrigin;
use Flexa\FormFlow\WooCommerce\Catalog as WooCatalog;
use Flexa\FormFlow\WooCommerce\WooEmailRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * "Reset to default" for email templates. Nothing here writes: the editor
 * fetches the default design and applies it as an ordinary, undoable edit, and
 * its autosave stores it.
 */
final class EmailTemplateDefaultsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/email-templates/origins',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'origins' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/email-templates/(?P<id>\d+)/default',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'default_tree' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'id'     => [ 'sanitize_callback' => 'absint' ],
						'origin' => [ 'sanitize_callback' => 'sanitize_text_field' ],
					],
				],
			]
		);
	}

	/**
	 * The starting designs a template can be reset to when it has no origin.
	 */
	public function origins(): WP_REST_Response {
		return new WP_REST_Response( [ 'origins' => TemplateOrigin::choices() ], 200 );
	}

	/**
	 * The default design for a template. Which default, in order: the one the
	 * user picked (`origin` query, `kind:ref`); the WooCommerce email or pack it
	 * was made from; the WooCommerce email it is assigned to (a template made
	 * with "New template" and then assigned to an order email should reset to
	 * that email's design, not the form notification); the form design it was
	 * made from. `reason` tells the screen why, so it can say so.
	 */
	public function default_tree( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$template = EmailTemplateRepository::instance()->find( (int) $request->get_param( 'id' ) );
		if ( null === $template ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Template not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		[ $origin, $reason ] = $this->resolve( $template->id, $template->tree, (string) $request->get_param( 'origin' ) );
		if ( null === $origin ) {
			return new WP_Error( 'flexa_formflow_no_origin', __( 'Choose which design to start from.', 'flexa-formflow' ), [ 'status' => 422 ] );
		}

		$tree = TemplateOrigin::default_tree( $origin );
		if ( null === $tree ) {
			return new WP_Error( 'flexa_formflow_no_origin', __( 'That default design is not available on this site. Choose another one.', 'flexa-formflow' ), [ 'status' => 422 ] );
		}

		return new WP_REST_Response(
			[
				'tree'   => $tree,
				'origin' => $origin,
				'label'  => TemplateOrigin::label( $origin ),
				'reason' => $reason,
			],
			200
		);
	}

	/**
	 * @param array<string, mixed> $tree
	 * @return array{0: array{kind: string, ref: string}|null, 1: string}
	 */
	private function resolve( int $id, array $tree, string $picked ): array {
		if ( '' !== $picked ) {
			return [ TemplateOrigin::parse( $picked ), 'picked' ];
		}

		$recorded = TemplateOrigin::sanitize( $tree['origin'] ?? null );
		if ( null !== $recorded && in_array( $recorded['kind'], [ 'woo', 'pack' ], true ) ) {
			return [ $recorded, 'recorded' ];
		}

		$assigned = $this->assigned_woo_email( $id );
		if ( null !== $assigned ) {
			return [
				[
					'kind' => 'woo',
					'ref'  => $assigned,
				],
				'woo_assigned',
			];
		}

		return [ $recorded, null !== $recorded ? 'recorded' : 'none' ];
	}

	/**
	 * The WooCommerce email that renders with this template, preferring one
	 * that is taken over (enabled), or null.
	 */
	private function assigned_woo_email( int $id ): ?string {
		if ( ! class_exists( \WooCommerce::class ) ) {
			return null;
		}

		$found = null;
		foreach ( WooEmailRepository::instance()->all() as $email_id => $row ) {
			if ( $row['template_id'] !== $id || ! WooCatalog::exists( $email_id ) ) {
				continue;
			}
			if ( $row['enabled'] ) {
				return $email_id;
			}
			$found ??= $email_id;
		}

		return $found;
	}
}
