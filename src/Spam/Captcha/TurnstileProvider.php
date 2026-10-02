<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam\Captcha;

defined( 'ABSPATH' ) || exit;

/**
 * Cloudflare Turnstile. Besides the hostname, the token must carry the widget
 * action and the form instance (`cdata`) it was rendered with, so a token from
 * one form can never be spent on another.
 */
final class TurnstileProvider extends SiteVerifyProvider {
	public function id(): string {
		return 'turnstile';
	}

	public function label(): string {
		return __( 'Cloudflare Turnstile', 'flexa-formflow' );
	}

	public function script_url(): string {
		return 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
	}

	public function script_global(): string {
		return 'turnstile';
	}

	protected function verify_url(): string {
		return 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
	}

	protected function check_claims( array $body, SubmissionContext $context ): VerificationResult {
		if ( (string) ( $body['action'] ?? '' ) !== $context->action || (string) ( $body['cdata'] ?? '' ) !== $context->cdata() ) {
			return VerificationResult::failure( VerificationResult::MISMATCH );
		}

		return VerificationResult::success();
	}
}
