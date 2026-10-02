<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Offers and rewards. Codes are plain placeholder text the user replaces; no
 * pattern invents a token that does not exist.
 */
final class OfferPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return [
			Registry::define(
				'offer-coupon',
				'offer',
				__( 'Coupon code', 'flexa-formflow' ),
				__( 'A large code on a tinted card.', 'flexa-formflow' ),
				[ 'coupon', 'code', 'discount', 'voucher' ],
				B::band(
					B::TINT,
					[
						B::spacer( 12 ),
						B::text( '<strong style="letter-spacing:1px;">' . __( 'YOUR CODE', 'flexa-formflow' ) . '</strong>', 'center', 12, [ 'color' => '#0076d7' ] ),
						B::heading( '<span style="letter-spacing:3px;">' . __( 'WELCOME10', 'flexa-formflow' ) . '</span>', 32, 'center' ),
						B::text( __( 'Enter it at checkout on your next visit.', 'flexa-formflow' ), 'center', 14 ),
						B::spacer( 12 ),
					]
				)
			),
			Registry::define(
				'offer-cta',
				'offer',
				__( 'Offer with button', 'flexa-formflow' ),
				__( 'A thank-you offer and a button.', 'flexa-formflow' ),
				[ 'offer', 'button', 'next time', 'thanks' ],
				[
					B::heading( __( 'A little something for next time', 'flexa-formflow' ), 20, 'center' ),
					B::text( __( 'Use this code at checkout on your next visit.', 'flexa-formflow' ), 'center' ),
					B::button( __( 'Visit us', 'flexa-formflow' ) ),
				]
			),
			Registry::define(
				'offer-free-shipping',
				'offer',
				__( 'Free delivery strip', 'flexa-formflow' ),
				__( 'A one-line perk on your accent color.', 'flexa-formflow' ),
				[ 'free shipping', 'delivery', 'strip', 'perk' ],
				[
					B::text(
						__( '<strong>Free delivery</strong> on your next order', 'flexa-formflow' ),
						'center',
						15,
						[
							'color'      => '#ffffff',
							'background' => '#0076d7',
						]
					),
				]
			),
			Registry::define(
				'offer-bundle',
				'offer',
				__( 'Bundle and save', 'flexa-formflow' ),
				__( 'A picture beside a short bundle pitch.', 'flexa-formflow' ),
				[ 'bundle', 'save', 'set', 'image' ],
				[
					B::columns(
						[
							[ B::image( __( 'Bundle picture', 'flexa-formflow' ) ) ],
							[
								B::heading( __( 'Better together', 'flexa-formflow' ), 20 ),
								B::text( __( 'Pick any two and save on the set.', 'flexa-formflow' ), 'left', 14 ),
								B::button( __( 'See the bundle', 'flexa-formflow' ), '{site_url}', 'left' ),
							],
						],
						[ 'valign' => [ 'middle', 'middle' ] ]
					),
				]
			),
			Registry::define(
				'offer-reward',
				'offer',
				__( 'Member reward', 'flexa-formflow' ),
				__( 'A thank-you reward on a dark band.', 'flexa-formflow' ),
				[ 'reward', 'loyalty', 'vip', 'dark' ],
				B::band(
					B::DARK,
					[
						B::spacer( 16 ),
						B::heading( __( 'A thank-you, just for you', 'flexa-formflow' ), 24, 'center', [ 'color' => '#ffffff' ] ),
						B::text( __( 'You have been with us for a while, so here is a small reward.', 'flexa-formflow' ), 'center', 15, [ 'color' => '#d0d5dd' ] ),
						B::button(
							__( 'Claim reward', 'flexa-formflow' ),
							'{site_url}',
							'center',
							[
								'bgColor'   => '#ffffff',
								'textColor' => B::DARK,
							]
						),
						B::spacer( 16 ),
					]
				)
			),
			Registry::define(
				'offer-ends-soon',
				'offer',
				__( 'Ends soon', 'flexa-formflow' ),
				__( 'A time-limited reminder with a button.', 'flexa-formflow' ),
				[ 'flash sale', 'deadline', 'reminder', 'limited' ],
				[
					B::text( '<strong style="color:#b42318;letter-spacing:1px;">' . __( 'ENDS SOON', 'flexa-formflow' ) . '</strong>', 'center', 12 ),
					B::heading( __( 'Last chance for this offer', 'flexa-formflow' ), 24, 'center' ),
					B::text( __( 'The offer closes at the end of the week.', 'flexa-formflow' ), 'center' ),
					B::button( __( 'Don’t miss it', 'flexa-formflow' ) ),
				]
			),
		];
	}
}
