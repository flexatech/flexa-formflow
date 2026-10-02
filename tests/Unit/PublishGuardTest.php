<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Api\FormsEndpoint;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Support\Settings;
use PHPUnit\Framework\TestCase;

final class PublishGuardTest extends TestCase {
	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	private function form( string $status, string $captcha ): Form {
		return new Form( 3, 'uuid', 'Contact', $status, [ 'settings' => [ 'captcha' => $captcha ] ], '', '' );
	}

	/**
	 * @param array<string, mixed> $fields
	 */
	private function blocks( Form $current, array $fields ): mixed {
		$method = new \ReflectionMethod( FormsEndpoint::class, 'captcha_blocks_publish' );

		return $method->invoke( new FormsEndpoint(), $current, $fields );
	}

	public function test_a_draft_may_pick_a_provider_without_keys(): void {
		$this->assertNull( $this->blocks( $this->form( 'draft', 'none' ), [ 'config' => [ 'settings' => [ 'captcha' => 'turnstile' ] ] ] ) );
	}

	public function test_publishing_with_a_keyless_provider_is_refused_with_a_settings_link(): void {
		$error = $this->blocks( $this->form( 'draft', 'turnstile' ), [ 'status' => 'published' ] );
		$this->assertTrue( $error instanceof \WP_Error );
		$this->assertSame( 422, $error->get_error_data()['status'] );
		$this->assertStringContainsString( '#/settings', $error->get_error_data()['settings_url'] );
	}

	public function test_a_live_form_cannot_switch_to_a_keyless_provider(): void {
		$error = $this->blocks( $this->form( 'published', 'none' ), [ 'config' => [ 'settings' => [ 'captcha' => 'recaptcha_v2' ] ] ] );
		$this->assertTrue( $error instanceof \WP_Error );
	}

	public function test_publishing_with_keys_or_without_captcha_is_allowed(): void {
		$this->assertNull( $this->blocks( $this->form( 'draft', 'none' ), [ 'status' => 'published' ] ) );
		Settings::save( [ 'turnstile_site_key' => 'site', 'turnstile_secret_key' => 'secret' ] );
		$this->assertNull( $this->blocks( $this->form( 'draft', 'turnstile' ), [ 'status' => 'published' ] ) );
	}

	public function test_editing_an_already_live_form_whose_keys_were_removed_is_not_blocked(): void {
		// Its submissions fail closed and the dashboard warns; other edits still save.
		$this->assertNull( $this->blocks( $this->form( 'published', 'turnstile' ), [ 'title' => 'New title' ] ) );
	}
}
