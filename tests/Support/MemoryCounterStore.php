<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Support;

use Flexa\FormFlow\Spam\CounterStore;

/**
 * In-memory CounterStore with a controllable clock, for rate-limit and replay
 * tests.
 */
final class MemoryCounterStore implements CounterStore {
	/** @var array<string, array{hits: int, expires: int}> */
	public array $rows = [];
	public int $now    = 1_000_000;

	public function hit( string $bucket, int $window ): int {
		$row = $this->rows[ $bucket ] ?? null;
		if ( null === $row || $row['expires'] < $this->now ) {
			$row = [
				'hits'    => 0,
				'expires' => $this->now + $window,
			];
		}
		++$row['hits'];
		$this->rows[ $bucket ] = $row;

		return $row['hits'];
	}

	public function peek( string $bucket ): int {
		$row = $this->rows[ $bucket ] ?? null;

		return null !== $row && $row['expires'] >= $this->now ? $row['hits'] : 0;
	}
}
