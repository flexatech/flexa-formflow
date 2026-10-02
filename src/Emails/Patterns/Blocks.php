<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns;

defined( 'ABSPATH' ) || exit;

/**
 * Small constructors for the `{type, props}` block shape the pattern library is
 * written in. They only fill in props the existing email blocks already
 * understand, so a pattern is nothing more than a list of ordinary blocks: no
 * markup, no second renderer.
 *
 * `background` is the shared section background every block accepts (see
 * {@see \Flexa\FormFlow\Emails\Render\Renderer::with_background()}), which is
 * what lets a heading, a text and a button read as one dark banner.
 */
final class Blocks {
	public const DARK  = '#14213a';
	public const TINT  = '#eff7ff';
	public const SOFT  = '#f5f7fa';
	public const MUTED = '#667085';
	public const RULE  = '#e4e7ec';

	/**
	 * @param array<string, mixed> $props
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function block( string $type, array $props = [] ): array {
		return [
			'type'  => $type,
			'props' => $props,
		];
	}

	/**
	 * The site logo, falling back to the site name as a wordmark when no logo is
	 * set. Never a hard-coded brand.
	 *
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function logo( string $align = 'center', int $width = 140, array $extra = [] ): array {
		return self::block(
			'logo',
			array_merge(
				[
					'image' => '{site_logo_url}',
					'width' => $width,
					'align' => $align,
					'alt'   => '{site_title}',
					'link'  => '{site_url}',
				],
				$extra
			)
		);
	}

	/**
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function heading( string $text, int $size = 24, string $align = 'left', array $extra = [] ): array {
		return self::block(
			'heading',
			array_merge(
				[
					'text'     => $text,
					'align'    => $align,
					'fontSize' => $size,
				],
				$extra
			)
		);
	}

	/**
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function text( string $html, string $align = 'left', int $size = 15, array $extra = [] ): array {
		return self::block(
			'text',
			array_merge(
				[
					'html'     => $html,
					'align'    => $align,
					'fontSize' => $size,
				],
				$extra
			)
		);
	}

	/**
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function button( string $label, string $url = '{site_url}', string $align = 'center', array $extra = [] ): array {
		return self::block(
			'button',
			array_merge(
				[
					'text'  => $label,
					'url'   => $url,
					'align' => $align,
				],
				$extra
			)
		);
	}

	/**
	 * An image slot. The URL starts empty on purpose: the editor shows a
	 * "Choose an image" placeholder and a real send skips an empty image, so a
	 * pattern never depends on a hotlinked demo picture.
	 *
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function image( string $alt, int $width = 0, string $align = 'center', array $extra = [] ): array {
		return self::block(
			'image',
			array_merge(
				[
					'url'   => '',
					'width' => $width,
					'align' => $align,
					'alt'   => $alt,
					'link'  => '',
				],
				$extra
			)
		);
	}

	/**
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function divider( string $color = self::RULE, int $thickness = 1, int $padding = 12, array $extra = [] ): array {
		return self::block(
			'divider',
			array_merge(
				[
					'color'     => $color,
					'thickness' => $thickness,
					'paddingY'  => $padding,
				],
				$extra
			)
		);
	}

	/**
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function spacer( int $height = 16, array $extra = [] ): array {
		return self::block( 'spacer', array_merge( [ 'height' => $height ], $extra ) );
	}

	/**
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function social( string $align = 'center', array $extra = [] ): array {
		return self::block(
			'social',
			array_merge(
				[
					'align'   => $align,
					'website' => '{site_url}',
				],
				$extra
			)
		);
	}

	/**
	 * Footer small print. An empty `html` inherits the site-wide footer text.
	 *
	 * @param array<string, mixed> $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function footer( string $html = '', string $align = 'center', array $extra = [] ): array {
		return self::block(
			'footer_text',
			array_merge(
				[
					'html'  => $html,
					'align' => $align,
					'color' => '#8a8a8a',
				],
				$extra
			)
		);
	}

	/**
	 * A columns row. Each entry of `$columns` is that column's block list.
	 *
	 * @param list<list<array<string, mixed>>> $columns
	 * @param array<string, mixed>             $extra
	 * @return array{type: string, props: array<string, mixed>, columns: list<list<array<string, mixed>>>}
	 */
	public static function columns( array $columns, array $extra = [] ): array {
		return [
			'type'    => 'columns',
			'props'   => array_merge( [ 'gap' => 16 ], $extra ),
			'columns' => $columns,
		];
	}

	/**
	 * Give every block in a list the same section background, so the group reads
	 * as one band. A block that already has its own background keeps it.
	 *
	 * @param list<array<string, mixed>> $blocks
	 * @return list<array<string, mixed>>
	 */
	public static function band( string $color, array $blocks ): array {
		return array_map(
			static function ( array $block ) use ( $color ): array {
				$props = isset( $block['props'] ) && is_array( $block['props'] ) ? $block['props'] : [];
				if ( ! isset( $props['background'] ) ) {
					$props['background'] = $color;
				}
				$block['props'] = $props;

				return $block;
			},
			$blocks
		);
	}

	/**
	 * A Navigation block: structured links the editor shows as label + URL
	 * fields, never as raw anchors.
	 *
	 * @param array<string, string> $links Label => URL (merge tags allowed).
	 * @param array<string, mixed>  $extra
	 * @return array{type: string, props: array<string, mixed>}
	 */
	public static function nav( array $links, string $align = 'center', array $extra = [] ): array {
		$items = [];
		$n     = 0;
		foreach ( $links as $label => $url ) {
			$items[] = [
				'id'    => 'nav' . ( ++$n ),
				'label' => (string) $label,
				'url'   => $url,
			];
		}

		return self::block(
			'navigation',
			array_merge(
				[
					'items'     => $items,
					'align'     => $align,
					'gap'       => 16,
					'fontSize'  => 13,
					'separator' => 'none',
				],
				$extra
			)
		);
	}
}
