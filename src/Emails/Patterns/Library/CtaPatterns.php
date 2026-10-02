<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Call-to-action sections: one clear next step for the reader.
 */
final class CtaPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return [
			Registry::define(
				'cta-centered',
				'cta',
				__( 'Centered button', 'flexa-formflow' ),
				__( 'A short prompt above one centered button.', 'flexa-formflow' ),
				[ 'button', 'action', 'centered', 'link' ],
				[
					B::heading( __( 'Ready for the next step?', 'flexa-formflow' ), 20, 'center' ),
					B::text( __( 'It only takes a minute.', 'flexa-formflow' ), 'center' ),
					B::button( __( 'Continue', 'flexa-formflow' ) ),
				]
			),
			Registry::define(
				'cta-two-buttons',
				'cta',
				__( 'Two choices', 'flexa-formflow' ),
				__( 'A main button and a quieter second option side by side.', 'flexa-formflow' ),
				[ 'two buttons', 'choice', 'secondary', 'split' ],
				[
					B::text( __( 'How would you like to continue?', 'flexa-formflow' ), 'center' ),
					B::columns(
						[
							[ B::button( __( 'Get started', 'flexa-formflow' ), '{site_url}', 'right' ) ],
							[
								B::button(
									__( 'Contact us', 'flexa-formflow' ),
									'mailto:{admin_email}',
									'left',
									[
										'bgColor'   => B::TINT,
										'textColor' => '#0076d7',
									]
								),
							],
						],
						[ 'gap' => 8 ]
					),
				]
			),
			Registry::define(
				'cta-card',
				'cta',
				__( 'Action card', 'flexa-formflow' ),
				__( 'A grey card with a title, a line of text and a button.', 'flexa-formflow' ),
				[ 'card', 'box', 'panel', 'left' ],
				B::band(
					B::SOFT,
					[
						B::spacer( 12 ),
						B::heading( __( 'Finish setting up', 'flexa-formflow' ), 18 ),
						B::text( __( 'A couple of details are still missing. Add them now so nothing gets delayed.', 'flexa-formflow' ), 'left', 14 ),
						B::button( __( 'Complete now', 'flexa-formflow' ), '{site_url}', 'left' ),
						B::spacer( 12 ),
					]
				)
			),
			Registry::define(
				'cta-contact',
				'cta',
				__( 'Questions? Contact us', 'flexa-formflow' ),
				__( 'Invites a reply and links to your contact address.', 'flexa-formflow' ),
				[ 'support', 'help', 'contact', 'email' ],
				[
					B::divider(),
					B::text( __( 'Questions? Reply to this email or write to <a href="mailto:{admin_email}">{admin_email}</a>.', 'flexa-formflow' ), 'center', 14 ),
				]
			),
			Registry::define(
				'cta-dark-strip',
				'cta',
				__( 'Dark action strip', 'flexa-formflow' ),
				__( 'A one-line pitch with a button on a dark band.', 'flexa-formflow' ),
				[ 'dark', 'strip', 'inline', 'band' ],
				B::band(
					B::DARK,
					[
						B::spacer( 8 ),
						B::columns(
							[
								[ B::text( __( '<strong>Ready when you are.</strong>', 'flexa-formflow' ), 'left', 16, [ 'color' => '#ffffff' ] ) ],
								[
									B::button(
										__( 'Let’s go', 'flexa-formflow' ),
										'{site_url}',
										'right',
										[
											'bgColor'   => '#ffffff',
											'textColor' => B::DARK,
										]
									),
								],
							],
							[ 'valign' => [ 'middle', 'middle' ] ]
						),
						B::spacer( 8 ),
					]
				)
			),
			Registry::define(
				'cta-text-link',
				'cta',
				__( 'Text link', 'flexa-formflow' ),
				__( 'A quiet inline link instead of a button.', 'flexa-formflow' ),
				[ 'link', 'minimal', 'subtle', 'text' ],
				[
					B::text( '<a href="{site_url}">' . __( 'Visit {site_title} →', 'flexa-formflow' ) . '</a>', 'center', 15 ),
				]
			),
		];
	}
}
