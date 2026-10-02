<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

/**
 * Counters in the `flexa_formflow_throttle` table. One upsert per hit does the
 * increment (or the window reset) inside MySQL, so concurrent submissions cannot
 * race past a limit the way a read-then-write transient would. Rows hold a
 * hashed bucket and a count only, never an IP; expired rows are swept now and
 * then.
 *
 * A missing table (an update whose migration has not run yet) counts as zero
 * hits rather than breaking submissions.
 */
final class DbCounterStore implements CounterStore {
	public function hit( string $bucket, int $window ): int {
		global $wpdb;

		$now     = time();
		$expires = $now + max( 1, $window );
		$table   = Schema::throttle_table();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery -- atomic counter on our own table; caching would defeat it.
		$suppress = $wpdb->suppress_errors( true );
		$wpdb->query(
			$wpdb->prepare(
				'INSERT INTO %i (bucket, hits, expires_at) VALUES (%s, 1, %d)
				ON DUPLICATE KEY UPDATE hits = IF(expires_at < %d, 1, hits + 1), expires_at = IF(expires_at < %d, %d, expires_at)',
				$table,
				$bucket,
				$expires,
				$now,
				$now,
				$expires
			)
		);
		$hits = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT hits FROM %i WHERE bucket = %s', $table, $bucket ) );

		// Sweep expired rows on roughly one hit in fifty.
		if ( 0 === wp_rand( 0, 49 ) ) {
			$wpdb->query( $wpdb->prepare( 'DELETE FROM %i WHERE expires_at < %d', $table, $now ) );
		}
		$wpdb->suppress_errors( $suppress );
		// phpcs:enable

		return $hits;
	}

	public function peek( string $bucket ): int {
		global $wpdb;

		// phpcs:disable WordPress.DB.DirectDatabaseQuery -- read of our own counter table.
		$suppress = $wpdb->suppress_errors( true );
		$hits     = (int) $wpdb->get_var(
			$wpdb->prepare( 'SELECT hits FROM %i WHERE bucket = %s AND expires_at >= %d', Schema::throttle_table(), $bucket, time() )
		);
		$wpdb->suppress_errors( $suppress );
		// phpcs:enable

		return $hits;
	}
}
