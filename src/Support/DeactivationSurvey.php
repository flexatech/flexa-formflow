<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the reusable Deactivation Intelligence client SDK into the plugin. It
 * runs only on the Plugins screen, shows a short optional survey when the user
 * deactivates, and never blocks or delays deactivation. The bundled SDK lives
 * outside the PSR-4 namespace, so it is required explicitly.
 */
final class DeactivationSurvey {
	use HasInstance;

	/** Central platform base URL (no trailing slash). */
	private const API_URL = 'https://product-intelligence.flexacommerce.com';

	public function register(): void {
		if ( ! apply_filters( 'flexa_formflow.deactivation_survey.enabled', true ) ) {
			return;
		}

		$sdk = FLEXA_FORMFLOW_PATH . 'libraries/deactivation-intelligence/src/class-deactivation-intelligence.php';
		if ( ! is_readable( $sdk ) ) {
			return;
		}
		require_once $sdk;

		if ( ! class_exists( \Deactivation_Intelligence::class ) ) {
			return;
		}

		\Deactivation_Intelligence::init(
			apply_filters(
				'flexa_formflow.deactivation_survey.config',
				[
					'product'     => 'flexa-formflow',
					'tier'        => 'free',
					'version'     => FLEXA_FORMFLOW_VERSION,
					'plugin_file' => FLEXA_FORMFLOW_BASENAME,
					'api_url'     => self::API_URL,
				]
			)
		);
	}
}
