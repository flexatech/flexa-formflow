<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Bulk change of which global header/footer set templates use, and whether they
 * hide either part. Only those design settings change; no block is touched. It
 * reports what each template had before, so the caller can put it back.
 */
final class LayoutAssign {
	/** The per-template settings this class owns. */
	private const KEYS = [ 'layoutSet', 'hideGlobalHeader', 'hideGlobalFooter' ];

	/**
	 * @param list<int>   $ids        Templates to change.
	 * @param string|null $set        '' = the default set, 'none', or a set id; null leaves the choice alone.
	 * @param bool        $show_parts Clear "hide header" / "hide footer" on each template.
	 * @return array{changed: int, previous: list<array<string, mixed>>}|null Null when `$set` names no set.
	 */
	public static function apply( array $ids, ?string $set, bool $show_parts ): ?array {
		if ( null !== $set && '' !== $set && 'none' !== $set && null === GlobalLayout::instance()->find_set( $set ) ) {
			return null;
		}

		$repo     = EmailTemplateRepository::instance();
		$previous = [];
		$changed  = 0;

		foreach ( array_unique( array_map( 'intval', $ids ) ) as $id ) {
			$template = $repo->find( $id );
			if ( null === $template ) {
				continue;
			}

			$tree     = $template->tree;
			$settings = isset( $tree['settings'] ) && is_array( $tree['settings'] ) ? $tree['settings'] : [];
			$before   = self::owned( $settings );

			if ( null !== $set ) {
				unset( $settings['layoutSet'] );
				if ( '' !== $set ) {
					$settings['layoutSet'] = $set;
				}
			}
			if ( $show_parts ) {
				unset( $settings['hideGlobalHeader'], $settings['hideGlobalFooter'] );
			}
			if ( self::owned( $settings ) === $before ) {
				continue;
			}

			$tree['settings'] = $settings;
			if ( $repo->update( $id, [ 'tree' => $tree ] ) ) {
				$previous[] = array_merge( [ 'id' => $id ], $before );
				++$changed;
			}
		}

		return [
			'changed'  => $changed,
			'previous' => $previous,
		];
	}

	/**
	 * Put templates back as `apply()` reported them.
	 *
	 * @param array<int, mixed> $rows `previous` entries: an id plus the three settings as they were.
	 * @return int Templates restored.
	 */
	public static function restore( array $rows ): int {
		$repo     = EmailTemplateRepository::instance();
		$restored = 0;

		foreach ( $rows as $row ) {
			$template = is_array( $row ) && isset( $row['id'] ) ? $repo->find( (int) $row['id'] ) : null;
			if ( null === $template ) {
				continue;
			}

			$tree     = $template->tree;
			$settings = isset( $tree['settings'] ) && is_array( $tree['settings'] ) ? $tree['settings'] : [];
			foreach ( self::KEYS as $key ) {
				unset( $settings[ $key ] );
				if ( ! empty( $row[ $key ] ) ) {
					$settings[ $key ] = 'layoutSet' === $key ? (string) $row[ $key ] : true;
				}
			}

			$tree['settings'] = $settings;
			if ( $repo->update( $template->id, [ 'tree' => $tree ] ) ) {
				++$restored;
			}
		}

		return $restored;
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	private static function owned( array $settings ): array {
		return array_intersect_key( $settings, array_flip( self::KEYS ) );
	}
}
