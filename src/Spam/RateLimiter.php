<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

defined( 'ABSPATH' ) || exit;

/**
 * Two limits per visitor fingerprint: submissions to one form, and submissions
 * across the whole site. Defaults are loose enough for a person correcting a
 * typo a few times, tight enough to stop a script hammering a form. Tune them
 * with `flexa_formflow.spam.rate_limits`.
 */
final class RateLimiter {
	public function __construct( private readonly CounterStore $store ) {}

	/**
	 * @return array{form: array{0: int, 1: int}, site: array{0: int, 1: int}} [max hits, window seconds]
	 */
	public static function limits(): array {
		$defaults = [
			'form' => [ 8, 10 * MINUTE_IN_SECONDS ],
			'site' => [ 20, 10 * MINUTE_IN_SECONDS ],
		];

		/**
		 * Rate limits as [max submissions, window in seconds].
		 *
		 * @param array{form: array{0: int, 1: int}, site: array{0: int, 1: int}} $defaults
		 */
		$limits = apply_filters( 'flexa_formflow.spam.rate_limits', $defaults );
		$out    = $defaults;
		foreach ( [ 'form', 'site' ] as $scope ) {
			if ( isset( $limits[ $scope ][0], $limits[ $scope ][1] ) && is_numeric( $limits[ $scope ][0] ) && is_numeric( $limits[ $scope ][1] ) ) {
				$out[ $scope ] = [ max( 1, (int) $limits[ $scope ][0] ), max( 1, (int) $limits[ $scope ][1] ) ];
			}
		}

		return $out;
	}

	/**
	 * Count this submission and say whether it is within both limits.
	 */
	public function allow( int $form_id, string $fingerprint ): bool {
		$limits = self::limits();
		$form   = $this->store->hit( self::bucket( 'form:' . $form_id, $fingerprint ), $limits['form'][1] );
		$site   = $this->store->hit( self::bucket( 'site', $fingerprint ), $limits['site'][1] );

		return $form <= $limits['form'][0] && $site <= $limits['site'][0];
	}

	/**
	 * Whether one more submission would still be allowed, without counting it
	 * (the builder's test run).
	 */
	public function would_allow( int $form_id, string $fingerprint ): bool {
		$limits = self::limits();

		return $this->store->peek( self::bucket( 'form:' . $form_id, $fingerprint ) ) < $limits['form'][0]
			&& $this->store->peek( self::bucket( 'site', $fingerprint ) ) < $limits['site'][0];
	}

	private static function bucket( string $scope, string $fingerprint ): string {
		return hash( 'sha256', 'rl|' . $scope . '|' . $fingerprint );
	}
}
