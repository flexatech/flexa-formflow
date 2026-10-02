<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Creating, editing, finding and deleting the named header/footer sets of the
 * {@see GlobalLayout}; split out of it to keep both files small.
 *
 * @phpstan-import-type Set from GlobalLayout
 */
trait LayoutSetOperations {
	/**
	 * @param list<array<string, mixed>>|null $header
	 * @param list<array<string, mixed>>|null $footer
	 * @return Set The new set.
	 */
	public function add_set( string $name, ?array $header = null, ?array $footer = null ): array {
		$set  = [
			'id'     => 'set_' . substr( md5( uniqid( 'set', true ) ), 0, 10 ),
			'name'   => self::name( $name ),
			'header' => self::clean( $header ?? [] ),
			'footer' => self::clean( $footer ?? [] ),
		];
		$next = $this->get();

		$next['sets'][] = $set;
		$this->persist( $next );

		return $set;
	}

	/**
	 * @param array<string, mixed> $fields `name`, `header` and/or `footer`.
	 * @return Set|null The updated set, or null when it does not exist.
	 */
	public function update_set( string $id, array $fields ): ?array {
		$next    = $this->get();
		$updated = null;

		foreach ( $next['sets'] as $i => $set ) {
			if ( $set['id'] !== $id ) {
				continue;
			}
			if ( isset( $fields['name'] ) && is_string( $fields['name'] ) ) {
				$set['name'] = self::name( $fields['name'] );
			}
			foreach ( [ 'header', 'footer' ] as $part ) {
				if ( isset( $fields[ $part ] ) && is_array( $fields[ $part ] ) ) {
					$set[ $part ] = self::clean( $fields[ $part ] );
				}
			}
			$next['sets'][ $i ] = $set;
			$updated            = $set;
		}

		if ( null !== $updated ) {
			$this->persist( $next );
		}

		return $updated;
	}

	/**
	 * Remove a set. The last one cannot go, and removing the default promotes the
	 * first that remains. Templates that pointed at it fall back to the default.
	 */
	public function delete_set( string $id ): bool {
		$next = $this->get();
		if ( count( $next['sets'] ) < 2 || null === $this->find_set( $id ) ) {
			return false;
		}

		$next['sets'] = array_values( array_filter( $next['sets'], static fn( array $set ): bool => $set['id'] !== $id ) );
		if ( $next['default'] === $id ) {
			$next['default'] = $next['sets'][0]['id'];
		}
		$this->persist( $next );

		return true;
	}

	/**
	 * @return Set|null
	 */
	public function find_set( string $id ): ?array {
		foreach ( $this->get()['sets'] as $set ) {
			if ( $set['id'] === $id ) {
				return $set;
			}
		}

		return null;
	}
}
