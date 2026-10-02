<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

defined( 'ABSPATH' ) || exit;

/**
 * Makes every CAPTCHA token single-use on our side too: the first claim wins,
 * any later one (a replayed or double-sent request) is refused before the
 * provider is even asked. Only a hash of the token is kept, for ten minutes.
 */
final class ReplayGuard {
	private const TTL = 10 * MINUTE_IN_SECONDS;

	public function __construct( private readonly CounterStore $store ) {}

	public function claim( string $token ): bool {
		// 0 means the store could not count (no table yet): the provider's own
		// single-use check still applies, so that is not treated as a replay.
		return $this->store->hit( hash( 'sha256', 'captcha|' . $token ), self::TTL ) <= 1;
	}
}
