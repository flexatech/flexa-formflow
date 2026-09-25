<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Emails\Tokens;

defined( 'ABSPATH' ) || exit;

/**
 * One builder block. Elements emit table rows (`<tr><td>…</td></tr>`) with
 * fully inline styles — the only markup that renders consistently across
 * Gmail, Outlook, and Apple Mail.
 */
abstract class BaseElement {
	abstract public function type(): string;

	/**
	 * @return array<string, mixed>
	 */
	abstract public function defaults(): array;

	/**
	 * @param array<string, mixed> $props  Already merged over {@see defaults()}.
	 * @param array<string, string|int> $design Merged design tokens (backgroundColor,
	 *                                    contentBackground, textColor, brandColor,
	 *                                    width, fontFamily).
	 */
	abstract public function render( array $props, RenderContext $ctx, array $design ): string;

	/**
	 * @param array<string, mixed> $props
	 * @return array<string, mixed>
	 */
	public function merge_props( array $props ): array {
		return array_merge( $this->defaults(), $props );
	}

	protected function resolve_text( string $text, RenderContext $ctx ): string {
		return Tokens::resolve( $text, $ctx );
	}

	/**
	 * Resolve tokens then allow only email-safe inline HTML.
	 */
	protected function rich_text( string $text, RenderContext $ctx ): string {
		$allowed = [
			'a'      => [
				'href'   => true,
				'style'  => true,
				'target' => true,
			],
			'strong' => [ 'style' => true ],
			'b'      => [],
			'em'     => [ 'style' => true ],
			'i'      => [],
			'u'      => [],
			'span'   => [ 'style' => true ],
			'br'     => [],
		];

		return wp_kses( $this->resolve_text( $text, $ctx ), $allowed );
	}

	protected function row( string $inner, string $padding = '12px 40px' ): string {
		return '<tr><td style="padding:' . esc_attr( $padding ) . ';">' . $inner . '</td></tr>';
	}

	/**
	 * @param array<string, mixed> $props
	 */
	protected function str( array $props, string $key, string $fallback = '' ): string {
		return isset( $props[ $key ] ) && is_string( $props[ $key ] ) && '' !== $props[ $key ] ? $props[ $key ] : $fallback;
	}

	/**
	 * @param array<string, mixed> $props
	 */
	protected function int( array $props, string $key, int $fallback = 0 ): int {
		return isset( $props[ $key ] ) && is_numeric( $props[ $key ] ) ? (int) $props[ $key ] : $fallback;
	}
}
