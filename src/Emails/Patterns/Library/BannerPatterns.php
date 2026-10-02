<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Hero sections. Image slots start empty and show a placeholder until a
 * picture is chosen; a real send leaves an empty slot out.
 */
final class BannerPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return [
			Registry::define(
				'banner-image',
				'banner',
				__( 'Image hero', 'flexa-formflow' ),
				__( 'A full-width picture with a headline and a button.', 'flexa-formflow' ),
				[ 'hero', 'image', 'photo', 'feature' ],
				[
					B::image( __( 'Banner image', 'flexa-formflow' ) ),
					B::heading( __( 'Something new is here', 'flexa-formflow' ), 26, 'center' ),
					B::text( __( 'A short line that tells readers why it matters to them.', 'flexa-formflow' ), 'center' ),
					B::button( __( 'Take a look', 'flexa-formflow' ) ),
				]
			),
			Registry::define(
				'banner-dark',
				'banner',
				__( 'Dark spotlight', 'flexa-formflow' ),
				__( 'Light text on a dark band for launches and big news.', 'flexa-formflow' ),
				[ 'dark', 'launch', 'spotlight', 'promotion' ],
				B::band(
					B::DARK,
					[
						B::spacer( 20 ),
						B::text( '<strong style="letter-spacing:1px;">' . __( 'JUST LAUNCHED', 'flexa-formflow' ) . '</strong>', 'center', 12, [ 'color' => '#8ecaff' ] ),
						B::heading( __( 'Early access is open', 'flexa-formflow' ), 30, 'center', [ 'color' => '#ffffff' ] ),
						B::text( __( 'Be among the first to try it, before everyone else.', 'flexa-formflow' ), 'center', 15, [ 'color' => '#d0d5dd' ] ),
						B::button(
							__( 'Get early access', 'flexa-formflow' ),
							'{site_url}',
							'center',
							[
								'bgColor'   => '#ffffff',
								'textColor' => B::DARK,
							]
						),
						B::spacer( 20 ),
					]
				)
			),
			Registry::define(
				'banner-editorial',
				'banner',
				__( 'Editorial banner', 'flexa-formflow' ),
				__( 'A left-aligned headline on a soft tint.', 'flexa-formflow' ),
				[ 'editorial', 'magazine', 'tint', 'left' ],
				B::band(
					B::TINT,
					[
						B::spacer( 16 ),
						B::heading( __( 'Small details, big difference', 'flexa-formflow' ), 28 ),
						B::text( __( 'A closer look at the ideas behind our latest update.', 'flexa-formflow' ) ),
						B::button( __( 'Read more', 'flexa-formflow' ), '{site_url}', 'left' ),
						B::spacer( 16 ),
					]
				)
			),
			Registry::define(
				'banner-split',
				'banner',
				__( 'Split hero', 'flexa-formflow' ),
				__( 'Picture on one side, headline and button on the other.', 'flexa-formflow' ),
				[ 'split', 'two column', 'image', 'feature' ],
				[
					B::columns(
						[
							[ B::image( __( 'Feature image', 'flexa-formflow' ) ) ],
							[
								B::heading( __( 'Built for every day', 'flexa-formflow' ), 22 ),
								B::text( __( 'Simple, reliable and ready when you are.', 'flexa-formflow' ), 'left', 14 ),
								B::button( __( 'Learn more', 'flexa-formflow' ), '{site_url}', 'left' ),
							],
						],
						[ 'valign' => [ 'middle', 'middle' ] ]
					),
				]
			),
			Registry::define(
				'banner-minimal',
				'banner',
				__( 'Minimal headline', 'flexa-formflow' ),
				__( 'Just a large centered headline and a text link.', 'flexa-formflow' ),
				[ 'minimal', 'typography', 'clean', 'centered' ],
				[
					B::spacer( 20 ),
					B::heading( __( 'Less noise. Better basics.', 'flexa-formflow' ), 32, 'center' ),
					B::text( '<a href="{site_url}">' . __( 'Explore what’s new →', 'flexa-formflow' ) . '</a>', 'center' ),
					B::spacer( 12 ),
				]
			),
			Registry::define(
				'banner-brand',
				'banner',
				__( 'Brand color band', 'flexa-formflow' ),
				__( 'A bold band in your accent color.', 'flexa-formflow' ),
				[ 'brand', 'color', 'bold', 'band' ],
				B::band(
					'#0076d7',
					[
						B::spacer( 18 ),
						B::heading( __( 'You’re invited', 'flexa-formflow' ), 28, 'center', [ 'color' => '#ffffff' ] ),
						B::text( __( 'Join us for a short live walkthrough and bring your questions.', 'flexa-formflow' ), 'center', 15, [ 'color' => '#eff7ff' ] ),
						B::spacer( 18 ),
					]
				)
			),
		];
	}
}
