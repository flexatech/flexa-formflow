<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Support\Settings;
use PHPUnit\Framework\TestCase;

final class CaptchaSettingsTest extends TestCase {
	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	public function test_secret_is_encrypted_at_rest_and_masked_for_the_browser(): void {
		Settings::save( [ 'turnstile_site_key' => 'site-123', 'turnstile_secret_key' => 'top-secret-value' ] );

		$stored = (string) \WP_Test_State::$options[ Settings::OPTION_KEY ]['turnstile_secret_key'];
		$this->assertStringNotContainsString( 'top-secret-value', $stored );
		$this->assertStringNotContainsString( base64_encode( 'top-secret-value' ), $stored );
		$this->assertStringContainsString( 'ffg1:', $stored );

		$rest = Settings::for_rest();
		$this->assertSame( Settings::SECRET_MASK, $rest['turnstile_secret_key'] );
		$this->assertSame( 'site-123', $rest['turnstile_site_key'] );
		$this->assertStringNotContainsString( 'top-secret-value', (string) json_encode( $rest ) );

		$this->assertSame( 'top-secret-value', Settings::all()['turnstile_secret_key'] );
	}

	public function test_mask_keeps_the_secret_and_empty_removes_it(): void {
		Settings::save( [ 'recaptcha_v2_secret_key' => 'keep-me' ] );
		Settings::save( [ 'recaptcha_v2_secret_key' => Settings::SECRET_MASK, 'recaptcha_v2_site_key' => 'new-site' ] );
		$this->assertSame( 'keep-me', Settings::all()['recaptcha_v2_secret_key'] );

		Settings::save( [ 'recaptcha_v2_secret_key' => '' ] );
		$this->assertSame( '', Settings::all()['recaptcha_v2_secret_key'] );
		$this->assertSame( '', Settings::for_rest()['recaptcha_v2_secret_key'] );
	}

	public function test_keys_and_default_are_sanitized(): void {
		Settings::save(
			[
				'turnstile_site_key' => '<script>x</script>',
				'captcha_default'    => 'made-up',
			]
		);
		$this->assertSame( '', Settings::all()['turnstile_site_key'] );
		$this->assertSame( 'none', Settings::all()['captcha_default'] );

		Settings::save( [ 'captcha_default' => 'turnstile' ] );
		$this->assertSame( 'turnstile', Settings::all()['captcha_default'] );
	}

	public function test_form_config_stores_only_a_known_provider_id(): void {
		$this->assertSame( 'none', FieldTypes::sanitize_config( [] )['settings']['captcha'], 'old forms read as none' );
		$this->assertSame( 'turnstile', FieldTypes::sanitize_config( [ 'settings' => [ 'captcha' => 'turnstile' ] ] )['settings']['captcha'] );
		$this->assertSame( 'none', FieldTypes::sanitize_config( [ 'settings' => [ 'captcha' => 'evil' ] ] )['settings']['captcha'] );

		$config = FieldTypes::sanitize_config( [ 'settings' => [ 'captcha' => 'recaptcha_v2', 'secret' => 'x', 'recaptcha_v2_secret_key' => 'y' ] ] );
		$this->assertSame( [ 'submit_label', 'success_message', 'captcha' ], array_keys( $config['settings'] ) );
	}
}
