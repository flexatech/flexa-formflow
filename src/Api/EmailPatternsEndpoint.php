<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Emails\Patterns\Registry;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\Tokens;
use Flexa\FormFlow\Emails\TreeSanitizer;
use Flexa\FormFlow\Support\RenderCache;
use Flexa\FormFlow\Support\Settings;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Serves the email pattern library (see Emails\Patterns\Registry) and renders
 * pattern thumbnails. Thumbnails go through the same Renderer and sample data
 * as the editor preview, so what a card shows is what gets inserted.
 */
final class EmailPatternsEndpoint extends Endpoint {
	/** Thumbnails per request: one opened category at a time is plenty. */
	private const MAX_PREVIEWS = 24;

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/emails/patterns',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'context' => [ 'sanitize_callback' => 'sanitize_key' ],
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/emails/patterns/preview',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'preview' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function index( WP_REST_Request $request ): WP_REST_Response {
		$context  = self::context( (string) $request->get_param( 'context' ) );
		// `locked` can only come out true for a pattern an add-on registered: every
		// pattern bundled with this plugin is tier 'free'. See Registry::pro_active().
		$unlocked = Registry::pro_active();

		$patterns = array_map(
			static fn( array $p ): array => array_merge( $p, [ 'locked' => 'pro' === $p['tier'] && ! $unlocked ] ),
			null === $context ? Registry::all() : Registry::for_context( $context )
		);

		$categories = [];
		foreach ( Registry::categories() as $key => $label ) {
			$categories[] = [
				'key'   => $key,
				'label' => $label,
			];
		}

		return new WP_REST_Response(
			[
				'schemaVersion' => Registry::SCHEMA_VERSION,
				// Bumps with the sample data a thumbnail shows (settings, site
				// identity); the editor keys its cached thumbnails by it.
				'revision'      => RenderCache::rev(),
				'categories'    => $categories,
				'patterns'      => $patterns,
			],
			200
		);
	}

	/**
	 * Render a few patterns to complete email documents for their thumbnails
	 * and the large preview. No global header/footer, so a card shows only the
	 * pattern itself.
	 */
	public function preview( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		$ids    = is_array( $params['ids'] ?? null ) ? array_slice( array_values( array_filter( $params['ids'], 'is_string' ) ), 0, self::MAX_PREVIEWS ) : [];
		$ctx    = new RenderContext( is_preview: true );
		$empty  = [
			'header' => [],
			'footer' => [],
		];

		$html = [];
		foreach ( $ids as $id ) {
			$pattern = Registry::find( sanitize_key( $id ) );
			if ( null === $pattern ) {
				continue;
			}
			// A thumbnail depends on the pattern, the design settings and the
			// site identity (name, logo); the cache key carries all of them.
			$html[ $pattern['id'] ] = RenderCache::remember(
				'pattern',
				[ $pattern['id'], $pattern['version'], md5( (string) wp_json_encode( $pattern['blocks'] ) ), Settings::all()['brand_color'], get_bloginfo( 'name' ), Tokens::site_logo_url() ],
				static fn(): string => Renderer::instance()->render_tree(
					TreeSanitizer::sanitize( [ 'elements' => self::with_ids( $pattern['blocks'] ) ] ),
					$ctx,
					$empty
				),
				DAY_IN_SECONDS
			);
		}

		return new WP_REST_Response( [ 'html' => $html ], 200 );
	}

	private static function context( string $raw ): ?string {
		return in_array( $raw, Registry::CONTEXTS, true ) ? $raw : null;
	}

	/**
	 * Patterns carry no ids; give each block a throwaway one so the sanitizer
	 * keeps the shape stable.
	 *
	 * @param list<array<string, mixed>> $blocks
	 * @return list<array<string, mixed>>
	 */
	private static function with_ids( array $blocks ): array {
		$n = 0;
		$tag = static function ( array $block ) use ( &$tag, &$n ): array {
			$block['id'] = 'p' . ( ++$n );
			if ( isset( $block['columns'] ) && is_array( $block['columns'] ) ) {
				$block['columns'] = array_map( static fn( array $col ): array => array_map( $tag, $col ), $block['columns'] );
			}

			return $block;
		};

		return array_map( $tag, $blocks );
	}
}
