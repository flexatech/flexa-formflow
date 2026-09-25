<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Domain\Packs\PackContent;
use Flexa\FormFlow\Domain\Packs\PackManifest;

defined( 'ABSPATH' ) || exit;

/**
 * Decides what may be installed. The gate is the Pro *capability*, not the store
 * purchase: a pack whose content uses only Free capabilities installs on Free
 * (it sells a ready-made pipeline, not a locked feature). Content marked
 * `requires_pro` is skipped on Free with a visible reason. Pro presence is a
 * single filter, defaulting to false, so Free never ships a licensing check.
 */
final class Entitlement {

	public static function pro_licensed(): bool {
		/**
		 * Whether the Pro engine is licensed. Free returns false; the Pro add-on
		 * short-circuits this to true.
		 *
		 * @param bool $licensed
		 */
		return (bool) apply_filters( 'flexa_formflow.pro.is_licensed', false );
	}

	public static function can_install( PackManifest $manifest ): bool {
		return ! $manifest->requires_pro || self::pro_licensed();
	}

	public static function content_available( PackContent $content ): bool {
		return ! $content->requires_pro || self::pro_licensed();
	}
}
