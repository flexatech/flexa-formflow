<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Which of a template's own blocks the applied global layout replaces.
 */
final class LayoutShadow {
	/**
	 * Ids of the template's own top-level blocks the applied layout replaces: its
	 * logo when the header has one, and its footer text (with the divider right
	 * above it) when the footer has one. Nothing is deleted from the template, so
	 * turning the layout off brings them back.
	 *
	 * @param array<int, mixed> $elements
	 * @param array{header: list<array<string, mixed>>, footer: list<array<string, mixed>>} $parts
	 * @return list<string>
	 */
	public static function ids( array $elements, array $parts ): array {
		$drop_logo   = GlobalLayout::has_type( $parts['header'], 'logo' );
		$drop_footer = GlobalLayout::has_type( $parts['footer'], 'footer_text' );
		$ids         = [];
		$nodes       = array_values( array_filter( $elements, 'is_array' ) );

		foreach ( $nodes as $i => $node ) {
			$type = $node['type'] ?? '';
			$id   = isset( $node['id'] ) && is_string( $node['id'] ) ? $node['id'] : '';
			if ( '' === $id ) {
				continue;
			}
			if ( $drop_logo && 'logo' === $type ) {
				$ids[] = $id;
			}
			if ( $drop_footer && 'footer_text' === $type ) {
				$ids[] = $id;
				$prev  = $nodes[ $i - 1 ] ?? null;
				if ( is_array( $prev ) && 'divider' === ( $prev['type'] ?? '' ) && isset( $prev['id'] ) && is_string( $prev['id'] ) ) {
					$ids[] = $prev['id'];
				}
			}
		}

		return $ids;
	}
}
