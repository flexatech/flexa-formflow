<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * The header/footer sets a user can start from: an empty one and two ready
 * designs built only from existing blocks (logo, divider, social, footer text),
 * so they pick up the site logo and name on their own. Adding one always makes a
 * copy the user then owns; the presets themselves never change.
 */
final class LayoutPresets {
	/**
	 * @return array<string, string> Preset key => label.
	 */
	public static function labels(): array {
		return [
			'blank'   => __( 'Blank', 'flexa-formflow' ),
			'classic' => __( 'Classic', 'flexa-formflow' ),
			'modern'  => __( 'Modern', 'flexa-formflow' ),
		];
	}

	/**
	 * @return array{header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
	 */
	public static function build( string $key ): array {
		switch ( $key ) {
			case 'classic':
				return [
					'header' => [ self::node( 'logo' ) ],
					'footer' => [ self::node( 'divider' ), self::node( 'footer_text' ) ],
				];
			case 'modern':
				return [
					'header' => [
						self::node(
							'logo',
							[
								'align' => 'left',
								'width' => 120,
							]
						),
						self::node(
							'divider',
							[
								'color'     => '#d0d5dd',
								'thickness' => 2,
								'paddingY'  => 4,
							]
						),
					],
					'footer' => [
						self::node( 'divider' ),
						self::node( 'social' ),
						self::node( 'footer_text', [ 'align' => 'left' ] ),
					],
				];
			default:
				return [
					'header' => [],
					'footer' => [],
				];
		}
	}

	/**
	 * @param array<string, mixed> $props
	 * @return array<string, mixed>
	 */
	public static function node( string $type, array $props = [] ): array {
		return [
			'id'    => 'el_' . substr( md5( uniqid( $type, true ) ), 0, 10 ),
			'type'  => $type,
			'props' => $props,
		];
	}
}
