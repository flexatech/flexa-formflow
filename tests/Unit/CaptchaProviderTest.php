<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Spam\Captcha\RecaptchaV2Provider;
use Flexa\FormFlow\Spam\Captcha\SubmissionContext;
use Flexa\FormFlow\Spam\Captcha\TurnstileProvider;
use Flexa\FormFlow\Spam\Captcha\VerificationResult;
use Flexa\FormFlow\Support\Settings;
use PHPUnit\Framework\TestCase;

final class CaptchaProviderTest extends TestCase {
	private const UUID = '0b6a5f2e-1111-4222-8333-944455556666';

	protected function setUp(): void {
		\WP_Test_State::reset();
		Settings::save(
			[
				'turnstile_site_key'      => '0x4AAAAAAAsite',
				'turnstile_secret_key'    => '0x4AAAAAAAsecret',
				'recaptcha_v2_site_key'   => '6Lsite',
				'recaptcha_v2_secret_key' => '6Lsecret',
			]
		);
	}

	private function context(): SubmissionContext {
		return new SubmissionContext( self::UUID, '203.0.113.5', SubmissionContext::site_hostnames() );
	}

	/**
	 * @param array<string, mixed>|null $body
	 */
	private function respond( ?array $body, int $code = 200, string $raw = '' ): void {
		\WP_Test_State::$http = static fn(): array => [
			'response' => [ 'code' => $code ],
			'body'     => null !== $body ? (string) json_encode( $body ) : $raw,
		];
	}

	private function turnstile_ok(): array {
		return [
			'success'  => true,
			'hostname' => 'example.test',
			'action'   => 'flexa_formflow_submit',
			'cdata'    => self::UUID,
		];
	}

	public function test_turnstile_accepts_a_matching_token_and_sends_the_secret_server_side(): void {
		$this->respond( $this->turnstile_ok() );
		$result = ( new TurnstileProvider() )->verify( 'tok', $this->context() );
		$this->assertTrue( $result->ok );
		$request = \WP_Test_State::$requests[0];
		$this->assertSame( 'https://challenges.cloudflare.com/turnstile/v0/siteverify', $request['url'] );
		$this->assertSame( '0x4AAAAAAAsecret', $request['args']['body']['secret'] );
		$this->assertGreaterThanOrEqual( 1, $request['args']['timeout'] );
	}

	public function test_turnstile_rejects_another_form_action_or_host(): void {
		foreach ( [ [ 'cdata' => 'other-form' ], [ 'action' => 'login' ], [ 'hostname' => 'evil.test' ], [ 'hostname' => '' ] ] as $change ) {
			$this->respond( array_merge( $this->turnstile_ok(), $change ) );
			$result = ( new TurnstileProvider() )->verify( 'tok', $this->context() );
			$this->assertFalse( $result->ok, (string) json_encode( $change ) );
			$this->assertSame( VerificationResult::MISMATCH, $result->code );
		}
	}

	public function test_fails_closed_on_network_http_and_bad_json(): void {
		\WP_Test_State::$http = static fn() => new \WP_Error( 'http_request_failed', 'timeout' );
		$this->assertSame( VerificationResult::UNAVAILABLE, ( new TurnstileProvider() )->verify( 'tok', $this->context() )->code );

		$this->respond( $this->turnstile_ok(), 500 );
		$this->assertSame( VerificationResult::UNAVAILABLE, ( new TurnstileProvider() )->verify( 'tok', $this->context() )->code );

		$this->respond( null, 200, '<html>oops</html>' );
		$this->assertSame( VerificationResult::UNAVAILABLE, ( new TurnstileProvider() )->verify( 'tok', $this->context() )->code );

		$this->respond( [ 'hostname' => 'example.test' ] );
		$this->assertFalse( ( new TurnstileProvider() )->verify( 'tok', $this->context() )->ok, 'no success flag is a failure' );
	}

	public function test_maps_provider_error_codes(): void {
		$this->respond( [ 'success' => false, 'error-codes' => [ 'timeout-or-duplicate' ] ] );
		$this->assertSame( VerificationResult::EXPIRED, ( new RecaptchaV2Provider() )->verify( 'tok', $this->context() )->code );

		$this->respond( [ 'success' => false, 'error-codes' => [ 'invalid-input-response' ] ] );
		$this->assertSame( VerificationResult::INVALID, ( new RecaptchaV2Provider() )->verify( 'tok', $this->context() )->code );
	}

	public function test_missing_token_never_calls_the_provider(): void {
		$this->respond( $this->turnstile_ok() );
		$this->assertSame( VerificationResult::MISSING, ( new RecaptchaV2Provider() )->verify( '  ', $this->context() )->code );
		$this->assertSame( [], \WP_Test_State::$requests );
	}

	public function test_recaptcha_checks_the_hostname(): void {
		$this->respond( [ 'success' => true, 'hostname' => 'example.test' ] );
		$this->assertTrue( ( new RecaptchaV2Provider() )->verify( 'tok', $this->context() )->ok );
		$this->respond( [ 'success' => true, 'hostname' => 'phish.test' ] );
		$this->assertFalse( ( new RecaptchaV2Provider() )->verify( 'tok', $this->context() )->ok );
	}

	public function test_unconfigured_provider_fails_closed(): void {
		Settings::save( [ 'turnstile_secret_key' => '' ] );
		$result = ( new TurnstileProvider() )->verify( 'tok', $this->context() );
		$this->assertSame( VerificationResult::NOT_CONFIGURED, $result->code );
		$this->assertFalse( $result->retryable() );
	}

	public function test_key_test_tells_a_bad_secret_from_a_good_one(): void {
		$this->respond( [ 'success' => false, 'error-codes' => [ 'invalid-input-response' ] ] );
		$this->assertTrue( ( new TurnstileProvider() )->test_keys()->ok );

		$this->respond( [ 'success' => false, 'error-codes' => [ 'invalid-input-secret' ] ] );
		$this->assertSame( VerificationResult::INVALID_SECRET, ( new TurnstileProvider() )->test_keys()->code );
	}

	public function test_visitor_messages_never_leak_internals(): void {
		foreach ( [ 'missing', 'invalid', 'expired', 'replayed', 'mismatch', 'unavailable', 'not_configured' ] as $code ) {
			$message = VerificationResult::failure( $code )->message;
			$this->assertNotSame( '', $message );
			$this->assertStringNotContainsString( 'secret', strtolower( $message ) );
			$this->assertStringNotContainsString( 'hostname', strtolower( $message ) );
		}
	}
}
