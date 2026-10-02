<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

defined( 'ABSPATH' ) || exit;

/**
 * Short-lived counters keyed by an opaque bucket (already hashed by the
 * caller). Backs rate limiting and one-time-token claims.
 */
interface CounterStore {
	/**
	 * Count one hit in a fixed window and return the total so far in it. A
	 * window that ran out starts again at 1. Must be atomic: two concurrent hits
	 * never both read 1.
	 */
	public function hit( string $bucket, int $window ): int;

	/** Hits so far in the bucket's current window, without counting one. */
	public function peek( string $bucket ): int;
}
