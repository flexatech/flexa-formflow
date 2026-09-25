<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Single source of truth for the `flexa_formflow_settings` option: typed
 * schema, defaults, coerced reads, and the sanitizer used on every write.
 * REST and renderers both go through here so the schema can never drift.
 * Saves are partial-merge: sanitize the incoming keys, merge over stored.
 */
final class Settings {
	public const OPTION_KEY = 'flexa_formflow_settings';

	private const BOOL_KEYS = [
		'delete_data_on_uninstall',
	];

	private const STRING_KEYS = [
		'brand_color',
		'background_color',
		'content_background',
		'text_color',
		'footer_text',
		'font_family',
	];

	private const INT_KEYS = [
		'container_width',
	];

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return [
			'delete_data_on_uninstall' => false,
			'brand_color'              => '#007bea',
			'background_color'         => '#f8fafc',
			'content_background'       => '#ffffff',
			'text_color'               => '#101828',
			'footer_text'              => '© {year} {site_title}',
			'font_family'              => 'Helvetica Neue, Helvetica, Arial, sans-serif',
			'container_width'          => 600,
		];
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION_KEY, [] );
		if ( ! is_array( $stored ) ) {
			$stored = [];
		}

		return self::coerce( $stored );
	}

	public static function get( string $key ): mixed {
		return self::all()[ $key ] ?? null;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function for_rest(): array {
		return self::all();
	}

	/**
	 * Sanitize a (possibly partial) payload, merge over stored, persist, fire
	 * the update hook. Returns the new settings.
	 *
	 * @param array<string, mixed> $incoming
	 * @return array<string, mixed>
	 */
	public static function save( array $incoming ): array {
		$old   = self::all();
		$clean = self::sanitize( $incoming );
		$new   = array_merge( $old, $clean );

		update_option( self::OPTION_KEY, $new );

		do_action( 'flexa_formflow.settings.updated', $new, $old );

		return $new;
	}

	/**
	 * @param array<string, mixed> $incoming
	 * @return array<string, mixed>
	 */
	public static function sanitize( array $incoming ): array {
		$clean = [];

		foreach ( self::BOOL_KEYS as $key ) {
			if ( array_key_exists( $key, $incoming ) ) {
				$clean[ $key ] = self::to_bool( $incoming[ $key ] );
			}
		}
		foreach ( self::STRING_KEYS as $key ) {
			if ( array_key_exists( $key, $incoming ) ) {
				$clean[ $key ] = is_string( $incoming[ $key ] ) ? sanitize_text_field( $incoming[ $key ] ) : '';
			}
		}
		foreach ( self::INT_KEYS as $key ) {
			if ( array_key_exists( $key, $incoming ) ) {
				$clean[ $key ] = is_numeric( $incoming[ $key ] ) ? max( 320, min( 800, (int) $incoming[ $key ] ) ) : 600;
			}
		}

		return $clean;
	}

	/**
	 * @param array<string, mixed> $stored
	 * @return array<string, mixed>
	 */
	private static function coerce( array $stored ): array {
		$out = self::defaults();

		foreach ( self::BOOL_KEYS as $key ) {
			if ( array_key_exists( $key, $stored ) ) {
				$out[ $key ] = self::to_bool( $stored[ $key ] );
			}
		}
		foreach ( self::STRING_KEYS as $key ) {
			if ( isset( $stored[ $key ] ) && is_string( $stored[ $key ] ) ) {
				$out[ $key ] = $stored[ $key ];
			}
		}
		foreach ( self::INT_KEYS as $key ) {
			if ( isset( $stored[ $key ] ) && is_numeric( $stored[ $key ] ) ) {
				$out[ $key ] = (int) $stored[ $key ];
			}
		}

		return $out;
	}

	private static function to_bool( mixed $value ): bool {
		if ( is_string( $value ) ) {
			$value = strtolower( trim( $value ) );
			if ( in_array( $value, [ 'false', '0', '', 'off', 'no' ], true ) ) {
				return false;
			}
		}

		return (bool) $value;
	}
}
