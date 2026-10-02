<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * The one merge-tag resolver: replaces `{token}` and `{field:ID}` in element
 * text. Every other part of the plugin (WooCommerce, add-ons) adds tokens
 * through the `flexa_formflow.emails.tokens` filter instead of replacing text
 * on its own.
 *
 * Editor previews fill tokens without live data with sample values, and leave
 * an unknown token visible so a typo is easy to spot. A real send never shows a
 * raw token: a missing value becomes the token's fallback, which is empty
 * unless one is registered.
 *
 * In `html` mode (rich text blocks) every value is escaped before it lands in
 * the markup, so a visitor's answer can never inject a link or a tag. Tokens
 * whose values are trusted markup (formatted addresses) are registered as HTML
 * and only pass through wp_kses_post().
 */
final class Tokens {
	public const MODE_RAW  = 'raw';
	public const MODE_HTML = 'html';

	public static function resolve( string $text, RenderContext $ctx, string $mode = self::MODE_RAW ): string {
		if ( ! str_contains( $text, '{' ) ) {
			return $text;
		}

		$values    = self::values( $ctx );
		$fields    = self::field_values( $ctx );
		$fallbacks = $ctx->is_preview ? [] : self::fallbacks();
		$html      = self::MODE_HTML === $mode ? self::html_tokens() : [];
		$preview   = $ctx->is_preview;

		return (string) preg_replace_callback(
			'/\{([a-z0-9_:]+)\}/',
			static function ( array $match ) use ( $values, $fields, $fallbacks, $html, $mode, $preview ): string {
				$token = $match[1];

				if ( str_starts_with( $token, 'field:' ) ) {
					$field_id = substr( $token, 6 );
					$value    = array_key_exists( $field_id, $fields ) ? $fields[ $field_id ] : null;
				} else {
					$value = array_key_exists( $token, $values ) ? (string) $values[ $token ] : null;
				}

				if ( null === $value || '' === $value ) {
					if ( $preview ) {
						// Keep an unknown token visible in the editor; a known but
						// empty one shows as empty, like the real email.
						return null === $value ? $match[0] : '';
					}
					$value = $fallbacks[ $token ] ?? '';
				}

				if ( self::MODE_HTML !== $mode ) {
					return $value;
				}

				return in_array( $token, $html, true ) ? wp_kses_post( $value ) : esc_html( $value );
			},
			$text
		);
	}

	/**
	 * Global (non-field) token metadata: label, value type, the email kinds it
	 * has data in, and the fallback a real send uses when it has none.
	 *
	 * @return list<array{token: string, label: string, type: string, contexts: list<string>, fallback: string}>
	 */
	public static function catalog(): array {
		$all  = [ 'form', 'woo' ];
		$form = [ 'form' ];

		return [
			self::meta( '{site_title}', __( 'Site title', 'flexa-formflow' ), 'text', $all ),
			self::meta( '{site_tagline}', __( 'Site tagline', 'flexa-formflow' ), 'text', $all ),
			self::meta( '{site_url}', __( 'Site URL', 'flexa-formflow' ), 'url', $all ),
			self::meta( '{site_logo_url}', __( 'Site logo image URL (empty when no logo is set)', 'flexa-formflow' ), 'image', $all ),
			self::meta( '{admin_email}', __( 'Admin email', 'flexa-formflow' ), 'email', $all ),
			self::meta( '{year}', __( 'Current year', 'flexa-formflow' ), 'text', $all ),
			self::meta( '{form_title}', __( 'Form title', 'flexa-formflow' ), 'text', $form ),
			self::meta( '{entry_id}', __( 'Entry ID', 'flexa-formflow' ), 'text', $form ),
			self::meta( '{entry_date}', __( 'Submission date', 'flexa-formflow' ), 'date', $form ),
			self::meta( '{page_url}', __( 'Submission page URL', 'flexa-formflow' ), 'url', $form ),
		];
	}

	/**
	 * @param list<string> $contexts
	 * @return array{token: string, label: string, type: string, contexts: list<string>, fallback: string}
	 */
	public static function meta( string $token, string $label, string $type, array $contexts, string $fallback = '' ): array {
		return [
			'token'    => $token,
			'label'    => $label,
			'type'     => $type,
			'contexts' => $contexts,
			'fallback' => $fallback,
		];
	}

