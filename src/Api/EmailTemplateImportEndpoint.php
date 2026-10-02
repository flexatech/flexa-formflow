<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Emails\GlobalLayout;
use Flexa\FormFlow\Emails\Render\ElementRegistry;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Import email templates from a JSON file exported by another site (the
 * admin app builds the export itself; every template's tree is already in the
 * list response). Each tree goes through the same repository path as a save,
 * so TreeSanitizer cleans it exactly as it would an edit.
 *
 * `dry_run` checks the file and reports what would be created and what may
 * not carry over (blocks this site lacks, images hosted elsewhere, a header &
 * footer set that does not exist here) without writing anything.
 */
final class EmailTemplateImportEndpoint extends Endpoint {
	public const FORMAT = 'flexa-formflow/email-templates';

	private const MAX_TEMPLATES = 50;

	private const MAX_BLOCKS = 500;

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/email-templates/import',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'import' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = (array) $request->get_json_params();
		$file   = is_array( $params['file'] ?? null ) ? $params['file'] : [];
		$items  = $this->validate( $file );
		if ( $items instanceof WP_Error ) {
			return $items;
		}

		$warnings = $this->warnings( $items );
		if ( ! empty( $params['dry_run'] ) ) {
			return new WP_REST_Response(
				[
					'items'    => array_map(
						fn( array $item ): array => [
							'title'  => $item['title'],
							'blocks' => $this->count_blocks( $item['tree']['elements'] ?? [] ),
						],
						$items
					),
					'warnings' => $warnings,
				],
				200
			);
		}

		$repo    = EmailTemplateRepository::instance();
		$taken   = array_map( static fn( $template ): string => $template->title, $repo->all() );
		$created = [];
		foreach ( $items as $item ) {
			$title = $item['title'];
			if ( in_array( $title, $taken, true ) ) {
				/* translators: %s: template title. */
				$title = sprintf( __( '%s (imported)', 'flexa-formflow' ), $title );
			}
			$id = $repo->create( $title, $item['tree'] );
			if ( $id > 0 ) {
				$taken[]   = $title;
				$created[] = [
					'id'    => $id,
					'title' => $title,
				];
			}
		}

