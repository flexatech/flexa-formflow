<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Spam\Captcha\Registry;
use Flexa\FormFlow\Spam\Captcha\SubmissionContext;
use Flexa\FormFlow\Spam\Captcha\VerificationResult;

defined( 'ABSPATH' ) || exit;

/**
 * The spam layers of the submit pipeline, in their fixed order: built-in
 * protection (honeypot + timing), then rate limiting, then the form's CAPTCHA.
 * Nothing here has a side effect beyond counters; the entry, emails and
 * workflows only run after every layer has passed.
 *
 * `$dry_run` (the builder's test run) evaluates each layer without counting a
 * hit and without asking the provider, and reports what a live submission
 * would meet.
 */
final class SubmissionGuard {
	public function __construct( private readonly CounterStore $store ) {}

	public static function make(): self {
		return new self( new DbCounterStore() );
	}

	/**
	 * @param array<string, mixed> $params The submit request body.
	 */
	public function check( Form $form, array $params, string $ip, string $user_agent, bool $dry_run = false ): GuardResult {
		$steps = [];

		// 1. Built-in protection.
		if ( ! BuiltInProtection::enabled() ) {
			$steps[] = self::step( 'builtin', 'skip', __( 'Turned off by a developer filter.', 'flexa-formflow' ) );
		} elseif ( $dry_run ) {
			$steps[] = self::step( 'builtin', 'pass', __( 'Active. The honeypot and timing checks run on every live submission.', 'flexa-formflow' ) );
		} else {
			$reason = BuiltInProtection::check( $params, time() );
			if ( null !== $reason ) {
				SpamStats::record( $reason );
				// Bots get the normal success answer; nothing names the check.
				return new GuardResult( GuardResult::SILENT, $steps, $reason );
			}
			$steps[] = self::step( 'builtin', 'pass', '' );
		}

		// 2. Rate limiting.
		$fingerprint = ClientFingerprint::hash( $ip, $user_agent );
		$limiter     = new RateLimiter( $this->store );
		$allowed     = $dry_run ? $limiter->would_allow( $form->id, $fingerprint ) : $limiter->allow( $form->id, $fingerprint );
		if ( ! $allowed ) {
			if ( ! $dry_run ) {
				SpamStats::record( 'rate_limit' );
			}
			$message = __( 'Too many submissions from your connection. Please wait a few minutes and try again.', 'flexa-formflow' );
			$steps[] = self::step( 'rate_limit', 'fail', $message );

			return new GuardResult( GuardResult::REJECT, $steps, 'flexa_formflow_rate_limited', $message, 429 );
		}
		$steps[] = self::step( 'rate_limit', 'pass', $dry_run ? __( 'Within the limits for your connection.', 'flexa-formflow' ) : '' );

		// 3. CAPTCHA.
		return $this->captcha( $form, $params, $ip, $dry_run, $steps );
	}

	/**
	 * @param array<string, mixed>                                  $params
	 * @param list<array{step: string, status: string, detail: string}> $steps
	 */
	private function captcha( Form $form, array $params, string $ip, bool $dry_run, array $steps ): GuardResult {
		$id = Registry::coerce( $form->settings()['captcha'] ?? Registry::NONE );
		if ( Registry::NONE === $id ) {
			$steps[] = self::step( 'captcha', 'skip', __( 'This form uses no CAPTCHA.', 'flexa-formflow' ) );

			return new GuardResult( GuardResult::PASS, $steps );
		}

		$provider = Registry::get( $id );
		if ( null === $provider || ! $provider->is_configured() ) {
			// Fail closed: a form set to use a CAPTCHA never runs without it.
			return $this->reject(
				VerificationResult::failure( VerificationResult::NOT_CONFIGURED ),
				$steps,
				503,
				__( 'The selected CAPTCHA has no keys. Add them in Settings > Spam protection.', 'flexa-formflow' )
			);
		}

		if ( $dry_run ) {
			$steps[] = self::step(
				'captcha',
				'skip',
				sprintf(
					/* translators: %s: CAPTCHA provider name. */
					__( '%s is ready. A real check needs the live widget; use “Test keys” in Settings to check the keys.', 'flexa-formflow' ),
					$provider->label()
				)
			);

			return new GuardResult( GuardResult::PASS, $steps );
		}

		$token = is_string( $params['captcha_token'] ?? null ) ? trim( $params['captcha_token'] ) : '';
		if ( '' === $token ) {
			return $this->reject( VerificationResult::failure( VerificationResult::MISSING ), $steps, 400 );
		}
		if ( ! ( new ReplayGuard( $this->store ) )->claim( $token ) ) {
			SpamStats::record( 'captcha' );

			return $this->reject( VerificationResult::failure( VerificationResult::REPLAYED ), $steps, 400 );
		}

		$result = $provider->verify( $token, new SubmissionContext( $form->uuid, $ip, SubmissionContext::site_hostnames() ) );
		if ( ! $result->ok ) {
			SpamStats::record( 'captcha' );
			$status = VerificationResult::UNAVAILABLE === $result->code || ! $result->retryable() ? 503 : 400;

			return $this->reject( $result, $steps, $status );
		}

		$steps[] = self::step( 'captcha', 'pass', '' );

		return new GuardResult( GuardResult::PASS, $steps );
	}

	/**
	 * @param list<array{step: string, status: string, detail: string}> $steps
	 */
	private function reject( VerificationResult $result, array $steps, int $status, string $detail = '' ): GuardResult {
		$steps[] = self::step( 'captcha', 'fail', '' !== $detail ? $detail : $result->message );

		return new GuardResult( GuardResult::REJECT, $steps, $result->code, $result->message, $status, $result->retryable() );
	}

	/**
	 * @return array{step: string, status: string, detail: string}
	 */
	private static function step( string $step, string $status, string $detail ): array {
		return [
			'step'   => $step,
			'status' => $status,
			'detail' => $detail,
		];
	}
}
