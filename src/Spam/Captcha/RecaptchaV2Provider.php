<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam\Captcha;

defined( 'ABSPATH' ) || exit;

/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox). v2 tokens carry no action,
 * so the hostname (checked by the parent) is the claim; the token is also
 * single-use on Google's side and in {@see \Flexa\FormFlow\Spam\ReplayGuard}.
 */
final class RecaptchaV2Provider extends SiteVerifyProvider {
	public function id(): string {
		return 'recaptcha_v2';
	}

	public function label(): string {
		return __( 'Google reCAPTCHA v2', 'flexa-formflow' );
	}

	public function script_url(): string {
		return 'https://www.google.com/recaptcha/api.js?render=explicit';
	}

	public function script_global(): string {
		return 'grecaptcha';
	}

	protected function verify_url(): string {
		return 'https://www.google.com/recaptcha/api/siteverify';
	}

	protected function check_claims( array $body, SubmissionContext $context ): VerificationResult {
		unset( $body, $context );

		return VerificationResult::success();
	}
}
