<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Maintenance;

use Flexa\FormFlow\Database\Schema;
use Flexa\FormFlow\Support\OnboardingState;
use Flexa\FormFlow\Support\Settings;

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

		do_action( 'flexa_formflow.data_reset' );
	}
}
