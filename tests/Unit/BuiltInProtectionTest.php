<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Spam\BuiltInProtection;
use PHPUnit\Framework\TestCase;

final class BuiltInProtectionTest extends TestCase {
	private const NOW = 2_000_000;

	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	/**
	 * @param array<string, mixed> $extra
	 */
	private function check( int $elapsed, array $extra = [] ): ?string {
		return BuiltInProtection::check( array_merge( [ 'ff_website' => '', '_ff_ts' => self::NOW - $elapsed ], $extra ), self::NOW );
	}

	public function test_a_normal_submission_passes(): void {
		$this->assertNull( $this->check( 30 ) );
	}

	public function test_a_filled_honeypot_is_caught(): void {
		$this->assertSame( 'honeypot', $this->check( 30, [ 'ff_website' => 'https://spam.test' ] ) );
		$this->assertSame( 'honeypot', $this->check( 30, [ 'ff_website' => [ 'x' ] ] ) );
	}

	public function test_missing_or_future_render_time_is_caught(): void {
		$this->assertSame( 'timing', BuiltInProtection::check( [ 'ff_website' => '' ], self::NOW ) );
		$this->assertSame( 'timing', $this->check( -3600 ) );
	}

	public function test_timing_is_not_a_single_hard_threshold(): void {
		// Under one second: always automated.
		$this->assertSame( 'timing', $this->check( 0, [ '_ff_i' => 50 ] ) );
		// Fast but with real interaction (typing, autofill): accepted.
		$this->assertNull( $this->check( 2, [ '_ff_i' => 12 ] ) );
		// Fast and no interaction at all: a script.
		$this->assertSame( 'timing', $this->check( 2 ) );
		// A cached page with an old render time only makes it more lenient.
		$this->assertNull( $this->check( 86400 ) );
	}

	public function test_minimum_is_filterable(): void {
		add_filter( 'flexa_formflow.spam.min_seconds', static fn(): int => 10 );
		$this->assertSame( 'timing', $this->check( 5 ) );
		$this->assertNull( $this->check( 11 ) );
	}
}
