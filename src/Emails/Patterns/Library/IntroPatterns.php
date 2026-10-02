<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Opening sections: the first thing a reader sees under the header.
 */
final class IntroPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		$kicker = static fn( string $label ): string => '<strong style="letter-spacing:1px;color:#0076d7;">' . $label . '</strong>';

		return [
			Registry::define(
				'intro-greeting',
				'intro',
				__( 'Friendly greeting', 'flexa-formflow' ),
				__( 'A warm hello and one line of context.', 'flexa-formflow' ),
				[ 'hello', 'welcome', 'greeting', 'thanks' ],
				[
					B::heading( __( 'Hello there,', 'flexa-formflow' ), 24 ),
					B::text( __( 'Thanks for getting in touch with {site_title}. Everything you need is right below.', 'flexa-formflow' ) ),
				]
			),
			Registry::define(
				'intro-story',
				'intro',
				__( 'Story introduction', 'flexa-formflow' ),
				__( 'A small label, a headline and a short story.', 'flexa-formflow' ),
				[ 'story', 'newsletter', 'editorial', 'kicker' ],
				[
					B::text( $kicker( __( 'WHAT’S NEW', 'flexa-formflow' ) ), 'left', 12 ),
					B::heading( __( 'Made with care, shared with you', 'flexa-formflow' ), 26 ),
					B::text( __( 'Here is a quick look at what we have been working on and why we think you will like it.', 'flexa-formflow' ) ),
				]
			),
			Registry::define(
				'intro-centered',
				'intro',
				__( 'Centered announcement', 'flexa-formflow' ),
				__( 'A centered headline and summary for status emails.', 'flexa-formflow' ),
				[ 'status', 'confirmation', 'centered', 'received' ],
				[
					B::spacer( 8 ),
					B::heading( __( 'We’ve received your request', 'flexa-formflow' ), 26, 'center' ),
					B::text( __( 'We will review it and get back to you shortly. No need to reply to this email.', 'flexa-formflow' ), 'center' ),
				]
			),
			Registry::define(
				'intro-split-steps',
				'intro',
				__( 'Split welcome', 'flexa-formflow' ),
				__( 'Welcome copy beside a highlighted number.', 'flexa-formflow' ),
				[ 'onboarding', 'steps', 'welcome', 'split' ],
				[
					B::columns(
						[
							[
								B::heading( __( 'Welcome aboard', 'flexa-formflow' ), 22 ),
								B::text( __( 'Getting started takes a few minutes. Here is what happens next.', 'flexa-formflow' ) ),
							],
							B::band(
								B::TINT,
								[
									B::heading( '3', 36, 'center', [ 'color' => '#0076d7' ] ),
									B::text( __( 'simple steps to get started', 'flexa-formflow' ), 'center', 13 ),
								]
							),
						],
						[ 'valign' => [ 'middle', 'middle' ] ]
					),
				]
			),
			Registry::define(
				'intro-note-card',
				'intro',
				__( 'Personal note', 'flexa-formflow' ),
				__( 'A tinted card with a signed message from your team.', 'flexa-formflow' ),
				[ 'note', 'personal', 'card', 'signature' ],
				B::band(
					B::TINT,
					[
						B::spacer( 8 ),
						B::text( $kicker( __( 'A PERSONAL NOTE', 'flexa-formflow' ) ), 'left', 12 ),
						B::text( __( 'Thank you for choosing us. If anything is unclear, just reply and a real person will answer.', 'flexa-formflow' ) ),
						B::text( __( '<strong>The {site_title} team</strong>', 'flexa-formflow' ), 'left', 14 ),
						B::spacer( 8 ),
					]
				)
			),
			Registry::define(
				'intro-submission',
				'intro',
				__( 'Submission received', 'flexa-formflow' ),
				__( 'Confirms a form submission and lists the answers.', 'flexa-formflow' ),
				[ 'form', 'submission', 'entry', 'answers', 'fields' ],
				[
					B::heading( __( 'Thanks, we got your message', 'flexa-formflow' ), 24 ),
					B::text( __( 'Your “{form_title}” submission arrived on {entry_date}. Here is a copy of what you sent.', 'flexa-formflow' ) ),
					B::block( 'fields_table', [ 'title' => __( 'Your answers', 'flexa-formflow' ) ] ),
				]
			),
		];
	}
}
