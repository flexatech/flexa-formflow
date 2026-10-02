<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Header patterns. They also serve the global header editor, so each one is
 * built only from site identity (logo, name, tagline, URL), never a fixed brand.
 */
final class HeaderPatterns {
	private const CONTEXTS = [ 'email', 'global-header' ];

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		$menu = [
			__( 'Home', 'flexa-formflow' )    => '{site_url}',
			__( 'Contact', 'flexa-formflow' ) => 'mailto:{admin_email}',
		];
		// Logo and menu beside each other get the same even padding, so the
		// row's `valign="middle"` centres them on one line.
		$even = [
			'paddingTop'    => 16,
			'paddingBottom' => 16,
		];

		return [
			Registry::define(
				'header-logo',
				'header',
				__( 'Centered logo', 'flexa-formflow' ),
				__( 'Your logo centered at the top, for any email.', 'flexa-formflow' ),
				[ 'logo', 'brand', 'centered', 'simple' ],
				[ B::logo( 'center', 150 ), B::spacer( 8 ) ],
				self::CONTEXTS
			),
			Registry::define(
				'header-logo-rule',
				'header',
				__( 'Logo with divider', 'flexa-formflow' ),
				__( 'A left-aligned logo over a thin rule.', 'flexa-formflow' ),
				[ 'logo', 'divider', 'line', 'left' ],
				[ B::logo( 'left', 130 ), B::divider( B::RULE, 1, 8 ) ],
				self::CONTEXTS
			),
			Registry::define(
				'header-logo-nav',
				'header',
				__( 'Logo and quick links', 'flexa-formflow' ),
				__( 'Logo on the left, a short link row on the right.', 'flexa-formflow' ),
				[ 'navigation', 'menu', 'links', 'split' ],
				[
					B::columns(
						[
							[ B::logo( 'left', 120, $even ) ],
							[ B::nav( $menu, 'right', [ 'paddingY' => 16 ] ) ],
						],
						[ 'valign' => [ 'middle', 'middle' ] ]
					),
					B::divider( B::RULE, 1, 4 ),
				],
				self::CONTEXTS
			),
			Registry::define(
				'header-announcement',
				'header',
				__( 'Announcement and logo', 'flexa-formflow' ),
				__( 'A colored notice strip above a centered logo.', 'flexa-formflow' ),
				[ 'announcement', 'notice', 'bar', 'promo' ],
				[
					B::text(
						__( 'Here’s what’s new at {site_title}', 'flexa-formflow' ),
						'center',
						12,
						[
							'color'      => '#ffffff',
							'background' => '#0076d7',
						]
					),
					B::logo( 'center', 140 ),
				],
				self::CONTEXTS
			),
			Registry::define(
				'header-dark',
				'header',
				__( 'Dark navigation', 'flexa-formflow' ),
				__( 'A dark band with a light wordmark and links.', 'flexa-formflow' ),
				[ 'dark', 'navigation', 'modern', 'band' ],
				B::band(
					B::DARK,
					[
						B::spacer( 6 ),
						B::columns(
							[
								[ B::logo( 'left', 120, $even + [ 'color' => '#ffffff' ] ) ],
								[
									B::nav(
										$menu,
										'right',
										[
											'paddingY' => 16,
											'color'    => '#e4e7ec',
										]
									),
								],
							],
							[ 'valign' => [ 'middle', 'middle' ] ]
						),
						B::spacer( 6 ),
					]
				),
				self::CONTEXTS
			),
			Registry::define(
				'header-logo-social',
				'header',
				__( 'Brand and social links', 'flexa-formflow' ),
				__( 'Logo beside your social profiles.', 'flexa-formflow' ),
				[ 'social', 'instagram', 'facebook', 'brand' ],
				[
					B::columns(
						[
							[ B::logo( 'left', 120, $even ) ],
							[ B::social( 'right' ) ],
						],
						[ 'valign' => [ 'middle', 'middle' ] ]
					),
					B::divider( B::RULE, 1, 4 ),
				],
				self::CONTEXTS
			),
			Registry::define(
				'header-tinted-tagline',
				'header',
				__( 'Logo with tagline', 'flexa-formflow' ),
				__( 'A soft tinted header with your site tagline.', 'flexa-formflow' ),
				[ 'tagline', 'tint', 'soft', 'centered' ],
				B::band(
					B::TINT,
					[
						B::logo( 'center', 140 ),
						B::text( '{site_tagline}', 'center', 13, [ 'color' => B::MUTED ] ),
						B::spacer( 12 ),
					]
				),
				self::CONTEXTS
			),
		];
	}
}
