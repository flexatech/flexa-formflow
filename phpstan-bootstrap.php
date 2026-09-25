<?php
/**
 * PHPStan analysis bootstrap (NOT loaded at runtime).
 *
 * The plugin's FLEXA_FORMFLOW_* constants are defined at runtime in flexa-formflow.php
 * via define() inside a PHP-version guard, which static analysis cannot follow
 * across files. Declaring them here lets PHPStan resolve every FLEXA_FORMFLOW_*
 * reference instead of reporting constant.notFound.
 *
 * @package Flexa\FormFlow
 */

declare(strict_types=1);

defined( 'FLEXA_FORMFLOW_VERSION' ) || define( 'FLEXA_FORMFLOW_VERSION', '1.0.0' );
defined( 'FLEXA_FORMFLOW_FILE' ) || define( 'FLEXA_FORMFLOW_FILE', __DIR__ . '/flexa-formflow.php' );
defined( 'FLEXA_FORMFLOW_PATH' ) || define( 'FLEXA_FORMFLOW_PATH', __DIR__ . '/' );
defined( 'FLEXA_FORMFLOW_URL' ) || define( 'FLEXA_FORMFLOW_URL', 'https://example.test/wp-content/plugins/flexa-formflow/' );
defined( 'FLEXA_FORMFLOW_BASENAME' ) || define( 'FLEXA_FORMFLOW_BASENAME', 'flexa-formflow/flexa-formflow.php' );
defined( 'FLEXA_FORMFLOW_REST_NAMESPACE' ) || define( 'FLEXA_FORMFLOW_REST_NAMESPACE', 'flexa-formflow/v1' );
defined( 'FLEXA_FORMFLOW_TEXT_DOMAIN' ) || define( 'FLEXA_FORMFLOW_TEXT_DOMAIN', 'flexa-formflow' );
