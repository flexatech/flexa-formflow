<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Lists the templates whose own top-level logo or footer text the global layout
 * replaces while it is on (see {@see GlobalLayout::shadowed()}). Purely
 * informational: nothing in those templates is changed or removed.
 */
final class LayoutOverlap {
	/**
	 * @return list<array{id: int, title: string, header: bool, footer: bool}>
	 */
	public static function find(): array {
		$layout = GlobalLayout::instance()->get();
		if ( ! $layout['enabled'] ) {
			return [];
		}

		$header_logo   = GlobalLayout::has_type( $layout['header'], 'logo' );
		$footer_footer = GlobalLayout::has_type( $layout['footer'], 'footer_text' );
		$found         = [];

		foreach ( EmailTemplateRepository::instance()->all() as $template ) {
			$elements = isset( $template->tree['elements'] ) && is_array( $template->tree['elements'] ) ? $template->tree['elements'] : [];
			$settings = isset( $template->tree['settings'] ) && is_array( $template->tree['settings'] ) ? $template->tree['settings'] : [];
			$nodes    = array_values( array_filter( $elements, 'is_array' ) );

			$header = $header_logo && GlobalLayout::has_type( $nodes, 'logo' ) && empty( $settings['hideGlobalHeader'] );
			$footer = $footer_footer && GlobalLayout::has_type( $nodes, 'footer_text' ) && empty( $settings['hideGlobalFooter'] );
			if ( $header || $footer ) {
				$found[] = [
					'id'     => $template->id,
					'title'  => $template->title,
					'header' => $header,
					'footer' => $footer,
				];
			}
		}

		return $found;
	}
}
