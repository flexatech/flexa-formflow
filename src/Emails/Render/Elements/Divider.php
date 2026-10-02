<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Divider extends BaseElement {
	public function type(): string {
		return 'divider';
	}

	public function defaults(): array {
		return [
			'color'     => '#e6e6e6',
			'thickness' => 1,
			'paddingY'  => 8,
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		// Side padding: 40px at the top level, none inside Columns (the wrapper has it).
		$px = $this->horizontal_padding( $ctx );

		unset( $ctx, $design );
		$color     = esc_attr( $this->color( $props, 'color', '#e6e6e6' ) );
		$thickness = max( 1, min( 8, $this->int( $props, 'thickness', 1 ) ) );
		$pad       = max( 0, min( 60, $this->int( $props, 'paddingY', 8 ) ) );

		return '<tr><td style="padding:' . $pad . 'px ' . $px . 'px;">'
			. '<div style="border-top:' . $thickness . 'px solid ' . $color . ';font-size:0;line-height:0;">&nbsp;</div>'
			. '</td></tr>';
	}
}