	/**
	 * Fallback values by token name (no braces), for real sends.
	 *
	 * @return array<string, string>
	 */
	public static function fallbacks(): array {
		$fallbacks = [];
		foreach ( self::catalog() as $meta ) {
			$fallbacks[ trim( $meta['token'], '{}' ) ] = $meta['fallback'];
		}

		/**
		 * Fallbacks for tokens that have no value in a real send. Keys are token
		 * names without braces. Anything not listed falls back to an empty string.
		 *
		 * @param array<string, string> $fallbacks
		 */
		$filtered = apply_filters( 'flexa_formflow.emails.token_fallbacks', $fallbacks );

		return is_array( $filtered ) ? array_map( 'strval', $filtered ) : $fallbacks;
	}

	/**
	 * Token names whose values are trusted markup rather than plain text.
	 *
	 * @return list<string>
	 */
	public static function html_tokens(): array {
		/**
		 * @param list<string> $tokens Token names without braces.
		 */
		$tokens = apply_filters( 'flexa_formflow.emails.html_tokens', [] );

		return is_array( $tokens ) ? array_values( array_filter( $tokens, 'is_string' ) ) : [];
	}

	/**
	 * The site's own logo (Appearance > Customize > Site Identity), or '' so the
	 * logo block falls back to the site name. Filterable for brand plugins.
	 */
	public static function site_logo_url(): string {
		$id  = (int) get_theme_mod( 'custom_logo' );
		$url = $id > 0 ? (string) wp_get_attachment_image_url( $id, 'full' ) : '';

		/**
		 * @param string $url Absolute logo URL, or '' for none.
		 */
		return (string) apply_filters( 'flexa_formflow.emails.site_logo_url', $url );
	}

	/**
	 * @return array<string, string>
	 */
	private static function values( RenderContext $ctx ): array {
		$values = [
			'site_title'    => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			'site_tagline'  => wp_specialchars_decode( get_bloginfo( 'description' ), ENT_QUOTES ),
			'site_url'      => home_url(),
			'site_logo_url' => self::site_logo_url(),
			'admin_email'   => (string) get_option( 'admin_email' ),
			'year'          => (string) gmdate( 'Y' ),
			'form_title'    => null !== $ctx->form ? $ctx->form->title : '',
			'entry_id'      => null !== $ctx->entry ? (string) $ctx->entry->id : '',
			'entry_date'    => null !== $ctx->entry
				? date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $ctx->entry->created_at . ' UTC' ) ?: null )
				: '',
			'page_url'      => null !== $ctx->entry ? (string) ( $ctx->entry->meta['referer'] ?? '' ) : '',
		];

		if ( $ctx->is_preview ) {
			$values['form_title'] = '' !== $values['form_title'] ? $values['form_title'] : __( 'Contact form', 'flexa-formflow' );
			$values['entry_id']   = '' !== $values['entry_id'] ? $values['entry_id'] : '123';
			$values['entry_date'] = '' !== $values['entry_date'] ? $values['entry_date'] : date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ) );
			$values['page_url']   = '' !== $values['page_url'] ? $values['page_url'] : home_url( '/contact/' );
		}

		/**
		 * Filter the resolved global token values (addons add their own tokens).
		 *
		 * @param array<string, string> $values
		 * @param RenderContext         $ctx
		 */
		return apply_filters( 'flexa_formflow.emails.tokens', $values, $ctx );
	}

	/**
	 * Per-field values keyed by field id, for {field:ID} tokens.
	 *
	 * @return array<string, string>
	 */
	private static function field_values( RenderContext $ctx ): array {
		if ( null === $ctx->form ) {
			return [];
		}

		$data   = null !== $ctx->entry ? $ctx->entry->data : [];
		$values = [];
		foreach ( $ctx->form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id ) {
				continue;
			}

			// An entry that answered this field, even blank (array_key_exists is
			// true for '' and []), still counts as "no real value" here: preview
			// falls back to a sample the same as when the entry has no answer at
			// all, so the design never renders blank (see OrderTokens::sample_values()).
			$value    = array_key_exists( $field_id, $data ) ? $data[ $field_id ] : null;
			$resolved = is_array( $value ) ? implode( ', ', array_map( 'strval', $value ) ) : (string) ( $value ?? '' );

			if ( '' !== $resolved ) {
				$values[ $field_id ] = $resolved;
			} elseif ( $ctx->is_preview ) {
				$values[ $field_id ] = FieldTypes::sample_value( $field );
			} else {
				$values[ $field_id ] = '';
			}
		}

		return $values;
	}
}
