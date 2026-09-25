<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Entries;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- data-access class for our own tables; table names come from Schema, values go through $wpdb->prepare().

final class EntryRepository {
	use HasInstance;

	public function find( int $id ): ?Entry {
		global $wpdb;

		$table = Schema::entries_table();
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );

		return is_array( $row ) ? Entry::from_row( $row ) : null;
	}

	/**
	 * @param array<string, mixed> $args
	 * @return array{items: list<Entry>, total: int}
	 */
	public function all( array $args = [] ): array {
		global $wpdb;

		$table    = Schema::entries_table();
		$form_id  = (int) ( $args['form_id'] ?? 0 );
		$status   = (string) ( $args['status'] ?? '' );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$per_page = max( 1, min( 100, (int) ( $args['per_page'] ?? 20 ) ) );

		$where  = 'WHERE 1=1';
		$params = [];
		if ( $form_id > 0 ) {
			$where   .= ' AND form_id = %d';
			$params[] = $form_id;
		}
		if ( in_array( $status, [ 'unread', 'read' ], true ) ) {
			$where   .= ' AND status = %s';
			$params[] = $status;
		}

		$total_sql = "SELECT COUNT(*) FROM {$table} {$where}";
		$total     = (int) $wpdb->get_var( [] === $params ? $total_sql : $wpdb->prepare( $total_sql, ...$params ) );

		$offset = ( $page - 1 ) * $per_page;
		$rows   = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} {$where} ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d",
				...array_merge( $params, [ $per_page, $offset ] )
			),
			ARRAY_A
		);

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = Entry::from_row( $row );
		}

		return [
			'items' => $items,
			'total' => $total,
		];
	}

	/**
	 * @param array<string, mixed> $data
	 * @param array<string, mixed> $meta
	 */
	public function create( int $form_id, array $data, array $meta = [] ): int {
		global $wpdb;

		$wpdb->insert(
			Schema::entries_table(),
			[
				'form_id'    => $form_id,
				'status'     => 'unread',
				'data'       => (string) wp_json_encode( $data ),
				'meta'       => (string) wp_json_encode( $meta ),
				'created_at' => current_time( 'mysql', true ),
			],
			[ '%d', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	public function set_status( int $id, string $status ): bool {
		global $wpdb;

		if ( ! in_array( $status, [ 'unread', 'read' ], true ) ) {
			return false;
		}

		$updated = $wpdb->update(
			Schema::entries_table(),
			[ 'status' => $status ],
			[ 'id' => $id ],
			[ '%s' ],
			[ '%d' ]
		);

		return false !== $updated;
	}

	public function delete( int $id ): bool {
		global $wpdb;

		return false !== $wpdb->delete( Schema::entries_table(), [ 'id' => $id ], [ '%d' ] );
	}

	/**
	 * @return array{total: int, unread: int, last_7_days: int}
	 */
	public function counts(): array {
		global $wpdb;

		$table = Schema::entries_table();

		return [
			'total'       => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ),
			'unread'      => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE status = 'unread'" ),
			'last_7_days' => (int) $wpdb->get_var(
				$wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE created_at >= %s", gmdate( 'Y-m-d H:i:s', time() - 7 * DAY_IN_SECONDS ) )
			),
		];
	}
}