		return new WP_REST_Response(
			[
				'created'  => $created,
				'warnings' => $warnings,
			],
			201
		);
	}

	/**
	 * The file's templates, or why it cannot be imported.
	 *
	 * @param array<mixed> $file
	 * @return list<array{title: string, tree: array<string, mixed>}>|WP_Error
	 */
	private function validate( array $file ): array|WP_Error {
		if ( self::FORMAT !== ( $file['format'] ?? '' ) ) {
			return $this->invalid( __( 'This is not a Flexa FormFlow email template file.', 'flexa-formflow' ) );
		}
		if ( 1 !== (int) ( $file['schema'] ?? 0 ) ) {
			return $this->invalid( __( 'This file was made by a newer version of Flexa FormFlow. Update the plugin, then try again.', 'flexa-formflow' ) );
		}

		$raw = is_array( $file['items'] ?? null ) ? array_values( $file['items'] ) : [];
		if ( [] === $raw ) {
			return $this->invalid( __( 'The file has no templates in it.', 'flexa-formflow' ) );
		}
		if ( count( $raw ) > self::MAX_TEMPLATES ) {
			/* translators: %d: maximum number of templates. */
			return $this->invalid( sprintf( __( 'A file can hold at most %d templates.', 'flexa-formflow' ), self::MAX_TEMPLATES ) );
		}

		$items = [];
		foreach ( $raw as $item ) {
			$tree = is_array( $item ) && is_array( $item['tree'] ?? null ) ? $item['tree'] : null;
			if ( null === $tree || ! is_array( $tree['elements'] ?? null ) ) {
				return $this->invalid( __( 'A template in the file is damaged.', 'flexa-formflow' ) );
			}
			if ( $this->count_blocks( $tree['elements'] ) > self::MAX_BLOCKS ) {
				/* translators: %d: maximum number of blocks. */
				return $this->invalid( sprintf( __( 'A template in the file has more than %d blocks.', 'flexa-formflow' ), self::MAX_BLOCKS ) );
			}
			$title   = sanitize_text_field( (string) ( $item['title'] ?? '' ) );
			$items[] = [
				'title' => '' !== $title ? $title : __( 'Imported template', 'flexa-formflow' ),
				'tree'  => $tree,
			];
		}

		return $items;
	}

	/**
	 * What may not carry over to this site, one readable line each.
	 *
	 * @param list<array{title: string, tree: array<string, mixed>}> $items
	 * @return list<string>
	 */
	private function warnings( array $items ): array {
		$known   = array_keys( ElementRegistry::instance()->all() );
		$known[] = 'columns';
		$host    = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		$layout  = GlobalLayout::instance();

		$missing = [];
		$images  = 0;
		$sets    = [];
		foreach ( $items as $item ) {
			foreach ( $this->flatten( is_array( $item['tree']['elements'] ?? null ) ? $item['tree']['elements'] : [] ) as $node ) {
				$type = is_string( $node['type'] ?? null ) ? sanitize_key( $node['type'] ) : '';
				if ( '' !== $type && ! in_array( $type, $known, true ) ) {
					$missing[ $type ] = true;
				}
				$props = is_array( $node['props'] ?? null ) ? $node['props'] : [];
				$src   = (string) ( 'logo' === $type ? ( $props['image'] ?? '' ) : ( 'image' === $type ? ( $props['url'] ?? '' ) : '' ) );
				$from  = '' !== $src ? (string) wp_parse_url( $src, PHP_URL_HOST ) : '';
				if ( '' !== $from && $from !== $host ) {
					++$images;
				}
			}
			$set = $item['tree']['settings']['layoutSet'] ?? '';
			if ( is_string( $set ) && '' !== $set && 'none' !== $set && null === $layout->find_set( $set ) ) {
				$sets[ $set ] = true;
			}
		}

		$warnings = [];
		if ( [] !== $missing ) {
			/* translators: %s: comma-separated block types, e.g. "order_details". */
			$warnings[] = sprintf( __( 'Some blocks are not available on this site and will not show in emails: %s. They usually need WooCommerce or an add-on.', 'flexa-formflow' ), implode( ', ', array_keys( $missing ) ) );
		}
		if ( $images > 0 ) {
			$warnings[] = sprintf(
				/* translators: %d: number of images. */
				_n( '%d image is still loaded from another website. Replace it with one from your Media Library if that site may go away.', '%d images are still loaded from another website. Replace them with ones from your Media Library if that site may go away.', $images, 'flexa-formflow' ),
				$images
			);
		}
		if ( [] !== $sets ) {
			$warnings[] = __( 'A template uses a header & footer set that does not exist on this site, so it will use your default set.', 'flexa-formflow' );
		}

		return $warnings;
	}

	/**
	 * Every block node, top level and inside columns.
	 *
	 * @param array<mixed> $nodes
	 * @return list<array<string, mixed>>
	 */
	private function flatten( array $nodes ): array {
		$out = [];
		foreach ( $nodes as $node ) {
			if ( ! is_array( $node ) ) {
				continue;
			}
			$out[] = $node;
			foreach ( is_array( $node['columns'] ?? null ) ? $node['columns'] : [] as $column ) {
				if ( is_array( $column ) ) {
					foreach ( $column as $child ) {
						if ( is_array( $child ) ) {
							$out[] = $child;
						}
					}
				}
			}
		}

		return $out;
	}

	/**
	 * @param array<mixed> $nodes
	 */
	private function count_blocks( array $nodes ): int {
		return count( $this->flatten( $nodes ) );
	}

	private function invalid( string $message ): WP_Error {
		return new WP_Error( 'flexa_formflow_invalid_import', $message, [ 'status' => 400 ] );
	}
}
