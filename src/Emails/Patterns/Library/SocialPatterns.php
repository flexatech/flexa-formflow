<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Social sections. The Social block shows only the profiles that have a URL,
 * so each pattern starts with the website link and the user adds the rest.
 */
final class SocialPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return [
			Registry::define(
				'social-centered',
				'social',
				__( 'Social links', 'flexa-formflow' ),
				__( 'Your profiles in one centered row.', 'flexa-formflow' ),
				[ 'social', 'profiles', 'follow', 'simple' ],
				[ B::social() ]
			),
			Registry::define(
				'social-follow',
				'social',
				__( 'Follow us', 'flexa-formflow' ),
				__( 'A short invitation above the profile links.', 'flexa-formflow' ),
				[ 'follow', 'community', 'invite', 'centered' ],
				[
					B::heading( __( 'Follow along', 'flexa-formflow' ), 20, 'center' ),
					B::text( __( 'News, tips and behind-the-scenes, wherever you like to read.', 'flexa-formflow' ), 'center', 14 ),
					B::social(),
				]
			),
			Registry::define(
				'social-split',
				'social',
				__( 'Stay in touch row', 'flexa-formflow' ),
				__( 'A line of text beside the profile links.', 'flexa-formflow' ),
				[ 'split', 'inline', 'row', 'stay in touch' ],
				[
					B::columns(
						[
							[ B::text( __( '<strong>Stay in touch</strong>', 'flexa-formflow' ), 'left', 15 ) ],
							[ B::social( 'right' ) ],
						],
						[ 'valign' => [ 'middle', 'middle' ] ]
					),
				]
			),
			Registry::define(
				'social-dark',
				'social',
				__( 'Dark social band', 'flexa-formflow' ),
				__( 'Light profile links on a dark band.', 'flexa-formflow' ),
				[ 'dark', 'band', 'follow', 'contrast' ],
				B::band(
					B::DARK,
					[
						B::spacer( 12 ),
						B::text( __( 'Follow {site_title}', 'flexa-formflow' ), 'center', 14, [ 'color' => '#ffffff' ] ),
						B::social( 'center', [ 'color' => '#d0d5dd' ] ),
						B::spacer( 12 ),
					]
				)
			),
			Registry::define(
				'social-card',
				'social',
				__( 'Community card', 'flexa-formflow' ),
				__( 'A tinted card inviting readers to join in.', 'flexa-formflow' ),
				[ 'card', 'community', 'join', 'tint' ],
				B::band(
					B::TINT,
					[
						B::spacer( 8 ),
						B::heading( __( 'Join the conversation', 'flexa-formflow' ), 18 ),
						B::text( __( 'Share your ideas and see what others are building.', 'flexa-formflow' ), 'left', 14 ),
						B::social( 'left' ),
						B::spacer( 8 ),
					]
				)
			),
		];
	}
}
