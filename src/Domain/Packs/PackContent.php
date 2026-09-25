<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Packs;

defined( 'ABSPATH' ) || exit;

/**
 * One installable item inside a pack: a form, an email template, a workflow or a
 * reusable pattern. `ref` is stable within the pack and doubles as the
 * provenance content id, so a re-import (or another pack that ships the same
 * shared pattern) can link rather than duplicate. `requires_pro` marks content
 * that needs the Pro engine; on Free it is skipped with a visible reason.
 */
final class PackContent {
	/**
	 * @param array<string, mixed> $payload
	 */
	public function __construct(
		public readonly string $ref,
		public readonly string $name,
		public readonly string $kind,
		public readonly bool $requires_pro,
		public readonly array $payload,
	) {}

	/**
	 * @param array<string, mixed> $args
	 */
	public static function make( array $args ): self {
		return new self(
			ref: (string) ( $args['ref'] ?? '' ),
			name: (string) ( $args['name'] ?? '' ),
			kind: (string) ( $args['kind'] ?? 'form' ),
			requires_pro: (bool) ( $args['requires_pro'] ?? false ),
			payload: is_array( $args['payload'] ?? null ) ? $args['payload'] : [],
		);
	}
}
