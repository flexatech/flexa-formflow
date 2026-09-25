<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the custom tables. `migrate()` runs on activation; `maybe_upgrade()`
 * runs on admin_init and re-migrates when DB_VERSION moves, so updates never
 * need a manual re-activation.
 */
final class Schema {
	public const DB_VERSION  = 3;
	public const VERSION_KEY = 'flexa_formflow_db_version';

	public static function forms_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_forms';
	}

	public static function entries_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_entries';
	}

	public static function email_templates_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_email_templates';
	}

	public static function workflows_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_workflows';
	}

	public static function maybe_upgrade(): void {
		if ( (int) get_option( self::VERSION_KEY, 0 ) < self::DB_VERSION ) {
			self::migrate();
		}
	}

	public static function migrate(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$forms           = self::forms_table();
		$entries         = self::entries_table();
		$email_templates = self::email_templates_table();
		$workflows       = self::workflows_table();

		dbDelta(
			"CREATE TABLE {$forms} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				uuid CHAR(36) NOT NULL,
				title VARCHAR(190) NOT NULL DEFAULT '',
				status VARCHAR(20) NOT NULL DEFAULT 'draft',
				config LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY status (status)
			) {$charset_collate};"
		);

		dbDelta(
			"CREATE TABLE {$entries} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				form_id BIGINT UNSIGNED NOT NULL,
				status VARCHAR(20) NOT NULL DEFAULT 'unread',
				data LONGTEXT NOT NULL,
				meta LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				KEY form_status (form_id, status),
				KEY created_at (created_at)
			) {$charset_collate};"
		);

		dbDelta(
			"CREATE TABLE {$email_templates} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				title VARCHAR(190) NOT NULL DEFAULT '',
				tree LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				PRIMARY KEY  (id)
			) {$charset_collate};"
		);

		dbDelta(
			"CREATE TABLE {$workflows} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				title VARCHAR(190) NOT NULL DEFAULT '',
				status VARCHAR(20) NOT NULL DEFAULT 'inactive',
				config LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				KEY status (status)
			) {$charset_collate};"
		);

		update_option( self::VERSION_KEY, self::DB_VERSION );
	}

	public static function drop(): void {
		global $wpdb;

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- destructive teardown of our own tables; names are not user input.
		$wpdb->query( 'DROP TABLE IF EXISTS ' . self::workflows_table() );
		$wpdb->query( 'DROP TABLE IF EXISTS ' . self::email_templates_table() );
		$wpdb->query( 'DROP TABLE IF EXISTS ' . self::entries_table() );
		$wpdb->query( 'DROP TABLE IF EXISTS ' . self::forms_table() );
		// phpcs:enable

		delete_option( self::VERSION_KEY );
	}
}
