<?php

declare(strict_types=1);

namespace Flexa\FormFlow;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

final class Plugin {
	use HasInstance;

	private bool $booted = false;

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		Api\Router::instance()->register();

		add_action( 'admin_init', [ Database\Schema::class, 'maybe_upgrade' ] );

		Frontend\Shortcode::instance()->register();
		Frontend\Block::instance()->register();
		Emails\Notifications::instance()->register();

		// Future domain subsystems (email builder, workflows) register here.
		// WooCommerce email takeover gates on class_exists( \WooCommerce::class )
		// at that point, never at boot.

		if ( is_admin() ) {
			Admin\Menu::instance()->register();
			Admin\Enqueue::instance()->register();
			Admin\ActivationRedirect::instance()->register();
		}
	}
}
