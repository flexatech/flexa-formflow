<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Spam\ClientFingerprint;
use Flexa\FormFlow\Spam\RateLimiter;
use Flexa\FormFlow\Spam\ReplayGuard;
use Flexa\FormFlow\Tests\Support\MemoryCounterStore;
use PHPUnit\Framework\TestCase;

final class RateLimiterTest extends TestCase {
	private MemoryCounterStore $store;

	protected function setUp(): void {
		\WP_Test_State::reset();
		$this->store = new MemoryCounterStore();
	}

	public function test_per_form_limit(): void {
		$limiter = new RateLimiter( $this->store );
		$fp      = ClientFingerprint::hash( '203.0.113.5', 'Firefox' );
		for ( $i = 0; $i < 8; $i++ ) {
			$this->assertTrue( $limiter->allow( 1, $fp ), 'submission ' . ( $i + 1 ) );
		}
		$this->assertFalse( $limiter->allow( 1, $fp ) );
		$this->assertTrue( $limiter->allow( 2, $fp ), 'another form has its own budget' );
	}

	public function test_site_wide_limit_spans_forms(): void {
		add_filter(
			'flexa_formflow.spam.rate_limits',
			static fn(): array => [
				'form' => [ 100, 600 ],
				'site' => [ 3, 600 ],
			]
		);
		$limiter = new RateLimiter( $this->store );
		$fp      = ClientFingerprint::hash( '203.0.113.5', 'Firefox' );
		$this->assertTrue( $limiter->allow( 1, $fp ) );
		$this->assertTrue( $limiter->allow( 2, $fp ) );
		$this->assertTrue( $limiter->allow( 3, $fp ) );
		$this->assertFalse( $limiter->allow( 4, $fp ) );
	}

	public function test_window_expires(): void {
		$limiter = new RateLimiter( $this->store );
		$fp      = ClientFingerprint::hash( '203.0.113.5', 'Firefox' );
		for ( $i = 0; $i < 9; $i++ ) {
			$limiter->allow( 1, $fp );
		}
		$this->assertFalse( $limiter->allow( 1, $fp ) );
		$this->store->now += 601;
		$this->assertTrue( $limiter->allow( 1, $fp ) );
	}

	public function test_people_behind_one_nat_do_not_share_a_bucket(): void {
		$a = ClientFingerprint::hash( '198.51.100.7', 'Safari on iPhone' );
		$b = ClientFingerprint::hash( '198.51.100.7', 'Chrome on Windows' );
		$this->assertNotSame( $a, $b );
	}

	public function test_fingerprint_does_not_contain_the_ip(): void {
		$fp = ClientFingerprint::hash( '198.51.100.7', 'UA' );
		$this->assertStringNotContainsString( '198.51.100.7', $fp );
		$this->assertSame( 64, strlen( $fp ) );
		foreach ( array_keys( $this->store->rows ) as $bucket ) {
			$this->assertStringNotContainsString( '198.51', $bucket );
		}
	}

	public function test_would_allow_does_not_count(): void {
		$limiter = new RateLimiter( $this->store );
		$fp      = ClientFingerprint::hash( '203.0.113.5', 'Firefox' );
		for ( $i = 0; $i < 20; $i++ ) {
			$this->assertTrue( $limiter->would_allow( 1, $fp ) );
		}
		$this->assertSame( [], $this->store->rows );
	}

	public function test_a_token_can_be_claimed_once(): void {
		$guard = new ReplayGuard( $this->store );
		$this->assertTrue( $guard->claim( 'token-a' ) );
		$this->assertFalse( $guard->claim( 'token-a' ) );
		$this->assertTrue( $guard->claim( 'token-b' ) );
	}
}
