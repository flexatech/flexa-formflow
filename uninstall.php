<?php

declare(strict_types=1);

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Forms, entries, emails, and workflows are user-created content; only remove
// them when the site owner opted in via the danger-zone setting.
$settings = get_option( 'flexa_formflow_settings', [] );
if ( ! is_array( $settings ) || empty( $settings['delete_data_on_uninstall'] ) ) {
	return;
}

delete_option( 'flexa_formflow_settings' );
delete_option( 'flexa_formflow_onboarding' );
delete_transient( 'flexa_formflow_activation_redirect' );
