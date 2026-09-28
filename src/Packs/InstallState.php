<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

defined( 'ABSPATH' ) || exit;

/**
 * Records which packs have been installed and at what version, so the catalog
 * can show an Installed (or Update) chip and the importer can refuse a
 * duplicate install. One option, a flat map of pack id to install metadata.
 */
final class InstallState {
	private const OPTION = 'flexa_formflow_installed_packs';

	/**
	 * @return array<string, array{version: string, installed_at: string}>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION, [] );

		return is_array( $stored ) ? $stored : [];
	}

	public static function is_installed( string $pack_id ): bool {
		return array_key_exists( $pack_id, self::all() );
	}

	public static function version_of( string $pack_id ): string {
		return (string) ( self::all()[ $pack_id ]['version'] ?? '' );
	}

	public static function mark( string $pack_id, string $version ): void {
		$state             = self::all();
		$state[ $pack_id ] = [
			'version'      => $version,
			'installed_at' => current_time( 'mysql', true ),
		];

		update_option( self::OPTION, $state );
	}
}
