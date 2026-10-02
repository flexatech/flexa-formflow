<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Spam\GuardResult;
use Flexa\FormFlow\Spam\SpamStats;
use Flexa\FormFlow\Spam\SubmissionGuard;
use Flexa\FormFlow\Support\Settings;
use Flexa\FormFlow\Tests\Support\MemoryCounterStore;
use PHPUnit\Framework\TestCase;

final class SubmissionGuardTest extends TestCase {
	private MemoryCounterStore $store;

	protected function setUp(): void {
		\WP_Test_State::reset();
		$this->store = new MemoryCounterStore();
	}

	private function form( string $captcha = 'none' ): Form {
		return new Form( 9, '0b6a5f2e-1111-4222-8333-944455556666', 'Contact', 'published', [ 'settings' => [ 'captcha' => $captcha ] ], '', '' );
	}

	/**
	 * @param array<string, mixed> $extra
	 * @return array<string, mixed>
	 */
	private function human( array $extra = [] ): array {
		return array_merge(
			[
				'ff_website' => '',
				'_ff_ts'     => time() - 20,
				'_ff_i'      => 15,
			],
			$extra
		);
	}

	private function guard(): SubmissionGuard {
		return new SubmissionGuard( $this->store );
	}

	public function test_a_human_without_captcha_passes(): void {
		$result = $this->guard()->check( $this->form(), $this->human(), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::PASS, $result->verdict );
	}

	public function test_honeypot_is_answered_silently_before_any_other_layer(): void {
		\WP_Test_State::$http = static function () {
			throw new \LogicException( 'the provider must not be called for a bot' );
		};
		$result = $this->guard()->check( $this->form( 'turnstile' ), $this->human( [ 'ff_website' => 'x' ] ), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::SILENT, $result->verdict );
		$this->assertSame( [], $this->store->rows, 'a bot does not even use up rate-limit budget' );
		$this->assertSame( 1, SpamStats::all()['honeypot'] );
	}

	public function test_built_in_protection_runs_even_without_captcha(): void {
		$result = $this->guard()->check( $this->form( 'none' ), $this->human( [ '_ff_ts' => time(), '_ff_i' => 0 ] ), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::SILENT, $result->verdict );
	}

	public function test_rate_limit_rejects_with_429(): void {
		for ( $i = 0; $i < 8; $i++ ) {
			$this->guard()->check( $this->form(), $this->human(), '203.0.113.5', 'UA' );
		}
		$result = $this->guard()->check( $this->form(), $this->human(), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::REJECT, $result->verdict );
		$this->assertSame( 429, $result->status );
	}

	public function test_captcha_without_keys_fails_closed(): void {
		$result = $this->guard()->check( $this->form( 'turnstile' ), $this->human( [ 'captcha_token' => 'tok' ] ), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::REJECT, $result->verdict );
		$this->assertSame( 503, $result->status );
		$this->assertSame( 'not_configured', $result->code );
	}

	public function test_captcha_token_is_required_verified_and_single_use(): void {
		Settings::save( [ 'recaptcha_v2_site_key' => '6Lsite', 'recaptcha_v2_secret_key' => '6Lsecret' ] );
		\WP_Test_State::$http = static fn(): array => [
			'response' => [ 'code' => 200 ],
			'body'     => (string) json_encode( [ 'success' => true, 'hostname' => 'example.test' ] ),
		];
		$form = $this->form( 'recaptcha_v2' );

		$missing = $this->guard()->check( $form, $this->human(), '203.0.113.5', 'UA' );
		$this->assertSame( 'missing', $missing->code );

		$first = $this->guard()->check( $form, $this->human( [ 'captcha_token' => 'tok-1' ] ), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::PASS, $first->verdict );

		$replay = $this->guard()->check( $form, $this->human( [ 'captcha_token' => 'tok-1' ] ), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::REJECT, $replay->verdict );
		$this->assertSame( 'replayed', $replay->code );
		$this->assertCount( 1, \WP_Test_State::$requests, 'a replayed token never reaches the provider' );
	}

	public function test_provider_outage_rejects_with_retry(): void {
		Settings::save( [ 'turnstile_site_key' => 'site', 'turnstile_secret_key' => 'secret' ] );
		\WP_Test_State::$http = static fn() => new \WP_Error( 'http_request_failed', 'timed out' );
		$result = $this->guard()->check( $this->form( 'turnstile' ), $this->human( [ 'captcha_token' => 'tok' ] ), '203.0.113.5', 'UA' );
		$this->assertSame( GuardResult::REJECT, $result->verdict );
		$this->assertSame( 503, $result->status );
		$this->assertTrue( $result->retryable );
	}

	public function test_dry_run_counts_nothing_and_calls_no_provider(): void {
		Settings::save( [ 'turnstile_site_key' => 'site', 'turnstile_secret_key' => 'secret' ] );
		$result = $this->guard()->check( $this->form( 'turnstile' ), [], '203.0.113.5', 'UA', true );
		$this->assertSame( GuardResult::PASS, $result->verdict );
		$this->assertSame( [], $this->store->rows );
		$this->assertSame( [], \WP_Test_State::$requests );
		$this->assertSame( [ 'builtin', 'rate_limit', 'captcha' ], array_column( $result->steps, 'step' ) );
	}
}
