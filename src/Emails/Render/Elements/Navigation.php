<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * A row of links (header menu, footer links) stored as structured items
 * instead of hand-written anchors. The renderer owns the markup: each label is
 * escaped as text, each URL resolves its merge tags and then goes through
 * esc_url(), and an item whose URL is not a safe link is left out rather than
 * sent broken.
 *
 * Links sit in one table cell joined by an optional separator, with the gap as
 * inline padding: markup every email client lays out on one line and wraps on
 * a narrow screen.
 */
final class Navigation extends BaseElement {
	private const SEPARATORS = [
		'none' => '',
		'dot'  => '&middot;',
		'pipe' => '|',
	];

	public function type(): string {
		return 'navigation';
	}

	public function defaults(): array {
		return [
			'items'     => [],
			'align'     => 'center',
			'gap'       => 16,
			'fontSize'  => 14,
			'color'     => '',
			'separator' => 'none',
			'paddingY'  => 12,
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		// Side padding: 40px at the top level, none inside Columns (the wrapper has it).
		$px = $this->horizontal_padding( $ctx );

		$align     = in_array( $props['align'] ?? '', [ 'left', 'center', 'right' ], true ) ? (string) $props['align'] : 'center';
		$gap       = max( 0, min( 48, $this->int( $props, 'gap', 16 ) ) );
		$size      = max( 10, min( 24, $this->int( $props, 'fontSize', 14 ) ) );
		$pad       = max( 0, min( 60, $this->int( $props, 'paddingY', 12 ) ) );
		$color     = esc_attr( $this->color( $props, 'color', (string) ( $design['linkColor'] ?? $design['brandColor'] ) ) );
		$separator = self::SEPARATORS[ is_string( $props['separator'] ?? null ) ? $props['separator'] : 'none' ] ?? '';
		$half      = (int) floor( $gap / 2 );

		$links = [];
		foreach ( is_array( $props['items'] ?? null ) ? $props['items'] : [] as $item ) {
			$link = is_array( $item ) ? $this->link( $item, $ctx ) : null;
			if ( null !== $link ) {
				$links[] = '<a href="' . $link['url'] . '"' . $link['target'] . ' style="display:inline-block;padding:0 ' . $half . 'px;color:' . $color . ';text-decoration:none;">' . $link['label'] . '</a>';
			}
		}

		if ( [] === $links ) {
			return $ctx->is_preview
				? '<tr><td align="' . $align . '" style="padding:' . $pad . 'px ' . $px . 'px;font-size:12px;color:#9a9a9a;">' . esc_html__( 'Add links in the block settings', 'flexa-formflow' ) . '</td></tr>'
				: '';
		}

		$joint = '' !== $separator ? '<span style="color:#98a2b3;">' . $separator . '</span>' : '';

		return '<tr><td align="' . $align . '" style="padding:' . $pad . 'px ' . $px . 'px;font-size:' . $size . 'px;line-height:1.6;">'
			. implode( $joint, $links )
			. '</td></tr>';
	}

	/**
	 * One item as escaped label, URL and target, or null when it has no label or
	 * no safe URL.
	 *
	 * @param array<int|string, mixed> $item
	 * @return array{label: string, url: string, target: string}|null
	 */
	private function link( array $item, RenderContext $ctx ): ?array {
		$label = trim( $this->resolve_text( is_string( $item['label'] ?? null ) ? $item['label'] : '', $ctx ) );
		$url   = esc_url( $this->resolve_text( is_string( $item['url'] ?? null ) ? trim( $item['url'] ) : '', $ctx ) );
		if ( '' === $label || '' === $url ) {
			return null;
		}

		return [
			'label'  => esc_html( $label ),
			'url'    => $url,
			'target' => '_blank' === ( $item['target'] ?? '' ) ? ' target="_blank" rel="noopener"' : '',
		];
	}
}
