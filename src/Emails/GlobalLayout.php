<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\WooCommerce\Catalog;

defined( 'ABSPATH' ) || exit;

/**
 * The global email header and footer: one block list each, stored once and
 * wrapped around every email the renderer produces, so a brand banner or
 * legal footer is edited in a single place instead of copied into each template.
 *
 * It is opt-in and applies to either every email FormFlow renders or only the
 * WooCommerce ones (`scope`). A single template can opt out of either part with
 * `hideGlobalHeader` / `hideGlobalFooter` in its design settings. Stored as one
 * option, like the other small site-wide records, so it never appears in the
 * template list.
 */
final class GlobalLayout {
	use HasInstance;

	public const OPTION_KEY = 'flexa_formflow_email_layout';

	/** Which emails the layout wraps. */
	public const SCOPES = [ 'all', 'woocommerce' ];

	/** @var array{enabled: bool, scope: string, header: list<array<string, mixed>>, footer: list<array<string, mixed>>}|null */
	private ?array $cache = null;

	/**
	 * @return array{enabled: bool, scope: string, header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
	 */
	public function get(): array {
		if ( null !== $this->cache ) {
			return $this->cache;
		}

		$stored  = get_option( self::OPTION_KEY, [] );
		$stored  = is_array( $stored ) ? $stored : [];
		$starter = $this->starter();
		$scope   = $stored['scope'] ?? '';

		$this->cache = [
			'enabled' => ! empty( $stored['enabled'] ),
			'scope'   => in_array( $scope, self::SCOPES, true ) ? (string) $scope : 'all',
			'header'  => isset( $stored['header'] ) && is_array( $stored['header'] ) ? self::nodes( $stored['header'] ) : $starter['header'],
			'footer'  => isset( $stored['footer'] ) && is_array( $stored['footer'] ) ? self::nodes( $stored['footer'] ) : $starter['footer'],
		];

		return $this->cache;
	}

	/**
	 * Partial update: only the passed keys change. Block lists are sanitized the
	 * same way as a template's tree.
	 *
	 * @param array<string, mixed> $fields
	 * @return array{enabled: bool, scope: string, header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
	 */
	public function save( array $fields ): array {
		$next = $this->get();

		if ( array_key_exists( 'enabled', $fields ) ) {
			$next['enabled'] = (bool) $fields['enabled'];
		}
		if ( isset( $fields['scope'] ) && in_array( $fields['scope'], self::SCOPES, true ) ) {
			$next['scope'] = (string) $fields['scope'];
		}
		foreach ( [ 'header', 'footer' ] as $part ) {
			if ( isset( $fields[ $part ] ) && is_array( $fields[ $part ] ) ) {
				$next[ $part ] = TreeSanitizer::sanitize( [ 'elements' => $fields[ $part ] ] )['elements'];
			}
		}

		update_option( self::OPTION_KEY, $next );
		$this->cache = $next;

		return $next;
	}

	public function is_enabled(): bool {
		return $this->get()['enabled'];
	}

	/**
	 * Whether the layout wraps this email. WooCommerce emails are recognised by
	 * their context (an order, the live WC_Email, or a known Woo email id); every
	 * other render is a form email.
	 */
	public function applies_to( RenderContext $ctx ): bool {
		$is_woo = null !== $ctx->order || null !== $ctx->email || Catalog::exists( $ctx->type );

		return $this->applies_to_kind( $is_woo ? 'woo' : 'form' );
	}

	/**
	 * @param 'woo'|'form' $kind
	 */
	public function applies_to_kind( string $kind ): bool {
		$layout = $this->get();

		return $layout['enabled'] && ( 'all' === $layout['scope'] || 'woo' === $kind );
	}

	/**
	 * The header and footer blocks to wrap this email in: empty when the layout
	 * is off, out of scope, or the template hides that part.
	 *
	 * @param array<string, mixed> $tree
	 * @return array{header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
	 */
	public function parts_for( array $tree, RenderContext $ctx ): array {
		if ( ! $this->applies_to( $ctx ) ) {
			return [
				'header' => [],
				'footer' => [],
			];
		}

		$layout   = $this->get();
		$settings = isset( $tree['settings'] ) && is_array( $tree['settings'] ) ? $tree['settings'] : [];

		return [
			'header' => empty( $settings['hideGlobalHeader'] ) ? $layout['header'] : [],
			'footer' => empty( $settings['hideGlobalFooter'] ) ? $layout['footer'] : [],
		];
	}

	/**
	 * Whether the layout already supplies a block type in one part, so a starter
	 * template can leave its own copy out instead of doubling it (two logos, two
	 * footers).
	 *
	 * @param 'header'|'footer' $part
	 * @param 'woo'|'form'      $kind
	 */
	public function owns( string $part, string $block_type, string $kind ): bool {
		if ( ! $this->applies_to_kind( $kind ) ) {
			return false;
		}

		return self::has_type( $this->get()[ $part ], $block_type );
	}

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
	public static function shadowed( array $elements, array $parts ): array {
		$drop_logo   = self::has_type( $parts['header'], 'logo' );
		$drop_footer = self::has_type( $parts['footer'], 'footer_text' );
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

	/**
	 * @param list<array<string, mixed>> $nodes
	 */
	public static function has_type( array $nodes, string $type ): bool {
		foreach ( $nodes as $node ) {
			if ( ( $node['type'] ?? '' ) === $type ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * What a fresh layout starts with: the brand logo on top, a divider and the
	 * site-wide footer text below.
	 *
	 * @return array{header: list<array<string, mixed>>, footer: list<array<string, mixed>>}
	 */
	private function starter(): array {
		return [
			'header' => [ self::node( 'logo' ) ],
			'footer' => [ self::node( 'divider' ), self::node( 'footer_text' ) ],
		];
	}

	/**
	 * @param array<int|string, mixed> $raw
	 * @return list<array<string, mixed>>
	 */
	private static function nodes( array $raw ): array {
		return array_values( array_filter( $raw, 'is_array' ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function node( string $type ): array {
		return [
			'id'    => 'el_' . substr( md5( uniqid( $type, true ) ), 0, 10 ),
			'type'  => $type,
			'props' => [],
		];
	}
}
