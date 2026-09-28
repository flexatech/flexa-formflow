<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Frontend\Shortcode;
use Flexa\FormFlow\Support\Settings;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Renders a form's current draft config to the same markup a visitor sees, so
 * the builder can show a quick preview of unsaved changes. The frontend CSS is
 * inlined and submission is disabled: this is a look-and-feel preview, not a
 * live form.
 */
final class FormPreviewEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/forms/preview',
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
		$config = FieldTypes::sanitize_config( is_array( $params['config'] ?? null ) ? $params['config'] : [] );
		$title  = sanitize_text_field( (string) ( $params['title'] ?? '' ) );

		// A throwaway Form for rendering only: status is forced to published so
		// the template renders regardless of the draft's real state, and the
		// uuid is a fixed preview marker (never persisted).
		$form = new Form(
			id: 0,
			uuid: 'preview',
			title: $title,
			status: 'published',
			config: $config,
			created_at: '',
			updated_at: '',
		);

		$brand  = (string) Settings::get( 'brand_color' );
		$markup = Shortcode::instance()->render_markup( $form, $brand );
		$html   = $this->document( $markup );

		return new WP_REST_Response( [ 'html' => $html ], 200 );
	}

	/**
	 * Wrap the form markup in a standalone HTML document: the frontend stylesheet
	 * inlined, a neutral page background, and a guard that stops the preview form
	 * from actually submitting inside the iframe.
	 */
	private function document( string $markup ): string {
		$css  = (string) @file_get_contents( FLEXA_FORMFLOW_PATH . 'assets/frontend/form.css' );
		$body = __( 'This is a preview. The form does not submit here.', 'flexa-formflow' );

		return '<!DOCTYPE html><html><head><meta charset="utf-8" />'
			. '<meta name="viewport" content="width=device-width, initial-scale=1" />'
			. '<style>'
			. 'body{margin:0;padding:24px;background:#f8fafc;'
			. 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}'
			. '.flexa-formflow-preview-wrap{max-width:640px;margin:0 auto;background:#fff;'
			. 'border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(15,23,42,.08);}'
			. $css
			. '</style></head><body>'
			. '<div class="flexa-formflow-preview-wrap">' . $markup . '</div>'
			. '<script>document.addEventListener("submit",function(e){e.preventDefault();},true);</script>'
			. '<span hidden>' . esc_html( $body ) . '</span>'
			. '</body></html>';
	}
}
