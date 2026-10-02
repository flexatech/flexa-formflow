<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam\Captcha;

use Flexa\FormFlow\Support\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Shared server-side check for providers that use the `siteverify` protocol
 * (Turnstile and reCAPTCHA): POST secret + token, read a JSON verdict. Every
 * failure path fails closed: a timeout, a network error, a non-200 answer or a
 * body that is not the expected JSON all reject the token.
 *
 * Keys live in the plugin settings as `{id}_site_key` / `{id}_secret_key`; the
 * secret is stored encrypted and only decrypted here, for the outbound call.
 */
abstract class SiteVerifyProvider implements CaptchaProviderInterface {
	private const TIMEOUT = 8;
	private const MAX_TOKEN_LENGTH = 4096;

	abstract protected function verify_url(): string;

	/**
	 * Provider-specific checks on a successful verdict (hostname, action, cdata).
	 *
	 * @param array<string, mixed> $body
	 */
	abstract protected function check_claims( array $body, SubmissionContext $context ): VerificationResult;

	public function site_key(): string {
		return (string) ( Settings::all()[ $this->id() . '_site_key' ] ?? '' );
	}

	public function is_configured(): bool {
		return '' !== $this->site_key() && '' !== $this->secret();
	}

	public function verify( string $token, SubmissionContext $context ): VerificationResult {
		if ( ! $this->is_configured() ) {
			return $this->fail( VerificationResult::NOT_CONFIGURED );
		}
		$token = trim( $token );
		if ( '' === $token ) {
			return VerificationResult::failure( VerificationResult::MISSING );
		}
		if ( strlen( $token ) > self::MAX_TOKEN_LENGTH ) {
			return $this->fail( VerificationResult::INVALID );
		}

		$body = $this->call( $token, $context->remote_ip );
		if ( ! is_array( $body ) ) {
			return $this->fail( $body );
		}
		if ( true !== ( $body['success'] ?? null ) ) {
			return $this->fail( self::code_for_errors( $body['error-codes'] ?? [] ) );
		}

		$hostname = strtolower( (string) ( $body['hostname'] ?? '' ) );
		if ( '' === $hostname || ! in_array( $hostname, $context->hostnames, true ) ) {
			return $this->fail( VerificationResult::MISMATCH );
		}

		$claims = $this->check_claims( $body, $context );

		return $claims->ok ? $claims : $this->fail( $claims->code );
	}

	public function test_keys(): VerificationResult {
		if ( ! $this->is_configured() ) {
			return VerificationResult::failure( VerificationResult::NOT_CONFIGURED );
		}

		// A made-up token: a working secret gets "invalid token" back, a wrong
		// one gets "invalid secret". No submission is involved.
		$body = $this->call( 'flexa-formflow-key-test', '' );
		if ( ! is_array( $body ) ) {
			return VerificationResult::failure( $body );
		}
		$code = self::code_for_errors( $body['error-codes'] ?? [] );

		return VerificationResult::INVALID_SECRET === $code
			? VerificationResult::failure( VerificationResult::INVALID_SECRET )
			: VerificationResult::success();
	}

	protected function secret(): string {
		return (string) ( Settings::all()[ $this->id() . '_secret_key' ] ?? '' );
	}

	/**
	 * POST to the provider. Returns the decoded body, or a failure code.
	 *
	 * @return array<string, mixed>|string
	 */
	private function call( string $token, string $remote_ip ): array|string {
		$args = [
			'secret'   => $this->secret(),
			'response' => $token,
		];
		if ( '' !== $remote_ip ) {
			$args['remoteip'] = $remote_ip;
		}

		$response = wp_remote_post(
			$this->verify_url(),
			[
				'timeout' => self::TIMEOUT,
				'body'    => $args,
			]
		);
		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return VerificationResult::UNAVAILABLE;
		}

		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		return is_array( $body ) ? $body : VerificationResult::UNAVAILABLE;
	}

	/**
	 * Map the provider's `error-codes` (same vocabulary for both providers).
	 */
	private static function code_for_errors( mixed $errors ): string {
		$errors = is_array( $errors ) ? array_map( 'strval', $errors ) : [];
		if ( array_intersect( $errors, [ 'missing-input-secret', 'invalid-input-secret' ] ) ) {
			return VerificationResult::INVALID_SECRET;
		}
		if ( in_array( 'timeout-or-duplicate', $errors, true ) ) {
			return VerificationResult::EXPIRED;
		}
		if ( in_array( 'missing-input-response', $errors, true ) ) {
			return VerificationResult::MISSING;
		}
		if ( in_array( 'internal-error', $errors, true ) ) {
			return VerificationResult::UNAVAILABLE;
		}

		return VerificationResult::INVALID;
	}

	/**
	 * Log the failure code (never the token, the secret or the payload), then
	 * hand back the result.
	 */
	private function fail( string $code ): VerificationResult {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- debug-only diagnostic code, no visitor data.
			error_log( sprintf( 'Flexa FormFlow: %s verification failed (%s).', $this->id(), $code ) );
		}

		return VerificationResult::failure( $code );
	}
}
