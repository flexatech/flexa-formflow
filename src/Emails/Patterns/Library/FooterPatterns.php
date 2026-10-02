<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Footer patterns, also offered in the global footer editor. Small print left
 * empty inherits the site-wide footer text from Settings.
 */
final class FooterPatterns {
	private const CONTEXTS = [ 'email', 'global-footer' ];

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return [
			Registry::define(
				'footer-social',
				'footer',
				__( 'Social and small print', 'flexa-formflow' ),
				__( 'Social links above the site-wide footer text.', 'flexa-formflow' ),
				[ 'social', 'copyright', 'small print', 'links' ],
				[ B::divider(), B::social(), B::footer() ],
				self::CONTEXTS
			),
			Registry::define(
				'footer-simple',
				'footer',
				__( 'Simple footer', 'flexa-formflow' ),
				__( 'A rule and the site-wide footer text.', 'flexa-formflow' ),
				[ 'simple', 'minimal', 'copyright' ],
				[ B::divider(), B::footer() ],
				self::CONTEXTS
			),
			Registry::define(
				'footer-links',
				'footer',
				__( 'Useful links', 'flexa-formflow' ),
				__( 'A centered link row above the small print.', 'flexa-formflow' ),
				[ 'links', 'navigation', 'menu', 'contact' ],
				[
					B::divider(),
					B::nav(
						[
							__( 'Website', 'flexa-formflow' ) => '{site_url}',
							__( 'Contact', 'flexa-formflow' ) => 'mailto:{admin_email}',
						],
						'center',
						[ 'separator' => 'dot' ]
					),
					B::footer(),
				],
				self::CONTEXTS
			),
			Registry::define(
				'footer-columns',
				'footer',
				__( 'Three-column footer', 'flexa-formflow' ),
				__( 'About, contact and links in three columns.', 'flexa-formflow' ),
				[ 'columns', 'contact', 'about', 'business' ],
				[
					B::divider(),
					B::columns(
						[
							[ B::text( '<strong>{site_title}</strong><br>{site_tagline}', 'left', 13 ) ],
							[ B::text( '<strong>' . __( 'Contact', 'flexa-formflow' ) . '</strong><br><a href="mailto:{admin_email}">{admin_email}</a>', 'left', 13 ) ],
							[ B::text( '<strong>' . __( 'Visit', 'flexa-formflow' ) . '</strong><br><a href="{site_url}">' . __( 'Our website', 'flexa-formflow' ) . '</a>', 'left', 13 ) ],
						],
						[ 'gap' => 12 ]
					),
					B::footer( '', 'left' ),
				],
				self::CONTEXTS
			),
			Registry::define(
				'footer-dark',
				'footer',
				__( 'Dark brand footer', 'flexa-formflow' ),
				__( 'Wordmark, social links and small print on a dark band.', 'flexa-formflow' ),
				[ 'dark', 'brand', 'social', 'band' ],
				B::band(
					B::DARK,
					[
						B::logo( 'center', 120, [ 'color' => '#ffffff' ] ),
						B::social( 'center', [ 'color' => '#d0d5dd' ] ),
						B::footer( '', 'center', [ 'color' => '#98a2b3' ] ),
					]
				),
				self::CONTEXTS
			),
			Registry::define(
				'footer-help-card',
				'footer',
				__( 'Help and small print', 'flexa-formflow' ),
				__( 'A grey help line above the footer text.', 'flexa-formflow' ),
				[ 'help', 'support', 'contact', 'card' ],
				B::band(
					B::SOFT,
					[
						B::spacer( 8 ),
						B::text( __( 'Need help? Reply to this email or write to <a href="mailto:{admin_email}">{admin_email}</a>.', 'flexa-formflow' ), 'center', 13 ),
						B::footer(),
					]
				),
				self::CONTEXTS
			),
			Registry::define(
				'footer-legal',
				'footer',
				__( 'Minimal legal line', 'flexa-formflow' ),
				__( 'One line of small print explaining why the email was sent.', 'flexa-formflow' ),
				[ 'legal', 'minimal', 'why', 'compliance' ],
				[
					B::footer( __( '© {year} {site_title} · You are receiving this email because of your activity on {site_url}.', 'flexa-formflow' ) ),
				],
				self::CONTEXTS
			),
		];
	}
}
