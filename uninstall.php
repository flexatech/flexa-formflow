<?php

declare(strict_types=1);

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Forms, entries, emails, and workflows are user-created content; only remove
// them when the site owner opted in via the danger-zone setting.
$settings = get_option( 'flexa_formflow_settings', [] );
if ( ! is_array( $settings ) || empty( $settings['delete_data_on_uninstall'] ) ) {
	return;
}

global $wpdb;

// Standalone on purpose: uninstall runs without the plugin loaded, so no
// autoloader or classes here — table names are duplicated from Database\Schema.
// phpcs:disable WordPress.DB.DirectDatabaseQuery -- destructive teardown of our own tables.
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}flexa_formflow_entries" );
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}flexa_formflow_forms" );
// phpcs:enable

delete_option( 'flexa_formflow_settings' );
delete_option( 'flexa_formflow_onboarding' );
delete_option( 'flexa_formflow_db_version' );
delete_transient( 'flexa_formflow_activation_redirect' );
