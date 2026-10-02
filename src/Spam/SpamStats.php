<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

defined( 'ABSPATH' ) || exit;

/**
 * Minimal counters of blocked submissions by reason, for the settings screen.
 * No payload, IP or timestamp per event is kept; only running totals.
 */
final class SpamStats {
	public const OPTION_KEY = 'flexa_formflow_spam_stats';

	private const REASONS = [ 'honeypot', 'timing', 'rate_limit', 'captcha' ];

	public static function record( string $reason ): void {
		if ( ! in_array( $reason, self::REASONS, true ) ) {
			return;
		}
		$stats            = self::all();
		$stats[ $reason ] = $stats[ $reason ] + 1;
		update_option( self::OPTION_KEY, $stats, false );
	}

	/**
	 * @return array<string, int>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION_KEY, [] );
		$stored = is_array( $stored ) ? $stored : [];
		$out    = [];
		foreach ( self::REASONS as $reason ) {
			$out[ $reason ] = isset( $stored[ $reason ] ) ? max( 0, (int) $stored[ $reason ] ) : 0;
		}

		return $out;
	}
}
