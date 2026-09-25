<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Library;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- data-access class for our own tables; table names come from Schema, values go through $wpdb->prepare().

final class LibraryRepository {
	use HasInstance;

	public const TYPES = [ 'pattern', 'template', 'recipe' ];
	public const KINDS = [ 'form', 'email', 'workflow', 'woocommerce' ];

	public function find( int $id ): ?LibraryAsset {
		global $wpdb;

		$table = Schema::library_table();
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );

		return is_array( $row ) ? LibraryAsset::from_row( $row ) : null;
	}

	/**
	 * @return list<LibraryAsset>
	 */
	public function all(): array {
		global $wpdb;

		$table = Schema::library_table();
		$rows  = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY updated_at DESC, id DESC", ARRAY_A );

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = LibraryAsset::from_row( $row );
		}

		return $items;
	}

	/**
	 * The provenance lookup a Pack import uses to link (not duplicate) a shared
	 * pattern that another pack already installed.
	 */
	public function find_by_source( string $pack, string $content_id ): ?LibraryAsset {
		global $wpdb;

		if ( '' === $pack || '' === $content_id ) {
			return null;
		}

		$table = Schema::library_table();
		$row   = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE source_pack = %s AND source_content_id = %s LIMIT 1",
				$pack,
				$content_id
			),
			ARRAY_A
		);

		return is_array( $row ) ? LibraryAsset::from_row( $row ) : null;
	}

	/**
	 * @param array<string, mixed> $payload
	 * @param array{pack?: string, contentId?: string, version?: string} $source
	 */
	public function create( string $type, string $name, string $kind, array $payload, array $source = [] ): int {
		global $wpdb;

		$now = current_time( 'mysql', true );
		$wpdb->insert(
			Schema::library_table(),
			[
				'uuid'              => wp_generate_uuid4(),
				'type'             => self::normalize_type( $type ),
				'name'             => sanitize_text_field( $name ),
				'kind'             => self::normalize_kind( $kind ),
				'payload'          => (string) wp_json_encode( $payload ),
				'source_pack'       => sanitize_text_field( (string) ( $source['pack'] ?? '' ) ),
				'source_content_id' => sanitize_text_field( (string) ( $source['contentId'] ?? '' ) ),
				'source_version'    => sanitize_text_field( (string) ( $source['version'] ?? '' ) ),
				'created_at'        => $now,
				'updated_at'        => $now,
			],
			[ '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	public function delete( int $id ): bool {
		global $wpdb;

		return false !== $wpdb->delete( Schema::library_table(), [ 'id' => $id ], [ '%d' ] );
	}

	public function count(): int {
		global $wpdb;

		$table = Schema::library_table();

		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	}

	private static function normalize_type( string $type ): string {
		return in_array( $type, self::TYPES, true ) ? $type : 'pattern';
	}

	private static function normalize_kind( string $kind ): string {
		return in_array( $kind, self::KINDS, true ) ? $kind : 'form';
	}
}
