<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Logo extends BaseElement {
	public function type(): string {
		return 'logo';
	}

	public function defaults(): array {
		return [
			'image'         => '',
			'width'         => 160,
			'align'         => 'center',
			'alt'           => '',
			'link'          => '{site_url}',
			'color'         => '',
			'paddingTop'    => 28,
			'paddingBottom' => 12,
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		// Side padding: 40px at the top level, none inside Columns (the wrapper has it).
		$px = $this->horizontal_padding( $ctx );

		$align = esc_attr( $this->str( $props, 'align', 'center' ) );
		$link  = esc_url( $this->resolve_text( $this->str( $props, 'link' ), $ctx ) );
		// The image may be a token (`{site_logo_url}` in patterns), so the site's
		// own logo is picked up at send time instead of being copied in.
		$image = esc_url( $this->resolve_text( $this->str( $props, 'image' ), $ctx ) );

		if ( '' === $image ) {
			// No logo set: fall back to the site title as a wordmark.
			$color = $this->color( $props, 'color', (string) $design['brandColor'] );
			$inner = '<span style="font-size:22px;font-weight:700;color:' . esc_attr( $color ) . ';">'
				. esc_html( $this->resolve_text( '{site_title}', $ctx ) ) . '</span>';
		} else {
			$width = max( 40, min( 600, $this->int( $props, 'width', 160 ) ) );
			$alt   = esc_attr( $this->resolve_text( $this->str( $props, 'alt' ), $ctx ) );
			$inner = '<img src="' . $image . '" width="' . $width . '" alt="' . $alt . '" style="display:inline-block;max-width:100%;height:auto;border:0;">';
		}

		if ( '' !== $link ) {
			$inner = '<a href="' . $link . '" style="text-decoration:none;">' . $inner . '</a>';
		}

		// Even top and bottom padding (as header patterns set) centres the logo
		// against a menu beside it; the defaults keep older emails unchanged.
		$top    = max( 0, min( 80, $this->int( $props, 'paddingTop', 28 ) ) );
		$bottom = max( 0, min( 80, $this->int( $props, 'paddingBottom', 12 ) ) );

		return '<tr><td align="' . $align . '" style="padding:' . $top . 'px ' . $px . 'px ' . $bottom . 'px;">' . $inner . '</td></tr>';
	}
}
