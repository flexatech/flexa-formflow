<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Maintenance;

use Flexa\FormFlow\Database\Schema;
use Flexa\FormFlow\Emails\GlobalLayout;
use Flexa\FormFlow\Packs\InstallState;
use Flexa\FormFlow\Spam\SpamStats;
use Flexa\FormFlow\Support\OnboardingState;
use Flexa\FormFlow\Support\RenderCache;
use Flexa\FormFlow\Support\Settings;
use Flexa\FormFlow\WooCommerce\WooEmailRepository;

defined( 'ABSPATH' ) || exit;

/**
 * The single destructive path. Any future danger-zone REST endpoint or CLI
 * command must call this — never inline a second delete path. As domain data
 * arrives (emails, workflows), its removal is added HERE.
 */
final class Eraser {
	public static function erase_all(): void {
		Schema::drop();
		delete_option( Settings::OPTION_KEY );
		delete_option( OnboardingState::OPTION_KEY );
		delete_option( WooEmailRepository::OPTION_KEY );
		// Must go with the tables: a surviving install stamp would leave every
		// pack reading as installed on an empty site, and refusing to install.
		delete_option( InstallState::OPTION_KEY );
		delete_option( GlobalLayout::OPTION_KEY );
		delete_option( SpamStats::OPTION_KEY );
		delete_option( RenderCache::REV_OPTION );

		do_action( 'flexa_formflow.data_reset' );
	}
}
