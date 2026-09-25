<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Packs;

defined( 'ABSPATH' ) || exit;

/**
 * A pack: versioned metadata plus four groups of installable content. The same
 * shape backs both the catalog listing (counts only) and the pack detail /
 * import review (the named content list), so the store and the importer never
 * disagree about what a pack contains.
 */
final class PackManifest {
	/**
	 * @param list<PackContent> $forms
	 * @param list<PackContent> $emails
	 * @param list<PackContent> $workflows
	 * @param list<PackContent> $patterns
	 */
	public function __construct(
		public readonly string $id,
		public readonly string $name,
		public readonly string $description,
		public readonly string $category,
		public readonly string $price,
		public readonly bool $requires_pro,
		public readonly string $version,
		public readonly string $compatibility,
		public readonly array $forms,
		public readonly array $emails,
		public readonly array $workflows,
		public readonly array $patterns,
	) {}

	/**
	 * @return array{forms: int, emails: int, workflows: int, patterns: int}
	 */
	public function contents_count(): array {
		return [
			'forms'     => count( $this->forms ),
			'emails'    => count( $this->emails ),
			'workflows' => count( $this->workflows ),
			'patterns'  => count( $this->patterns ),
		];
	}

	/**
	 * The flat catalog entry. Ownership/install state are merged in by the
	 * Catalog; this is the pack's own description of itself.
	 *
	 * @return array<string, mixed>
	 */
	public function to_catalog_array(): array {
		return [
			'id'            => $this->id,
			'type'          => 'pack',
			'name'          => $this->name,
			'description'   => $this->description,
			'category'      => $this->category,
			'kind'          => 'form',
			'ownership'     => 'paid',
			'price'         => $this->price,
			'requiresPro'   => $this->requires_pro,
			'version'       => $this->version,
			'compatibility' => $this->compatibility,
			'contents'      => $this->contents_count(),
		];
	}

	/**
	 * The named content list for the pack detail / import review step. Each item
	 * reports whether it needs Pro so the review can flag what will be skipped.
	 *
	 * @return array<string, mixed>
	 */
	public function to_detail_array(): array {
		return array_merge(
			$this->to_catalog_array(),
			[
				'items' => [
					'forms'     => array_map( [ self::class, 'item_array' ], $this->forms ),
					'emails'    => array_map( [ self::class, 'item_array' ], $this->emails ),
					'workflows' => array_map( [ self::class, 'item_array' ], $this->workflows ),
					'patterns'  => array_map( [ self::class, 'item_array' ], $this->patterns ),
				],
			]
		);
	}

	/**
	 * @return array{ref: string, name: string, requiresPro: bool}
	 */
	private static function item_array( PackContent $content ): array {
		return [
			'ref'         => $content->ref,
			'name'        => $content->name,
			'requiresPro' => $content->requires_pro,
		];
	}
}
