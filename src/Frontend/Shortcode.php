<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Frontend;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Spam\Captcha\Registry as CaptchaRegistry;
use Flexa\FormFlow\Support\Capabilities;
use Flexa\FormFlow\Support\Settings;

defined( 'ABSPATH' ) || exit;

final class Shortcode {
	use HasInstance;

	public const TAG = 'flexa_formflow';

	public function register(): void {
		add_shortcode( self::TAG, [ $this, 'render_shortcode' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_assets' ] );
	}

	public function register_assets(): void {
		wp_register_style(
			'flexa-formflow-form',
			FLEXA_FORMFLOW_URL . 'assets/frontend/form.css',
			[],
			FLEXA_FORMFLOW_VERSION
		);
		wp_register_script(
			'flexa-formflow-form',
			FLEXA_FORMFLOW_URL . 'assets/frontend/form.js',
			[],
			FLEXA_FORMFLOW_VERSION,
			[ 'in_footer' => true ]
		);
		wp_localize_script(
			'flexa-formflow-form',
			'flexaFormFlowFront',
			[
				'restUrl' => esc_url_raw( rest_url( FLEXA_FORMFLOW_REST_NAMESPACE . '/submit/' ) ),
				'i18n'    => [
					'network'      => __( 'Something went wrong. Please try again.', 'flexa-formflow' ),
					'verify'       => __( 'Please complete the verification before sending.', 'flexa-formflow' ),
					'loadFailed'   => __( 'The verification could not load. Check your connection and try again.', 'flexa-formflow' ),
					'widgetFailed' => __( 'The verification hit a problem. Please try again.', 'flexa-formflow' ),
					'unavailable'  => __( 'This form cannot accept submissions right now. Please try again later.', 'flexa-formflow' ),
				],
			]
		);

		// Provider scripts are registered for every page but only enqueued by a
		// form that uses that provider (see render()).
		foreach ( CaptchaRegistry::providers() as $provider ) {
			wp_register_script(
				'flexa-formflow-captcha-' . $provider->id(),
				$provider->script_url(),
				[],
				null, // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- third-party service script; its URL is versioned by the provider.
				[
					'in_footer' => true,
					'strategy'  => 'async',
				]
			);
		}
	}

	/**
	 * @param array<string, mixed>|string $atts
	 */
	public function render_shortcode( array|string $atts ): string {
		$atts = shortcode_atts( [ 'id' => 0 ], is_array( $atts ) ? $atts : [] );
		$form = FormRepository::instance()->find( (int) $atts['id'] );

		return $this->render( $form );
	}

	public function render( ?Form $form ): string {
		if ( null === $form || ! $form->is_published() || [] === $form->fields() ) {
			// Managers get a hint; visitors get nothing.
			if ( null !== $form && Capabilities::can_manage() ) {
				return '<p><em>' . esc_html__( 'Flexa FormFlow: this form is not published or has no fields, so visitors see nothing here.', 'flexa-formflow' ) . '</em></p>';
			}
			return '';
		}

		wp_enqueue_style( 'flexa-formflow-form' );
		wp_enqueue_script( 'flexa-formflow-form' );

		$captcha = self::captcha_view( $form, false );
		/**
		 * Whether to load the CAPTCHA provider's script on this page. A consent
		 * plugin can return false until the visitor agrees; the widget then shows
		 * its retry state and the form cannot be sent until the script loads.
		 *
		 * @param bool   $load
		 * @param string $provider Provider id.
		 */
		if ( null !== $captcha && $captcha['ready'] && (bool) apply_filters( 'flexa_formflow.captcha.load_script', true, $captcha['provider'] ) ) {
			wp_enqueue_script( 'flexa-formflow-captcha-' . $captcha['provider'] );
		}

		$brand = (string) Settings::get( 'brand_color' );

		return $this->render_markup( $form, $brand );
	}

	/**
	 * Render just the form markup for a given brand color, with no publish guard
	 * and no asset enqueue. The frontend path and the admin preview share this so
	 * the two never drift; callers own enqueueing (frontend) or inlining (preview).
	 */
	public function render_markup( Form $form, string $brand, bool $preview = false ): string {
		$captcha = self::captcha_view( $form, $preview );
		ob_start();
		include FLEXA_FORMFLOW_PATH . 'templates/form.php';

		return (string) ob_get_clean();
	}

	/**
	 * What the template needs to render a form's CAPTCHA: the provider, its
	 * public site key (never the secret), and whether it can run. Null for a
	 * form without CAPTCHA. In the builder preview the widget is a labelled
	 * stand-in and no provider script loads.
	 *
	 * @return array{provider: string, label: string, site_key: string, ready: bool, preview: bool, script: string, global: string}|null
	 */
	public static function captcha_view( Form $form, bool $preview ): ?array {
		$id = CaptchaRegistry::coerce( $form->settings()['captcha'] ?? CaptchaRegistry::NONE );
		if ( CaptchaRegistry::NONE === $id ) {
			return null;
		}
		$provider = CaptchaRegistry::get( $id );

		return [
			'provider' => $id,
			'label'    => null !== $provider ? $provider->label() : $id,
			'site_key' => null !== $provider ? $provider->site_key() : '',
			'ready'    => null !== $provider && $provider->is_configured(),
			'preview'  => $preview,
			'script'   => null !== $provider ? $provider->script_url() : '',
			'global'   => null !== $provider ? $provider->script_global() : '',
		];
	}
}
