<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

/**
 * Short-lived server cache for editor renders that are expensive to rebuild
 * and only change with site data: the Dynamic Data sample list and pattern
 * thumbnails. Stored as transients (server side, never a public/page cache).
 *
 * Every key carries a revision that bumps whenever the inputs can change (a new
 * entry, a form save, a settings save), plus the plugin and render schema
 * versions, so a stale render is never served after an edit or an update.
 */
final class RenderCache {
	use HasInstance;

	public const REV_OPTION = 'flexa_formflow_render_rev';
	/** Bump when a renderer change should invalidate every cached render. */
	public const SCHEMA = 3;

	public function register(): void {
		add_action( 'flexa_formflow.entry.created', [ self::class, 'bump' ] );
		add_action( 'flexa_formflow.settings.updated', [ self::class, 'bump' ] );
		add_action( 'flexa_formflow.form.saved', [ self::class, 'bump' ] );
	}

	public static function rev(): int {
		return (int) get_option( self::REV_OPTION, 1 );
	}

	public static function bump(): void {
		update_option( self::REV_OPTION, self::rev() + 1, false );
	}

	/**
	 * The cached value for `$scope` + `$parts`, or `$build()` stored for `$ttl`.
	 *
	 * @template T
	 * @param array<int|string, mixed> $parts Everything the value depends on.
	 * @param callable(): T            $build
	 * @return T
	 */
	public static function remember( string $scope, array $parts, callable $build, int $ttl ): mixed {
		$key    = 'ff_rc_' . md5( $scope . '|' . self::rev() . '|' . self::SCHEMA . '|' . FLEXA_FORMFLOW_VERSION . '|' . wp_json_encode( $parts ) );
		$cached = get_transient( $key );
		if ( false !== $cached ) {
			return $cached;
		}
		$value = $build();
		set_transient( $key, $value, $ttl );

		return $value;
	}
}
