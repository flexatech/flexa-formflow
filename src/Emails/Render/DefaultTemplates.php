<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Emails\GlobalLayout;

defined( 'ABSPATH' ) || exit;

/**
 * The starter element tree used when a notification has no template picked, so
 * every email goes through exactly one render path (the tree). One default for
 * the admin notification, one for the visitor confirmation.
 */
final class DefaultTemplates {
	/**
	 * @param 'admin'|'confirmation' $type
	 * @param string                 $message Optional confirmation body override (the form's inline message).
	 * @return array<string, mixed>
	 */
	public static function tree_for( string $type, string $message = '' ): array {
		// A logo or footer the global layout already supplies is left out, so a
		// starter email does not show it twice.
		$layout      = GlobalLayout::instance();
		$with_logo   = ! $layout->owns( 'header', 'logo', 'form' );
		$with_footer = ! $layout->owns( 'footer', 'footer_text', 'form' );
		$elements    = [];

		if ( $with_logo ) {
			$elements[] = self::el( 'logo' );
		}

		if ( 'confirmation' === $type ) {
			$body = '' !== $message
				? $message
				: __( 'Thanks for reaching out. We received your submission and will get back to you soon.', 'flexa-formflow' );

			$elements[] = self::el( 'heading', [ 'text' => __( 'Thanks, we got your message', 'flexa-formflow' ) ] );
			$elements[] = self::el( 'text', [ 'html' => $body ] );
		} else {
			$elements[] = self::el( 'heading', [ 'text' => __( 'New submission: {form_title}', 'flexa-formflow' ) ] );
			$elements[] = self::el( 'text', [ 'html' => __( 'You received a new submission. The details are below.', 'flexa-formflow' ) ] );
			$elements[] = self::el( 'fields_table', [ 'title' => __( 'Submission', 'flexa-formflow' ) ] );
		}

		if ( $with_footer ) {
			$elements[] = self::el( 'divider' );
			$elements[] = self::el( 'footer_text' );
		}

		$tree = [
			'version'  => 1,
			'settings' => [],
			'elements' => $elements,
		];

		/**
		 * Filter the default tree per notification type.
		 *
		 * @param array<string, mixed> $tree
		 * @param string               $type
		 */
		return apply_filters( 'flexa_formflow.emails.default_tree', $tree, $type );
	}

	/**
	 * @param array<string, mixed> $props
	 * @return array<string, mixed>
	 */
	private static function el( string $type, array $props = [] ): array {
		return [
			'id'    => 'el_' . substr( md5( uniqid( $type, true ) ), 0, 10 ),
			'type'  => $type,
			'props' => $props,
		];
	}
}
