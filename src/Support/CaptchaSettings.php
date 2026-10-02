<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

use Flexa\FormFlow\Spam\Captcha\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * The spam-protection part of the settings option: the default CAPTCHA for new
 * forms and each provider's keys (`{id}_site_key`, `{id}_secret_key`).
 *
 * Secret keys follow the AI key's lifecycle: encrypted at rest with
 * {@see Encryption} (AES-256-GCM, key from the WordPress salts or
 * FLEXA_FORMFLOW_ENCRYPTION_KEY, never stored next to the ciphertext); sent to
 * the browser only as {@see Settings::SECRET_MASK}; the mask coming back means
 * "unchanged" and an empty string means "remove". Threat model: a leaked
 * database alone does not reveal the secrets; someone who can read
 * wp-config.php (or run code on the site) can, as with any WordPress secret.
 */
final class CaptchaSettings {
	private const KEY_PATTERN = '/^[A-Za-z0-9_.\-]{1,200}$/';

	/**
	 * @return array<string, string>
	 */
	public static function defaults(): array {
		$out = [ 'captcha_default' => Registry::NONE ];
		foreach ( array_keys( Registry::providers() ) as $id ) {
			$out[ $id . '_site_key' ]   = '';
			$out[ $id . '_secret_key' ] = '';
		}

		return $out;
	}

	/**
	 * Stored values coerced to shape (secrets left encrypted).
	 *
	 * @param array<string, mixed> $stored
	 * @return array<string, string>
	 */
	public static function coerce( array $stored ): array {
		$out                    = self::defaults();
		$out['captcha_default'] = Registry::coerce( $stored['captcha_default'] ?? Registry::NONE );
		foreach ( array_keys( Registry::providers() ) as $id ) {
			foreach ( [ '_site_key', '_secret_key' ] as $suffix ) {
				if ( isset( $stored[ $id . $suffix ] ) && is_string( $stored[ $id . $suffix ] ) ) {
					$out[ $id . $suffix ] = $stored[ $id . $suffix ];
				}
			}
		}

		return $out;
	}

	/**
	 * Sanitize the spam keys of an incoming (partial) payload.
	 *
	 * @param array<string, mixed> $incoming
	 * @return array<string, string>
	 */
	public static function sanitize( array $incoming ): array {
		$clean = [];
		if ( array_key_exists( 'captcha_default', $incoming ) ) {
			$clean['captcha_default'] = Registry::coerce( $incoming['captcha_default'] );
		}
		foreach ( array_keys( Registry::providers() ) as $id ) {
			$site = $id . '_site_key';
			if ( array_key_exists( $site, $incoming ) && is_string( $incoming[ $site ] ) ) {
				$clean[ $site ] = self::clean_key( $incoming[ $site ] );
			}
			$secret = $id . '_secret_key';
			if ( array_key_exists( $secret, $incoming ) && is_string( $incoming[ $secret ] ) ) {
				$value = trim( $incoming[ $secret ] );
				// The mask means "unchanged": leave the stored ciphertext alone.
				if ( Settings::SECRET_MASK !== $value ) {
					$value            = self::clean_key( $value );
					$clean[ $secret ] = '' === $value ? '' : Encryption::encrypt( $value );
				}
			}
		}

		return $clean;
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function decrypt( array $settings ): array {
		foreach ( array_keys( Registry::providers() ) as $id ) {
			$settings[ $id . '_secret_key' ] = Encryption::decrypt( (string) ( $settings[ $id . '_secret_key' ] ?? '' ) );
		}

		return $settings;
	}

	/**
	 * Replace every secret with the mask (or '' when none is stored).
	 *
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function mask( array $settings ): array {
		foreach ( array_keys( Registry::providers() ) as $id ) {
			$settings[ $id . '_secret_key' ] = '' !== (string) ( $settings[ $id . '_secret_key' ] ?? '' ) ? Settings::SECRET_MASK : '';
		}

		return $settings;
	}

	/** Keys are short tokens; anything else (spaces, markup) is dropped. */
	private static function clean_key( string $value ): string {
		$value = trim( $value );

		return 1 === preg_match( self::KEY_PATTERN, $value ) ? $value : '';
	}
}
