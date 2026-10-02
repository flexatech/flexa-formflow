<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam\Captcha;

defined( 'ABSPATH' ) || exit;

/**
 * One CAPTCHA service. The submit pipeline, the settings screen and the form
 * renderer all talk to providers through this contract only, so a new provider
 * is one class plus a `flexa_formflow.captcha.providers` filter entry.
 */
interface CaptchaProviderInterface {
	/** Stable id stored in a form's config (`turnstile`, `recaptcha_v2`). */
	public function id(): string;

	public function label(): string;

	/** Both keys are saved. */
	public function is_configured(): bool;

	/** Public key rendered into the page. Never the secret. */
	public function site_key(): string;

	/** The provider's browser script, loaded only on pages with a form that uses it. */
	public function script_url(): string;

	/** The global the script defines once ready (`turnstile`, `grecaptcha`). */
	public function script_global(): string;

	/** Check one widget token against the provider. Fails closed. */
	public function verify( string $token, SubmissionContext $context ): VerificationResult;

	/**
	 * Check the saved keys without a real visitor: a dummy token must be
	 * rejected as a bad token, not as a bad secret.
	 */
	public function test_keys(): VerificationResult;
}
