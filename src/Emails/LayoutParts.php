<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Per-email resolution of the global header and footer. A template stores a
 * reference (its set, or the default), its own snapshot, or an opt-out per
 * part; this turns that choice into the blocks to render.
 */
final class LayoutParts {
	/**
	 * How one email treats one part of the global layout:
	 *
	 * - `global`: shows the set's part by reference, so editing the set updates
	 *   every email that uses it;
	 * - `override`: shows the email's own copy (`headerOverride` /
	 *   `footerOverride`), taken from the set when the email switched to it and
	 *   never changed by later edits to the set;
	 * - `disabled`: shows nothing (`hideGlobalHeader` / `hideGlobalFooter`).
	 *
	 * @param array<string, mixed> $settings A template tree's `settings`.
	 * @param 'header'|'footer'    $part
	 * @return 'global'|'override'|'disabled'
	 */
	public static function mode( array $settings, string $part ): string {
		if ( ! empty( $settings[ 'header' === $part ? 'hideGlobalHeader' : 'hideGlobalFooter' ] ) ) {
			return 'disabled';
		}

		return isset( $settings[ $part . 'Override' ] ) && is_array( $settings[ $part . 'Override' ] ) ? 'override' : 'global';
	}

	/**
	 * The blocks one part resolves to for these settings, whether or not the
	 * layout currently applies. A set that no longer exists falls back to the
	 * default set; choosing no set (`none`) leaves global parts empty.
	 *
	 * @param array<string, mixed> $settings
	 * @param 'header'|'footer'    $part
	 * @return list<array<string, mixed>>
	 */
	public static function nodes( array $settings, string $part ): array {
		switch ( self::mode( $settings, $part ) ) {
			case 'disabled':
				return [];
			case 'override':
				return array_values( array_filter( $settings[ $part . 'Override' ], 'is_array' ) );
			default:
				$set = GlobalLayout::instance()->set_for( $settings );

				return null === $set ? [] : $set[ $part ];
		}
	}
}
