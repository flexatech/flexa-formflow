<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Dividers and spacing between sections.
 */
final class DividerPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return [
			Registry::define(
				'divider-line',
				'divider',
				__( 'Thin line', 'flexa-formflow' ),
				__( 'A light rule between two sections.', 'flexa-formflow' ),
				[ 'line', 'rule', 'separator', 'hr' ],
				[ B::divider() ]
			),
			Registry::define(
				'divider-spaced',
				'divider',
				__( 'Line with breathing room', 'flexa-formflow' ),
				__( 'A rule with generous space above and below.', 'flexa-formflow' ),
				[ 'space', 'rule', 'section break' ],
				[ B::spacer( 24 ), B::divider(), B::spacer( 24 ) ]
			),
			Registry::define(
				'divider-gap',
				'divider',
				__( 'Empty space', 'flexa-formflow' ),
				__( 'Blank space to separate sections without a line.', 'flexa-formflow' ),
				[ 'spacer', 'gap', 'whitespace', 'padding' ],
				[ B::spacer( 32 ) ]
			),
			Registry::define(
				'divider-accent-strip',
				'divider',
				__( 'Accent strip', 'flexa-formflow' ),
				__( 'A thin full-width bar in your accent color.', 'flexa-formflow' ),
				[ 'accent', 'bar', 'color', 'strip' ],
				[ B::spacer( 6, [ 'background' => '#0076d7' ] ) ]
			),
			Registry::define(
				'divider-ornament',
				'divider',
				__( 'Ornament', 'flexa-formflow' ),
				__( 'Three soft dots as a quiet section break.', 'flexa-formflow' ),
				[ 'dots', 'ornament', 'decorative', 'break' ],
				[ B::text( '• • •', 'center', 14, [ 'color' => '#98a2b3' ] ) ]
			),
			Registry::define(
				'divider-tinted',
				'divider',
				__( 'Tinted break', 'flexa-formflow' ),
				__( 'A rule on a soft tinted band.', 'flexa-formflow' ),
				[ 'tint', 'band', 'soft', 'rule' ],
				[ B::divider( '#badeff', 1, 20, [ 'background' => B::TINT ] ) ]
			),
		];
	}
}
