<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\TreeSanitizer;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class EmailPreviewEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/email-preview',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'render' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function render( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		$ctx    = self::build_context( $params, true, true );

		$part = (string) ( $params['layout_part'] ?? '' );
		if ( in_array( $part, [ 'header', 'footer' ], true ) ) {
			return new WP_REST_Response( [ 'html' => $this->render_layout( $part, $params, $ctx ) ], 200 );
		}

		$tree = TreeSanitizer::sanitize( is_array( $params['tree'] ?? null ) ? $params['tree'] : [] );
		$html = Renderer::instance()->render_tree( $tree, $ctx );

		return new WP_REST_Response( [ 'html' => $html ], 200 );
	}

	/**
	 * The global layout editor's canvas: the part being edited as normal,
	 * selectable blocks, the other part shown read-only, and a placeholder
	 * standing in for the email's own content between them. Both parts come from
	 * the editor's unsaved drafts.
	 *
	 * @param 'header'|'footer'    $part
	 * @param array<string, mixed> $params
	 */
	private function render_layout( string $part, array $params, RenderContext $ctx ): string {
		$draft = is_array( $params['layout'] ?? null ) ? $params['layout'] : [];
		$clean = static fn( string $key ): array => TreeSanitizer::sanitize(
			[ 'elements' => is_array( $draft[ $key ] ?? null ) ? $draft[ $key ] : [] ]
		)['elements'];

		// No id, so the canvas never treats it as a block.
		$placeholder = [
			'type'  => 'text',
			'props' => [
				'html'  => __( 'Your email content appears here.', 'flexa-formflow' ),
				'align' => 'center',
				'color' => '#98a2b3',
			],
		];

		if ( 'header' === $part ) {
			$elements = array_merge( $clean( 'header' ), [ $placeholder ] );
			$layout   = [
				'header' => [],
				'footer' => $clean( 'footer' ),
			];
		} else {
			$elements = array_merge( [ $placeholder ], $clean( 'footer' ) );
			$layout   = [
				'header' => $clean( 'header' ),
				'footer' => [],
			];
		}

		// The template's own design settings when an email edits its overridden
		// part (the global editor sends none); the parts themselves come from the drafts.
		$tree = TreeSanitizer::sanitize( is_array( $params['tree'] ?? null ) ? $params['tree'] : [] );

		return Renderer::instance()->render_tree(
			[
				'settings' => $tree['settings'],
				'elements' => $elements,
			],
			$ctx,
			$layout
		);
	}

	/**
	 * Build a preview/test render context from request params: the chosen form
	 * (if any) and its most recent entry, so field tokens show real data, or a
	 * chosen WooCommerce order, so order blocks and tokens do.
	 *
	 * @param array<string, mixed> $params
	 */
	public static function build_context( array $params, bool $is_preview, bool $editor = false ): RenderContext {
		$form_id = (int) ( $params['form_id'] ?? 0 );
		$type    = 'confirmation' === ( $params['type'] ?? '' ) ? 'confirmation' : 'admin';

		$form  = $form_id > 0 ? FormRepository::instance()->find( $form_id ) : null;
		$entry = null;
		if ( null !== $form ) {
			$recent = EntryRepository::instance()->all(
				[
					'form_id'  => $form->id,
					'per_page' => 1,
				]
			);
			$entry  = $recent['items'][0] ?? null;
		}

		$order_id = (int) ( $params['order_id'] ?? 0 );
		$order    = $order_id > 0 && class_exists( \WooCommerce::class ) ? WooEmailsEndpoint::load_order( $order_id ) : null;

		return new RenderContext( form: $form, entry: $entry, type: $type, is_preview: $is_preview, order: $order, editor: $editor );
	}
}
