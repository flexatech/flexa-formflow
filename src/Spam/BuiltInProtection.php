<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

defined( 'ABSPATH' ) || exit;

/**
 * The always-on layer: an invisible honeypot field plus a timing check. It
 * returns a reason code for logs and counters only; the visitor never learns
 * which check fired.
 *
 * The timing check does not lean on one hard cut-off. A submit under one second
 * after render is always refused; between one second and the soft minimum it
 * passes only when the browser also recorded real interaction with the form
 * (typing, clicking, autofill), which a script posting straight to the endpoint
 * does not produce. Pages served from a cache carry an older render time, which
 * only makes the check more lenient.
 */
final class BuiltInProtection {
	public const HONEYPOT = 'honeypot';
	public const TIMING   = 'timing';

	private const HARD_MIN_SECONDS = 1;
	/** A render time this far in the future means a forged or broken value. */
	private const MAX_CLOCK_SKEW = 300;

	public static function enabled(): bool {
		/**
		 * Developer escape hatch for special integrations (an API client posting
		 * to the submit route on purpose). There is no UI switch for it.
		 *
		 * @param bool $enabled
		 */
		return (bool) apply_filters( 'flexa_formflow.spam.builtin_enabled', true );
	}

	/**
	 * @param array<string, mixed> $params The submit request body.
	 * @return string|null A reason code when the submission looks automated.
	 */
	public static function check( array $params, int $now ): ?string {
		$honeypot = $params['ff_website'] ?? '';
		if ( ! is_string( $honeypot ) || '' !== $honeypot ) {
			return self::HONEYPOT;
		}

		$rendered = is_numeric( $params['_ff_ts'] ?? null ) ? (int) $params['_ff_ts'] : 0;
		if ( $rendered <= 0 || $rendered > $now + self::MAX_CLOCK_SKEW ) {
			return self::TIMING;
		}

		$elapsed     = $now - $rendered;
		$interaction = is_numeric( $params['_ff_i'] ?? null ) ? (int) $params['_ff_i'] : 0;
		if ( $elapsed < self::HARD_MIN_SECONDS ) {
			return self::TIMING;
		}
		if ( $elapsed < self::min_seconds() && $interaction < 2 ) {
			return self::TIMING;
		}

		return null;
	}

	public static function min_seconds(): int {
		/**
		 * Seconds after render below which a submission needs interaction signals.
		 *
		 * @param int $seconds
		 */
		return max( self::HARD_MIN_SECONDS, (int) apply_filters( 'flexa_formflow.spam.min_seconds', 3 ) );
	}
}
