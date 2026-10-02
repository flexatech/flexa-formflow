<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Tokens;

defined( 'ABSPATH' ) || exit;

final class Html extends BaseElement {
	public function type(): string {
		return 'html';
	}

	public function defaults(): array {
		return [
			'code' => '',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		// Side padding: 40px at the top level, none inside Columns (the wrapper has it).
		$px = $this->horizontal_padding( $ctx );

		unset( $design );
		$code = $this->str( $props, 'code' );
		if ( '' === trim( $code ) ) {
			return '';
		}

		// Post-level HTML only: scripts/iframes are stripped, tokens work.
		$code = wp_kses_post( $this->resolve_text( $code, $ctx, Tokens::MODE_HTML ) );

		return '<tr><td style="padding:8px ' . $px . 'px;">' . $code . '</td></tr>';
	}
}
