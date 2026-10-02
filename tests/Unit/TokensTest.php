<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Domain\Entries\Entry;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Tokens;
use PHPUnit\Framework\TestCase;

final class TokensTest extends TestCase {
	protected function setUp(): void {
		\WP_Test_State::reset();
	}

	private function context( bool $preview, string $answer = '' ): RenderContext {
		$form  = new Form( 1, 'uuid', 'Contact', 'published', [ 'fields' => [ [ 'id' => 'name', 'type' => 'text', 'label' => 'Name' ] ] ], '', '' );
		$entry = Entry::from_row(
			[
				'id'         => 5,
				'form_id'    => 1,
				'status'     => 'unread',
				'data'       => json_encode( [ 'name' => $answer ] ),
				'meta'       => '{}',
				'created_at' => '2026-01-01 10:00:00',
			]
		);

		return new RenderContext( form: $form, entry: $entry, is_preview: $preview );
	}

	public function test_real_send_never_leaves_a_raw_token(): void {
		$out = Tokens::resolve( 'Hi {nope}, {field:gone} from {site_title}', $this->context( false ) );
		$this->assertSame( 'Hi ,  from Acme & Co', $out );
	}

	public function test_preview_keeps_unknown_tokens_visible(): void {
		$this->assertSame( 'Hi {nope}', Tokens::resolve( 'Hi {nope}', $this->context( true ) ) );
	}

	public function test_html_mode_escapes_visitor_answers(): void {
		$ctx  = $this->context( false, '<a href="https://evil.test">click</a>' );
		$html = Tokens::resolve( 'Name: {field:name}', $ctx, Tokens::MODE_HTML );
		$this->assertStringNotContainsString( '<a', $html );
		$this->assertStringContainsString( '&lt;a href=', $html );
		// Raw mode is for callers that escape right after (esc_html, esc_url).
		$this->assertStringContainsString( '<a href=', Tokens::resolve( '{field:name}', $ctx ) );
	}

	public function test_registered_html_tokens_keep_their_markup(): void {
		add_filter( 'flexa_formflow.emails.html_tokens', static fn( array $t ): array => array_merge( $t, [ 'address' ] ) );
		add_filter(
			'flexa_formflow.emails.tokens',
			static fn( array $v ): array => $v + [ 'address' => 'Line 1<br>Line 2<script>x</script>' ],
			10,
			2
		);
		$html = Tokens::resolve( '{address}', $this->context( false ), Tokens::MODE_HTML );
		$this->assertSame( 'Line 1<br>Line 2', $html );
	}

	public function test_fallback_fills_an_empty_value_in_real_sends(): void {
		add_filter( 'flexa_formflow.emails.token_fallbacks', static fn( array $f ): array => $f + [ 'customer_first_name' => 'there' ] );
		add_filter( 'flexa_formflow.emails.tokens', static fn( array $v ): array => $v + [ 'customer_first_name' => '' ], 10, 2 );
		$this->assertSame( 'Hi there', Tokens::resolve( 'Hi {customer_first_name}', $this->context( false ) ) );
	}

	public function test_site_logo_url_comes_from_the_site_identity(): void {
		$this->assertSame( '', Tokens::resolve( '{site_logo_url}', $this->context( false ) ) );
		\WP_Test_State::$logo = 'https://example.test/logo.png';
		$this->assertSame( 'https://example.test/logo.png', Tokens::resolve( '{site_logo_url}', $this->context( false ) ) );
	}

	public function test_catalog_entries_carry_type_contexts_and_fallback(): void {
		foreach ( Tokens::catalog() as $meta ) {
			$this->assertArrayHasKey( 'type', $meta );
			$this->assertArrayHasKey( 'contexts', $meta );
			$this->assertArrayHasKey( 'fallback', $meta );
		}
	}
}
